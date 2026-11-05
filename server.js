require('dotenv').config();
const express = require('express'), mongoose = require('mongoose'), bcrypt = require('bcryptjs'),
  jwt = require('jsonwebtoken'), helmet = require('helmet'), rateLimit = require('express-rate-limit'), path = require('path');
const { MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, PORT = 3000 } = process.env;
if (!MONGODB_URI || !JWT_SECRET) { console.error('Set MONGODB_URI and JWT_SECRET'); process.exit(1); }

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' }));

const S = o => new mongoose.Schema(o, { timestamps: true });
const User = mongoose.model('User', S({ name: String, email: { type: String, unique: true, lowercase: true }, phone: String, subject: String, password: String, role: { type: String, default: 'teacher' }, approved: { type: Boolean, default: false } }));
const Homework = mongoose.model('Homework', S({ classNo: Number, subject: String, title: String, details: String, dueDate: String, teacherId: mongoose.Schema.Types.ObjectId, teacherName: String }));
const Notice = mongoose.model('Notice', S({ title: String, body: String, type: String }));
const Photo = mongoose.model('Photo', S({ url: String, caption: String, category: String }));
const Enquiry = mongoose.model('Enquiry', S({ studentName: String, classApplying: String, email: String, phone: String }));

const t = v => (typeof v === 'string' ? v.trim() : '');
const wrap = fn => (req, res) => Promise.resolve(fn(req, res)).catch(e => { console.error(e); res.status(500).json({ error: 'Server error' }); });
const bad = (res, m, c = 400) => res.status(c).json({ error: m });
const sign = u => jwt.sign({ id: u._id, role: u.role }, JWT_SECRET, { expiresIn: '7d' });
const pub = u => ({ name: u.name, role: u.role, approved: u.approved });

const auth = (...roles) => wrap(async (req, res, next) => {
  try {
    const p = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), JWT_SECRET);
    const u = await User.findById(p.id);
    if (!u || (roles.length && !roles.includes(u.role))) return bad(res, 'Not allowed', 403);
    req.user = u; next();
  } catch { bad(res, 'Please log in', 401); }
});
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40 });

// ---- Auth
app.post('/api/auth/register', limiter, wrap(async (req, res) => {
  const { name, email, phone, subject, password } = req.body;
  if (!t(name) || !/^\S+@\S+\.\S+$/.test(t(email)) || t(password).length < 6) return bad(res, 'Name, valid email and 6+ char password required');
  if (await User.findOne({ email: t(email).toLowerCase() })) return bad(res, 'Email already registered');
  const u = await User.create({ name: t(name), email: t(email), phone: t(phone), subject: t(subject), password: await bcrypt.hash(password, 10) });
  res.json({ token: sign(u), user: pub(u) });
}));
app.post('/api/auth/login', limiter, wrap(async (req, res) => {
  const u = await User.findOne({ email: t(req.body.email).toLowerCase() });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password))) return bad(res, 'Invalid email or password', 401);
  res.json({ token: sign(u), user: pub(u) });
}));

// ---- Homework
app.get('/api/homework', wrap(async (req, res) => {
  const q = {}; const c = parseInt(req.query.classNo);
  if (c >= 1 && c <= 8) q.classNo = c;
  res.json(await Homework.find(q).sort('-createdAt').limit(300));
}));
app.get('/api/homework/mine', auth('teacher'), wrap(async (req, res) => res.json(await Homework.find({ teacherId: req.user._id }).sort('-createdAt'))));
app.post('/api/homework', auth('teacher', 'admin'), wrap(async (req, res) => {
  if (req.user.role === 'teacher' && !req.user.approved) return bad(res, 'Your account is awaiting principal approval', 403);
  const classNo = parseInt(req.body.classNo);
  if (!(classNo >= 1 && classNo <= 8) || !t(req.body.subject) || !t(req.body.title)) return bad(res, 'Class, subject and title required');
  res.json(await Homework.create({ classNo, subject: t(req.body.subject), title: t(req.body.title), details: t(req.body.details), dueDate: t(req.body.dueDate), teacherId: req.user._id, teacherName: req.user.name }));
}));
app.delete('/api/homework/:id', auth('teacher', 'admin'), wrap(async (req, res) => {
  const h = await Homework.findById(req.params.id);
  if (!h) return bad(res, 'Not found', 404);
  if (req.user.role !== 'admin' && String(h.teacherId) !== String(req.user._id)) return bad(res, 'Not allowed', 403);
  await h.deleteOne(); res.json({ ok: true });
}));

// ---- Notices & gallery (public read, admin write)
const crud = (route, Model, fields) => {
  app.get(`/api/${route}`, wrap(async (_q, res) => res.json(await Model.find().sort('-createdAt').limit(100))));
  app.post(`/api/${route}`, auth('admin'), wrap(async (req, res) => {
    const d = {}; for (const f of fields) d[f] = t(req.body[f]);
    if (!d[fields[0]]) return bad(res, `${fields[0]} required`);
    if (route === 'gallery' && !/^https?:\/\//.test(d.url)) return bad(res, 'Valid image URL required');
    res.json(await Model.create(d));
  }));
  app.delete(`/api/${route}/:id`, auth('admin'), wrap(async (req, res) => { await Model.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));
};
crud('notices', Notice, ['title', 'body', 'type']);
crud('gallery', Photo, ['url', 'caption', 'category']);

// ---- Admission enquiries
app.post('/api/enquiries', limiter, wrap(async (req, res) => {
  const { studentName, classApplying, email, phone } = req.body;
  if (!t(studentName) || !t(classApplying) || !/^\S+@\S+\.\S+$/.test(t(email)) || !/^[0-9+\-\s]{10,15}$/.test(t(phone))) return bad(res, 'Please fill all fields correctly');
  await Enquiry.create({ studentName: t(studentName), classApplying: t(classApplying), email: t(email), phone: t(phone) });
  res.json({ ok: true });
}));
app.get('/api/admin/enquiries', auth('admin'), wrap(async (_q, res) => res.json(await Enquiry.find().sort('-createdAt').limit(200))));
app.delete('/api/admin/enquiries/:id', auth('admin'), wrap(async (req, res) => { await Enquiry.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

// ---- Admin: teachers
app.get('/api/admin/teachers', auth('admin'), wrap(async (_q, res) => res.json(await User.find({ role: 'teacher' }).select('-password').sort('-createdAt'))));
app.patch('/api/admin/teachers/:id', auth('admin'), wrap(async (req, res) => { await User.updateOne({ _id: req.params.id, role: 'teacher' }, { approved: !!req.body.approved }); res.json({ ok: true }); }));
app.delete('/api/admin/teachers/:id', auth('admin'), wrap(async (req, res) => { await User.deleteOne({ _id: req.params.id, role: 'teacher' }); res.json({ ok: true }); }));

app.get('/healthz', (_q, res) => res.send('ok'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', (_q, res) => bad(res, 'Not found', 404));
app.get('*', (_q, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

mongoose.connect(MONGODB_URI).then(async () => {
  if (ADMIN_EMAIL && ADMIN_PASSWORD && !(await User.findOne({ email: ADMIN_EMAIL.toLowerCase() })))
    await User.create({ name: 'Principal', email: ADMIN_EMAIL, password: await bcrypt.hash(ADMIN_PASSWORD, 10), role: 'admin', approved: true });
  app.listen(PORT, () => console.log('Running on ' + PORT));
}).catch(e => { console.error('DB connection failed', e.message); process.exit(1); });
