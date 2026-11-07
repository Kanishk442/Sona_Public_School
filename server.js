require('dotenv').config();
const express = require('express'), mongoose = require('mongoose'), bcrypt = require('bcryptjs'), crypto = require('crypto'),
  jwt = require('jsonwebtoken'), helmet = require('helmet'), rateLimit = require('express-rate-limit'), path = require('path'), multer = require('multer');
const { MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, BREVO_API_KEY, MAIL_FROM, NOTIFY_EMAIL, BASE_URL, PORT = 3000 } = process.env;
if (!MONGODB_URI || !JWT_SECRET) { console.error('Set MONGODB_URI and JWT_SECRET'); process.exit(1); }

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' }));

const S = o => new mongoose.Schema(o, { timestamps: true });
const User = mongoose.model('User', S({ name: String, email: { type: String, unique: true, lowercase: true }, phone: String, subject: String, subjects: [String], photo: Buffer, photoType: String, password: String, resetHash: String, resetExp: Date, role: { type: String, default: 'teacher' }, approved: { type: Boolean, default: false } }));
const Homework = mongoose.model('Homework', S({ fileData: Buffer, fileName: String, hasFile: Boolean, classNo: Number, subject: String, title: String, details: String, dueDate: String, teacherId: mongoose.Schema.Types.ObjectId, teacherName: String }));
const Notice = mongoose.model('Notice', S({ title: String, body: String, type: String, date: String }));
const Photo = mongoose.model('Photo', S({ data: Buffer, contentType: String, url: String, caption: String, category: String }));
const Doc = mongoose.model('Doc', S({ title: String, category: String, fileName: String, fileData: Buffer }));
const Enquiry = mongoose.model('Enquiry', S({ studentName: String, classApplying: String, email: String, phone: String }));
const Counter = mongoose.model('Counter', new mongoose.Schema({ _id: String, n: Number }));

const t = v => (typeof v === 'string' ? v.trim() : '');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(e => { console.error(e); res.status(500).json({ error: 'Server error' }); });
const bad = (res, m, c = 400) => res.status(c).json({ error: m });
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const sign = u => jwt.sign({ id: u._id, role: u.role }, JWT_SECRET, { expiresIn: '7d' });
const subs = v => [].concat(v || []).map(x => t(x).slice(0, 40)).filter(Boolean).slice(0, 10);
const pub = u => ({ id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role, approved: u.approved, hasPhoto: !!u.photoType, subjects: u.subjects && u.subjects.length ? u.subjects : (u.subject ? [u.subject] : []) });
const today = () => new Date().toISOString().slice(0, 10);

// Free email via Brevo HTTPS API (Render free blocks SMTP ports). Silently skipped if not configured.
async function mail(to, subject, html) {
  if (!BREVO_API_KEY || !MAIL_FROM || !to) return false;
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ sender: { name: 'Sona Public School', email: MAIL_FROM }, to: [{ email: to }], subject, htmlContent: html }) });
    if (!r.ok) console.error('mail failed', r.status, await r.text());
    return r.ok;
  } catch (e) { console.error('mail error', e.message); return false; }
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 10 } });
const sniff = b => !b || b.length < 12 ? null : b.slice(0, 5).toString() === '%PDF-' ? 'application/pdf' : (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) ? 'image/jpeg' : b.slice(1, 4).toString() === 'PNG' ? 'image/png' : (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') ? 'image/webp' : null;
const isImg = ty => ['image/jpeg', 'image/png', 'image/webp'].includes(ty);
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40 });
const okId = id => mongoose.isValidObjectId(id);
const sendFile = (res, type, name, data) => res.set({ 'Content-Type': type, 'Content-Disposition': `inline; filename="${(name || 'file').replace(/[^\w.\- ]/g, '_')}"`, 'Cache-Control': 'public, max-age=3600' }).send(data);
const cleanName = (f, d) => (t(f.originalname).replace(/[^\w.\- ]/g, '_').slice(0, 100) || d);

const auth = (...roles) => wrap(async (req, res, next) => {
  try {
    const p = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), JWT_SECRET);
    const u = await User.findById(p.id).select('-photo -resetHash');
    if (!u || (roles.length && !roles.includes(u.role))) return bad(res, 'Not allowed', 403);
    req.user = u; next();
  } catch { bad(res, 'Please log in', 401); }
});

// ---- Auth & passwords
app.post('/api/auth/register', limiter, wrap(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!t(name) || !/^\S+@\S+\.\S+$/.test(t(email)) || t(password).length < 6) return bad(res, 'Name, valid email and 6+ char password required');
  if (await User.findOne({ email: t(email).toLowerCase() })) return bad(res, 'Email already registered');
  const u = await User.create({ name: t(name).slice(0, 80), email: t(email), phone: t(phone).slice(0, 20), subjects: subs(req.body.subjects), password: await bcrypt.hash(password, 10) });
  res.json({ token: sign(u), user: pub(u) });
}));
app.post('/api/auth/login', limiter, wrap(async (req, res) => {
  const u = await User.findOne({ email: t(req.body.email).toLowerCase() }).select('-photo');
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password))) return bad(res, 'Invalid email or password', 401);
  res.json({ token: sign(u), user: pub(u) });
}));
app.get('/api/auth/me', auth(), (req, res) => res.json({ user: pub(req.user) }));
app.post('/api/auth/forgot', limiter, wrap(async (req, res) => {
  const configured = !!(BREVO_API_KEY && MAIL_FROM);
  const u = await User.findOne({ email: t(req.body.email).toLowerCase() }).select('name email');
  if (u && configured) {
    const tok = crypto.randomBytes(24).toString('hex');
    await User.updateOne({ _id: u._id }, { resetHash: sha(tok), resetExp: new Date(Date.now() + 36e5) });
    const base = BASE_URL || `${req.protocol}://${req.get('host')}`;
    mail(u.email, 'Reset your Sona Public School password', `<p>Hello ${esc(u.name)},</p><p><a href="${base}/#reset/${tok}">Click here to reset your password</a>. The link is valid for 1 hour.</p><p>If you did not ask for this, ignore this email.</p>`);
  }
  res.json({ ok: true, configured });
}));
app.post('/api/auth/reset', limiter, wrap(async (req, res) => {
  if (t(req.body.password).length < 6) return bad(res, 'Password must be at least 6 characters');
  const u = await User.findOne({ resetHash: sha(t(req.body.token)), resetExp: { $gt: new Date() } }).select('_id');
  if (!u) return bad(res, 'This reset link is invalid or has expired');
  await User.updateOne({ _id: u._id }, { password: await bcrypt.hash(req.body.password, 10), $unset: { resetHash: 1, resetExp: 1 } });
  res.json({ ok: true });
}));
app.post('/api/auth/change-password', auth(), wrap(async (req, res) => {
  const u = await User.findById(req.user._id).select('password');
  if (t(req.body.password).length < 6) return bad(res, 'New password must be at least 6 characters');
  if (!(await bcrypt.compare(req.body.current || '', u.password))) return bad(res, 'Current password is wrong', 401);
  await User.updateOne({ _id: u._id }, { password: await bcrypt.hash(req.body.password, 10) });
  res.json({ ok: true });
}));
app.put('/api/auth/profile', auth('teacher', 'admin'), upload.single('photo'), wrap(async (req, res) => {
  const set = { phone: t(req.body.phone).slice(0, 20), subjects: subs(req.body.subjects) };
  if (t(req.body.name)) set.name = t(req.body.name).slice(0, 80);
  if (req.file) { const ty = sniff(req.file.buffer); if (!isImg(ty)) return bad(res, 'Photo must be JPG, PNG or WebP'); set.photo = req.file.buffer; set.photoType = ty; }
  await User.updateOne({ _id: req.user._id }, set);
  res.json({ user: pub(await User.findById(req.user._id).select('-photo')) });
}));

// ---- Public teachers page
app.get('/api/teachers', wrap(async (_q, res) => res.json((await User.find({ role: 'teacher', approved: true }).select('name subject subjects photoType').sort('name')).map(u => ({ id: u._id, name: u.name, hasPhoto: !!u.photoType, subjects: pub(u).subjects })))));
app.get('/api/teachers/:id/photo', wrap(async (req, res) => {
  const u = okId(req.params.id) && await User.findById(req.params.id).select('photo photoType role approved');
  if (!u || !u.photoType || u.role !== 'teacher' || !u.approved) return bad(res, 'Not found', 404);
  res.set({ 'Content-Type': u.photoType, 'Cache-Control': 'public, max-age=3600' }).send(u.photo);
}));

// ---- Homework (auto-hides 7 days after due date, or 30 days after posting if no due date)
const visible = h => h.dueDate ? h.dueDate >= new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10) : h.createdAt > new Date(Date.now() - 30 * 864e5);
app.get('/api/homework', wrap(async (req, res) => {
  const q = {}; const c = parseInt(req.query.classNo);
  if (c >= 1 && c <= 8) q.classNo = c;
  res.json((await Homework.find(q).select('-fileData').sort('-createdAt').limit(300)).filter(visible));
}));
app.get('/api/homework/mine', auth('teacher'), wrap(async (req, res) => res.json(await Homework.find({ teacherId: req.user._id }).select('-fileData').sort('-createdAt'))));
app.get('/api/admin/homework', auth('admin'), wrap(async (_q, res) => res.json(await Homework.find().select('-fileData').sort('-createdAt').limit(300))));
app.post('/api/homework', auth('teacher', 'admin'), upload.single('pdf'), wrap(async (req, res) => {
  if (req.user.role === 'teacher' && !req.user.approved) return bad(res, 'Your account is awaiting principal approval', 403);
  const classNo = parseInt(req.body.classNo);
  if (!(classNo >= 1 && classNo <= 8) || !t(req.body.subject) || !t(req.body.title)) return bad(res, 'Class, subject and title required');
  const f = req.file;
  if (f && sniff(f.buffer) !== 'application/pdf') return bad(res, 'Only PDF files are allowed');
  res.json(await Homework.create({ fileData: f && f.buffer, fileName: f ? cleanName(f, 'homework.pdf') : undefined, hasFile: !!f, classNo, subject: t(req.body.subject), title: t(req.body.title), details: t(req.body.details), dueDate: t(req.body.dueDate), teacherId: req.user._id, teacherName: req.user.name }));
}));
app.get('/api/homework/:id/file', wrap(async (req, res) => {
  const h = okId(req.params.id) && await Homework.findById(req.params.id).select('fileData fileName hasFile');
  if (!h || !h.hasFile) return bad(res, 'File not found', 404);
  sendFile(res, 'application/pdf', h.fileName, h.fileData);
}));
app.delete('/api/homework/:id', auth('teacher', 'admin'), wrap(async (req, res) => {
  const h = await Homework.findById(req.params.id).select('teacherId');
  if (!h) return bad(res, 'Not found', 404);
  if (req.user.role !== 'admin' && String(h.teacherId) !== String(req.user._id)) return bad(res, 'Not allowed', 403);
  await h.deleteOne(); res.json({ ok: true });
}));

// ---- Notices / events / achievements (principal posts)
app.get('/api/notices', wrap(async (_q, res) => res.json(await Notice.find().sort('-createdAt').limit(150))));
app.post('/api/notices', auth('admin'), wrap(async (req, res) => {
  if (!t(req.body.title)) return bad(res, 'Title required');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(t(req.body.date)) ? t(req.body.date) : '';
  res.json(await Notice.create({ title: t(req.body.title).slice(0, 150), body: t(req.body.body).slice(0, 1500), type: t(req.body.type) || 'Announcement', date }));
}));
app.delete('/api/notices/:id', auth('admin'), wrap(async (req, res) => { await Notice.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

// ---- Gallery (principal only; stored in MongoDB so it survives redeploys)
const CATS = ['infrastructure', 'activities', 'events', 'creative'];
const photoOut = d => ({ _id: d._id, caption: d.caption, category: d.category, createdAt: d.createdAt, url: d.url || `/api/gallery/${d._id}/image` });
app.get('/api/gallery', wrap(async (_q, res) => res.json((await Photo.find().select('-data').sort('-createdAt').limit(100)).map(photoOut))));
app.get('/api/gallery/:id/image', wrap(async (req, res) => {
  const p = okId(req.params.id) && await Photo.findById(req.params.id).select('data contentType');
  if (!p || !p.data) return bad(res, 'Not found', 404);
  res.set({ 'Content-Type': p.contentType, 'Cache-Control': 'public, max-age=86400' }).send(p.data);
}));
app.post('/api/gallery', auth('admin'), upload.array('photos', 10), wrap(async (req, res) => {
  const files = req.files || [];
  if (!files.length) return bad(res, 'Choose at least one photo');
  const category = CATS.includes(req.body.category) ? req.body.category : 'events';
  for (const f of files) if (!isImg(sniff(f.buffer))) return bad(res, 'Only JPG, PNG or WebP images are allowed');
  await Photo.insertMany(files.map(f => ({ data: f.buffer, contentType: sniff(f.buffer), caption: t(req.body.caption), category })));
  res.json({ ok: true, count: files.length });
}));
app.delete('/api/gallery/:id', auth('admin'), wrap(async (req, res) => { await Photo.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

// ---- Downloads (circulars, syllabus, holiday list...)
app.get('/api/docs', wrap(async (_q, res) => res.json(await Doc.find().select('-fileData').sort('-createdAt').limit(200))));
app.get('/api/docs/:id/file', wrap(async (req, res) => {
  const d = okId(req.params.id) && await Doc.findById(req.params.id).select('fileData fileName');
  if (!d) return bad(res, 'Not found', 404);
  sendFile(res, 'application/pdf', d.fileName, d.fileData);
}));
app.post('/api/docs', auth('admin'), upload.single('file'), wrap(async (req, res) => {
  const f = req.file;
  if (!f || sniff(f.buffer) !== 'application/pdf') return bad(res, 'Please choose a PDF file');
  if (!t(req.body.title)) return bad(res, 'Title required');
  await Doc.create({ title: t(req.body.title).slice(0, 150), category: t(req.body.category) || 'Other', fileName: cleanName(f, 'document.pdf'), fileData: f.buffer });
  res.json({ ok: true });
}));
app.delete('/api/docs/:id', auth('admin'), wrap(async (req, res) => { await Doc.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

// ---- Admission enquiries (+ email alert)
app.post('/api/enquiries', limiter, wrap(async (req, res) => {
  const { studentName, classApplying, email, phone } = req.body;
  if (!t(studentName) || !t(classApplying) || !/^\S+@\S+\.\S+$/.test(t(email)) || !/^[0-9+\-\s]{10,15}$/.test(t(phone))) return bad(res, 'Please fill all fields correctly');
  const e = await Enquiry.create({ studentName: t(studentName), classApplying: t(classApplying), email: t(email), phone: t(phone) });
  mail(NOTIFY_EMAIL || ADMIN_EMAIL, `New admission enquiry: ${e.studentName} (${e.classApplying})`, `<h3>New admission enquiry</h3><p><b>Student:</b> ${esc(e.studentName)}<br><b>Class:</b> ${esc(e.classApplying)}<br><b>Phone:</b> ${esc(e.phone)}<br><b>Email:</b> ${esc(e.email)}</p>`);
  res.json({ ok: true });
}));
app.get('/api/admin/enquiries', auth('admin'), wrap(async (_q, res) => res.json(await Enquiry.find().sort('-createdAt').limit(500))));
app.get('/api/admin/enquiries.csv', auth('admin'), wrap(async (_q, res) => {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = (await Enquiry.find().sort('-createdAt')).map(e => [e.createdAt.toISOString().slice(0, 10), e.studentName, e.classApplying, e.phone, e.email].map(q).join(','));
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="admission-enquiries.csv"' }).send('\ufeff' + ['Date,Student,Class,Phone,Email', ...rows].join('\n'));
}));
app.delete('/api/admin/enquiries/:id', auth('admin'), wrap(async (req, res) => { await Enquiry.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

// ---- Admin: teachers, stats, backup
app.get('/api/admin/teachers', auth('admin'), wrap(async (_q, res) => res.json((await User.find({ role: 'teacher' }).select('-password -photo -resetHash').sort('-createdAt')).map(u => ({ ...pub(u), createdAt: u.createdAt })))));
app.patch('/api/admin/teachers/:id', auth('admin'), wrap(async (req, res) => { await User.updateOne({ _id: req.params.id, role: 'teacher' }, { approved: !!req.body.approved }); res.json({ ok: true }); }));
app.post('/api/admin/teachers/:id/reset', auth('admin'), wrap(async (req, res) => {
  const pw = crypto.randomBytes(5).toString('hex');
  const r = await User.updateOne({ _id: req.params.id, role: 'teacher' }, { password: await bcrypt.hash(pw, 10) });
  if (!r.matchedCount) return bad(res, 'Not found', 404);
  res.json({ password: pw });
}));
app.delete('/api/admin/teachers/:id', auth('admin'), wrap(async (req, res) => { await User.deleteOne({ _id: req.params.id, role: 'teacher' }); res.json({ ok: true }); }));
app.post('/api/visit', rateLimit({ windowMs: 60 * 1000, limit: 20 }), wrap(async (_q, res) => { await Counter.updateOne({ _id: 'visits' }, { $inc: { n: 1 } }, { upsert: true }); res.json({ ok: true }); }));
app.get('/api/admin/stats', auth('admin'), wrap(async (_q, res) => {
  const [v, enq, tch, pend] = await Promise.all([Counter.findById('visits'), Enquiry.countDocuments(), User.countDocuments({ role: 'teacher' }), User.countDocuments({ role: 'teacher', approved: false })]);
  res.json({ visits: v ? v.n : 0, enquiries: enq, teachers: tch, pending: pend });
}));
app.get('/api/admin/backup', auth('admin'), wrap(async (_q, res) => {
  const [users, notices, enquiries, homework, docs] = await Promise.all([User.find().select('-password -photo -resetHash').lean(), Notice.find().lean(), Enquiry.find().lean(), Homework.find().select('-fileData').lean(), Doc.find().select('-fileData').lean()]);
  res.set({ 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="sona-backup-${today()}.json"` }).send(JSON.stringify({ exportedAt: new Date(), note: 'Text data only. Photos and PDF files are not included.', users, notices, enquiries, homework, docs }, null, 1));
}));

app.get('/healthz', (_q, res) => res.send('ok'));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets'), { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', (_q, res) => bad(res, 'Not found', 404));
app.use((err, _q, res, _n) => { console.error(err.message); const big = err.code === 'LIMIT_FILE_SIZE'; bad(res, big ? 'File too large (max 5 MB each)' : 'Upload failed', big ? 413 : 400); });
app.get('*', (_q, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

mongoose.connect(MONGODB_URI).then(async () => {
  if (ADMIN_EMAIL && ADMIN_PASSWORD && !(await User.findOne({ email: ADMIN_EMAIL.toLowerCase() })))
    await User.create({ name: 'Principal', email: ADMIN_EMAIL, password: await bcrypt.hash(ADMIN_PASSWORD, 10), role: 'admin', approved: true });
  app.listen(PORT, () => console.log('Running on ' + PORT));
}).catch(e => { console.error('DB connection failed', e.message); process.exit(1); });
