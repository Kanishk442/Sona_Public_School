// ---- Edit these school details ----
const SCHOOL = { name: 'Sona Public School', phone: '+91 00000 00000', email: 'info@sonapublicschool.in', address: 'Chauhan Patti, Delhi', insta: 'https://www.instagram.com/sonapublicschool/' };
const CLASSES = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8'];
const SUBJECTS = ['English', 'Hindi', 'Maths', 'EVS / Science', 'Social Science', 'Computer', 'Sanskrit', 'GK', 'Other'];

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
let token = localStorage.getItem('t'), me = JSON.parse(localStorage.getItem('me') || 'null');

async function api(path, o = {}) {
  const r = await fetch('/api' + path, { method: o.method || 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && token) logout(false);
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}
function setSession(d) { token = d.token; me = d.user; localStorage.setItem('t', token); localStorage.setItem('me', JSON.stringify(me)); }
function logout(go = true) { token = null; me = null; localStorage.clear(); if (go) renderStaff(); }
const opts = (arr, ph) => (ph ? `<option value="">${ph}</option>` : '') + arr.map(x => `<option>${esc(x)}</option>`).join('');

// ---- Static info
document.title = SCHOOL.name + ', ' + SCHOOL.address;
$('#sn').textContent = SCHOOL.name; $('#addr').textContent = '📍 ' + SCHOOL.address;
for (const id of ['#tel', '#tel2']) { $(id).textContent = SCHOOL.phone; $(id).href = 'tel:' + SCHOOL.phone.replace(/\s/g, ''); }
$('#mail').textContent = SCHOOL.email; $('#mail').href = 'mailto:' + SCHOOL.email; $('#insta').href = SCHOOL.insta; $('#yr').textContent = new Date().getFullYear();
$('select[name=classApplying]').insertAdjacentHTML('beforeend', opts(CLASSES.map(c => /\d/.test(c) ? 'Class ' + c : c)));
$('#burger').onclick = () => $('#nav').classList.toggle('open');

// ---- Router
function route() {
  const h = location.hash.slice(1) || 'home';
  $$('.page').forEach(p => p.hidden = p.id !== h);
  $$('nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + h && !a.classList.contains('cta')));
  $('#nav').classList.remove('open'); scrollTo(0, 0);
  if (h === 'home') loadHome(); if (h === 'students') loadHW(); if (h === 'staff') renderStaff();
}
addEventListener('hashchange', route);

// ---- Home
let photos = [];
async function loadHome() {
  try {
    const n = await api('/notices');
    $('#notices').innerHTML = n.length ? n.slice(0, 6).map(x => `<div class="card"><span class="tag">${esc(x.type || 'Notice')}</span><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p><small>${fmt(x.createdAt)}</small></div>`).join('') : '<div class="empty">No announcements right now.</div>';
    photos = await api('/gallery'); drawGallery('');
  } catch (e) { $('#notices').innerHTML = '<div class="empty">Unable to load. Please refresh.</div>'; }
}
function drawGallery(c) {
  const list = photos.filter(p => !c || p.category === c);
  $('#gallery').innerHTML = list.length ? list.map(p => `<figure><img loading="lazy" src="${esc(p.url)}" alt="${esc(p.caption || 'School photo')}"><figcaption>${esc(p.caption)}</figcaption></figure>`).join('') : '<div class="empty">Photos coming soon.</div>';
}
$('#gcats').onclick = e => { if (e.target.dataset.c === undefined) return; $$('#gcats button').forEach(b => b.classList.toggle('on', b === e.target)); drawGallery(e.target.dataset.c); };

// ---- Admission
$('#enqForm').onsubmit = async e => {
  e.preventDefault(); const m = $('#enqMsg'); m.className = 'msg';
  try { await api('/enquiries', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); m.textContent = 'Thank you! We will contact you soon.'; m.classList.add('ok'); e.target.reset(); }
  catch (x) { m.textContent = x.message; m.classList.add('err'); }
};

// ---- Students
let cls = '1', sub = '';
$('#classTabs').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8].map(c => `<button data-c="${c}" class="${c == 1 ? 'on' : ''}">Class ${c}</button>`).join('');
$('#classTabs').onclick = e => { if (!e.target.dataset.c) return; cls = e.target.dataset.c; sub = ''; $$('#classTabs button').forEach(b => b.classList.toggle('on', b === e.target)); loadHW(); };
$('#subTabs').onclick = e => { if (e.target.dataset.s === undefined) return; sub = e.target.dataset.s; loadHW(); };
async function loadHW() {
  try {
    const all = await api('/homework?classNo=' + cls);
    const subs = [...new Set(all.map(h => h.subject))];
    $('#subTabs').innerHTML = subs.length ? `<button data-s="" class="${sub ? '' : 'on'}">All Subjects</button>` + subs.map(s => `<button data-s="${esc(s)}" class="${sub === s ? 'on' : ''}">${esc(s)}</button>`).join('') : '';
    const list = all.filter(h => !sub || h.subject === sub);
    $('#hw').innerHTML = list.length ? list.map(hwCard).join('') : `<div class="empty">No homework posted for Class ${esc(cls)} yet.</div>`;
  } catch (e) { $('#hw').innerHTML = '<div class="empty">Unable to load homework.</div>'; }
}
const hwCard = (h, del) => `<div class="card"><div class="row"><span class="tag">${esc(h.subject)}</span>${del ? `<button class="del" data-del="homework" data-id="${h._id}">Delete</button>` : ''}</div><h3>${esc(h.title)}</h3><p>${esc(h.details)}</p><small>${del ? 'Class ' + h.classNo + ' · ' : ''}By ${esc(h.teacherName)} · Posted ${fmt(h.createdAt)}${h.dueDate ? ' · Due ' + esc(h.dueDate) : ''}</small></div>`;

// ---- Staff portal (teacher + admin)
async function renderStaff() {
  const box = $('#staffBox');
  if (!me) {
    box.innerHTML = `<div class="narrow" style="margin:auto"><h2>Staff Portal</h2><div class="chips"><button id="tl" class="on">Login</button><button id="tr">Teacher Registration</button></div>
    <form id="lf" class="card form"><label>Email<input name="email" type="email" required></label><label>Password<input name="password" type="password" required></label><button class="btn">Login</button><p class="msg err" id="lm"></p></form>
    <form id="rf" class="card form" hidden><label>Full Name<input name="name" required></label><label>Email<input name="email" type="email" required></label><label>Phone<input name="phone" type="tel"></label><label>Main Subject<select name="subject">${opts(SUBJECTS)}</select></label><label>Password (min 6)<input name="password" type="password" minlength="6" required></label><button class="btn">Register</button><p class="msg err" id="rm"></p></form></div>`;
    const sw = r => { $('#lf').hidden = r; $('#rf').hidden = !r; $('#tl').classList.toggle('on', !r); $('#tr').classList.toggle('on', r); };
    $('#tl').onclick = () => sw(false); $('#tr').onclick = () => sw(true);
    const sub = (id, path, mid) => $(id).onsubmit = async e => { e.preventDefault(); try { setSession(await api(path, { method: 'POST', body: Object.fromEntries(new FormData(e.target)) })); renderStaff(); } catch (x) { $(mid).textContent = x.message; } };
    sub('#lf', '/auth/login', '#lm'); sub('#rf', '/auth/register', '#rm'); return;
  }
  const head = `<div class="row"><h2>${me.role === 'admin' ? 'Principal Dashboard' : 'Teacher Dashboard'} — ${esc(me.name)}</h2><button class="btn ghost" style="color:var(--navy);border-color:var(--navy)" id="lo">Logout</button></div>`;
  const hwForm = `<h3 class="sec">Post Homework / Assignment</h3><form id="hf" class="card form"><label>Class<select name="classNo">${[1,2,3,4,5,6,7,8].map(c => `<option value="${c}">Class ${c}</option>`).join('')}</select></label><label>Subject<select name="subject">${opts(SUBJECTS)}</select></label><label>Title<input name="title" required maxlength="120"></label><label>Details<textarea name="details" rows="3" maxlength="1500"></textarea></label><label>Due Date<input type="date" name="dueDate"></label><button class="btn">Post</button><p class="msg" id="hm"></p></form>`;
  if (me.role === 'teacher') {
    box.innerHTML = head + (me.approved ? '' : '<p class="msg err">Your account is awaiting principal approval. You can post homework once approved.</p>') + hwForm + '<h3 class="sec">My Posts</h3><div id="mine" class="cards"></div>';
    bindCommon(); loadMine();
  } else {
    box.innerHTML = head + `<h3 class="sec">Post Announcement / Curricular</h3><form id="nf" class="card form"><label>Type<select name="type">${opts(['Announcement', 'Curricular', 'Event', 'Holiday'])}</select></label><label>Title<input name="title" required></label><label>Message<textarea name="body" rows="3"></textarea></label><button class="btn">Publish</button></form>
    <h3 class="sec">Add Gallery Photo</h3><form id="gf" class="card form"><label>Image URL (https://...)<input name="url" required></label><label>Caption<input name="caption"></label><label>Category<select name="category"><option value="infrastructure">Infrastructure</option><option value="competition">Competition</option></select></label><button class="btn">Add Photo</button></form>
    <h3 class="sec">Teachers</h3><div class="tbl" id="tt"></div><h3 class="sec">Admission Enquiries</h3><div class="tbl" id="et"></div>
    <h3 class="sec">Announcements</h3><div id="nl" class="cards"></div><h3 class="sec">Gallery</h3><div id="gl" class="cards"></div>${hwForm}<h3 class="sec">All Homework</h3><div id="mine" class="cards"></div>`;
    bindCommon(); bindAdmin(); loadAdmin();
  }
}
function bindCommon() {
  $('#lo').onclick = () => logout();
  $('#hf').onsubmit = async e => { e.preventDefault(); const m = $('#hm'); try { await api('/homework', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); m.textContent = 'Posted!'; m.className = 'msg ok'; e.target.reset(); me.role === 'admin' ? loadAdmin() : loadMine(); } catch (x) { m.textContent = x.message; m.className = 'msg err'; } };
}
async function loadMine() { const l = await api('/homework/mine'); $('#mine').innerHTML = l.length ? l.map(h => hwCard(h, true)).join('') : '<div class="empty">Nothing posted yet.</div>'; }
function bindAdmin() {
  const post = (id, path) => $(id).onsubmit = async e => { e.preventDefault(); try { await api(path, { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); e.target.reset(); loadAdmin(); } catch (x) { alert(x.message); } };
  post('#nf', '/notices'); post('#gf', '/gallery');
}
async function loadAdmin() {
  const [t, en, n, g, h] = await Promise.all([api('/admin/teachers'), api('/admin/enquiries'), api('/notices'), api('/gallery'), api('/homework')]);
  $('#tt').innerHTML = `<table><tr><th>Name</th><th>Email</th><th>Phone</th><th>Subject</th><th>Status</th><th></th></tr>${t.map(x => `<tr><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${esc(x.phone)}</td><td>${esc(x.subject)}</td><td>${x.approved ? 'Approved' : 'Pending'}</td><td><button class="del" style="color:var(--navy)" data-appr="${x._id}" data-v="${!x.approved}">${x.approved ? 'Revoke' : 'Approve'}</button> <button class="del" data-del="admin/teachers" data-id="${x._id}">Remove</button></td></tr>`).join('') || '<tr><td colspan=6>No teachers yet</td></tr>'}</table>`;
  $('#et').innerHTML = `<table><tr><th>Date</th><th>Student</th><th>Class</th><th>Email</th><th>Phone</th><th></th></tr>${en.map(x => `<tr><td>${fmt(x.createdAt)}</td><td>${esc(x.studentName)}</td><td>${esc(x.classApplying)}</td><td>${esc(x.email)}</td><td>${esc(x.phone)}</td><td><button class="del" data-del="admin/enquiries" data-id="${x._id}">Delete</button></td></tr>`).join('') || '<tr><td colspan=6>No enquiries yet</td></tr>'}</table>`;
  $('#nl').innerHTML = n.map(x => `<div class="card"><div class="row"><span class="tag">${esc(x.type)}</span><button class="del" data-del="notices" data-id="${x._id}">Delete</button></div><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p></div>`).join('') || '<div class="empty">None</div>';
  $('#gl').innerHTML = g.map(x => `<div class="card"><img src="${esc(x.url)}" alt="" style="width:100%;height:120px;object-fit:cover;border-radius:8px"><div class="row"><small>${esc(x.caption)} (${esc(x.category)})</small><button class="del" data-del="gallery" data-id="${x._id}">Delete</button></div></div>`).join('') || '<div class="empty">None</div>';
  $('#mine').innerHTML = h.map(x => hwCard(x, true)).join('') || '<div class="empty">None</div>';
}
$('#staffBox').addEventListener('click', async e => {
  const d = e.target.dataset; if (!d.del && !d.appr) return;
  if (d.del && !confirm('Delete this item?')) return;
  try {
    if (d.appr) await api('/admin/teachers/' + d.appr, { method: 'PATCH', body: { approved: d.v === 'true' } });
    else await api('/' + d.del + '/' + d.id, { method: 'DELETE' });
    me.role === 'admin' ? loadAdmin() : loadMine();
  } catch (x) { alert(x.message); }
});
route();
