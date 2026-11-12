// ---- Edit these school details ----
const SCHOOL = { name: 'Sona Public School', principal: 'Niranjan Singh Tomar', phone: '+91 98109 96453', whatsapp: '919810996453', email: 'sonaps165@gmail.com', address: 'Chauhan Patti, Delhi', insta: 'https://www.instagram.com/sonapublicschool/' };
const CLASSES = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8'];
const SUBJECTS = ['English', 'Hindi', 'Maths', 'EVS / Science', 'Social Science', 'Computer', 'Sanskrit', 'GK', 'Moral Science', 'Art & Craft', 'Music', 'Dance', 'Physical Education', 'Other'];
const NOTICE_TYPES = ['Announcement', 'Curricular', 'Event', 'Holiday', 'Achievement'], DOC_CATS = ['Circular', 'Syllabus', 'Holiday List', 'Calendar', 'Other'];

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const empty = m => `<div class="empty">${m}</div>`, todayStr = () => new Date().toISOString().slice(0, 10);
let token = localStorage.getItem('t'), me = JSON.parse(localStorage.getItem('me') || 'null');

async function api(path, o = {}) {
  const f = o.body instanceof FormData;
  const r = await fetch('/api' + path, { method: o.method || 'GET', headers: { ...(f ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: o.body ? (f ? o.body : JSON.stringify(o.body)) : undefined });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && token) logout(false);
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}
async function dl(path, name) {
  const r = await fetch('/api' + path, { headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) throw new Error('Download failed');
  const u = URL.createObjectURL(await r.blob()), a = document.createElement('a'); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u);
}
function setSession(d) { token = d.token; me = d.user; localStorage.setItem('t', token); localStorage.setItem('me', JSON.stringify(me)); }
function logout(go = true) { token = null; me = null; localStorage.removeItem('t'); localStorage.removeItem('me'); if (go) renderStaff(); }
const opts = (arr, ph) => (ph ? `<option value="">${ph}</option>` : '') + arr.map(x => `<option>${esc(x)}</option>`).join('');
const checks = (sel = []) => SUBJECTS.map(s => `<label><input type="checkbox" name="subjects" value="${esc(s)}" ${sel.includes(s) ? 'checked' : ''}>${esc(s)}</label>`).join('');
function shrink(file, max = 1600) { // resize big photos before upload
  return new Promise(res => { const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); c.toBlob(b => res(b || file), 'image/jpeg', .85); };
    img.onerror = () => res(file); img.src = u; });
}
const say = (el, text, ok) => { el.textContent = text; el.className = 'msg ' + (ok === undefined ? '' : ok ? 'ok' : 'err'); };

// ---- Hindi / English toggle (swaps matching text on the page)
const HI = { 'Home': 'होम', 'About': 'हमारे बारे में', 'Teachers': 'शिक्षक', 'Students': 'विद्यार्थी', 'Downloads': 'डाउनलोड', 'Staff Login': 'स्टाफ लॉगिन', 'Admission Enquiry': 'प्रवेश पूछताछ', 'Enquire for Admission': 'प्रवेश के लिए पूछें', 'Student Corner': 'विद्यार्थी कोना', 'Growing with knowledge.': 'ज्ञान के साथ आगे बढ़ते हुए।', 'Guided by values.': 'संस्कारों के मार्गदर्शन में।', 'Welcome to Sona Public School': 'सोना पब्लिक स्कूल में आपका स्वागत है', "What's happening": 'क्या हो रहा है', 'School Announcements': 'स्कूल की घोषणाएँ', 'Upcoming Events': 'आने वाले कार्यक्रम', 'Achievements': 'उपलब्धियाँ', 'Mark your calendar': 'तारीख़ें नोट करें', 'We are proud of': 'हमें गर्व है', 'Life at Sona': 'सोना में जीवन', 'Moments that matter': 'यादगार पल', 'All moments': 'सभी पल', 'Campus': 'परिसर', 'Activities': 'गतिविधियाँ', 'Events & Competitions': 'कार्यक्रम व प्रतियोगिताएँ', 'Creative learning': 'रचनात्मक शिक्षा', 'Come say hello': 'हमसे मिलने आइए', 'Find our school': 'हमारा स्कूल खोजें', 'Get in touch': 'संपर्क करें', 'Admissions': 'प्रवेश', 'Take the first step': 'पहला कदम बढ़ाएँ', 'Student Name': 'विद्यार्थी का नाम', 'Class': 'कक्षा', 'Email ID': 'ईमेल', 'Phone No.': 'फ़ोन नंबर', 'Submit Enquiry': 'पूछताछ भेजें', 'About us': 'हमारे बारे में', 'About Sona Public School': 'सोना पब्लिक स्कूल के बारे में', 'Our Vision': 'हमारी दृष्टि', 'Our Mission': 'हमारा उद्देश्य', "From the Principal's desk": 'प्रधानाचार्य की कलम से', 'Our Teachers': 'हमारे शिक्षक', 'Our people': 'हमारे लोग', 'Resources': 'संसाधन', 'Student resources': 'विद्यार्थी संसाधन', 'Learn with curiosity': 'जिज्ञासा के साथ सीखें', 'Grow with values': 'संस्कारों के साथ बढ़ें', 'Create with confidence': 'आत्मविश्वास से रचें', 'Chat with us': 'हमसे चैट करें', 'Follow our journey': 'हमारे सफ़र से जुड़ें', 'Student Corner — Homework & Assignments': 'विद्यार्थी कोना — गृहकार्य व असाइनमेंट', 'All': 'सभी', 'All Subjects': 'सभी विषय', 'Circulars, syllabus, holiday list and school calendar.': 'सर्कुलर, पाठ्यक्रम, अवकाश सूची और स्कूल कैलेंडर।' };
let lang = localStorage.getItem('lang') || 'en';
function tr(root = document.body) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const k = (n.__o ?? n.nodeValue).trim();
    if (lang === 'hi' && HI[k] && n.__o === undefined) { n.__o = n.nodeValue; n.nodeValue = n.nodeValue.replace(k, HI[k]); }
    else if (lang === 'en' && n.__o !== undefined) { n.nodeValue = n.__o; delete n.__o; }
  }
  document.documentElement.lang = lang; $('#lang').textContent = lang === 'hi' ? 'English' : 'हिंदी';
}
$('#lang').onclick = () => { lang = lang === 'hi' ? 'en' : 'hi'; localStorage.setItem('lang', lang); tr(); };
new MutationObserver(ms => { if (lang === 'hi') ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && tr(n))); }).observe(document.body, { childList: true, subtree: true });

// ---- Static info
document.title = SCHOOL.name + ', ' + SCHOOL.address + ' | Admissions & Student Corner';
$('#sn').textContent = SCHOOL.name; $('#addr').textContent = '📍 ' + SCHOOL.address;
$$('[data-school]').forEach(e => e.textContent = SCHOOL[e.dataset.school]);
for (const id of ['#tel', '#tel2', '#ftel']) { $(id).textContent = SCHOOL.phone; $(id).href = 'tel:' + SCHOOL.phone.replace(/\s/g, ''); }
for (const id of ['#mail', '#fmail']) { $(id).textContent = SCHOOL.email; $(id).href = 'mailto:' + SCHOOL.email; }
$('#wa2').href = `https://wa.me/${SCHOOL.whatsapp}`;
 $('#insta').href = SCHOOL.insta; $('#yr').textContent = new Date().getFullYear();
$('#wa').href = `https://wa.me/${SCHOOL.whatsapp}?text=` + encodeURIComponent('Hello, I would like to enquire about admission at ' + SCHOOL.name + '.');
$('select[name=classApplying]').insertAdjacentHTML('beforeend', opts(CLASSES.map(c => /\d/.test(c) ? 'Class ' + c : c)));
$('#burger').onclick = () => { const open = $('#nav').classList.toggle('open'); $('#burger').setAttribute('aria-expanded', String(open)); };
if (!sessionStorage.getItem('v')) { sessionStorage.setItem('v', '1'); fetch('/api/visit', { method: 'POST' }).catch(() => {}); }

// ---- Router
function route() {
  let h = location.hash.slice(1) || 'home', tok = null;
  if (h.startsWith('reset/')) { tok = h.slice(6); h = 'staff'; }
  if (!$('#' + h)) h = 'home';
  $$('.page').forEach(p => p.hidden = p.id !== h);
  const navH = h === 'register' ? 'staff' : h;
  $$('nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + navH && !a.classList.contains('cta')));
  lbClose();
  $('#nav').classList.remove('open'); scrollTo(0, 0);
  ({ home: loadHome, students: loadHW, staff: () => renderStaff(tok), register: renderRegister, teachers: loadTeachers, downloads: loadDocs }[h] || (() => {}))();
  tr();
}
addEventListener('hashchange', route);

// ---- Home
const LOCAL_PHOTOS = [
  {url:'assets/infrastructure/school-at-night.webp',w:847,h:652,caption:'Our school illuminated for a celebration',category:'infrastructure',label:'Campus'},
  {url:'assets/infrastructure/campus-building.webp',w:620,h:836,caption:'A view of the school building',category:'infrastructure',label:'Campus'},
  {url:'assets/infrastructure/campus-courtyard.webp',w:622,h:827,caption:'School campus and courtyard',category:'infrastructure',label:'Campus'},
  {url:'assets/infrastructure/school-corridor.webp',w:606,h:842,caption:'A corridor inside the school',category:'infrastructure',label:'Campus'},
  {url:'assets/activities/say-no-to-plastic.webp',w:678,h:853,caption:'Students spreading awareness about reducing plastic use',category:'activities',label:'Student initiative'},
  {url:'assets/activities/tree-planting.webp',w:670,h:836,caption:'Students taking part in a planting activity',category:'activities',label:'Green initiative'},
  {url:'assets/events/independence-day.webp',w:625,h:831,caption:'Celebrating the spirit of Independence Day',category:'events',label:'Celebration'},
  {url:'assets/creative/student-craft.webp',w:687,h:855,caption:'A colourful student-made craft project',category:'creative',label:'Creative learning'},
  {url:'assets/gallery/classroom-smiles.webp',w:628,h:810,caption:'A happy moment from our classroom',category:'creative',label:'Classroom'},
  {url:'assets/gallery/prize-ceremony.webp',w:630,h:814,caption:"Celebrating a young learner's achievement",category:'events',label:'Achievement'},
  {url:'assets/gallery/art-activity.webp',w:622,h:821,caption:'Students exploring art and hands-on creativity',category:'activities',label:'Art activity'},
  {url:'assets/gallery/educational-trip.webp',w:627,h:805,caption:'Students learning beyond the classroom',category:'events',label:'Educational trip'},
  {url:'assets/gallery/taekwondo-medals.webp',w:637,h:815,caption:'Our students celebrating their Taekwondo achievements',category:'events',label:'Sports achievement'}
];
const INTRO = [{ url: 'assets/infrastructure/campus-building.webp', caption: 'A view of the school building' }, { url: 'assets/infrastructure/campus-courtyard.webp', caption: 'School campus and courtyard' }];
let photos = [...LOCAL_PHOTOS], gcat = '', gList = [];
async function loadHome() {
  drawGallery(); // show the built-in photos straight away, even if the server is slow or offline
  api('/gallery').then(g => { photos = [...LOCAL_PHOTOS, ...g]; drawGallery(); }).catch(() => {});
  try {
    const n = await api('/notices'), td = todayStr();
    const card = x => `<div class="card"><span class="tag">${esc(x.type || 'Notice')}</span><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p><small>${fmt(x.createdAt)}</small></div>`;
    const ann = n.filter(x => !['Event', 'Holiday', 'Achievement'].includes(x.type));
    $('#notices').innerHTML = ann.length ? ann.slice(0, 6).map(card).join('') : empty('No announcements right now.');
    const ev = n.filter(x => ['Event', 'Holiday'].includes(x.type) && x.date && x.date >= td).sort((a, b) => a.date < b.date ? -1 : 1).slice(0, 6);
    $('#events').innerHTML = ev.length ? ev.map(x => { const d = new Date(x.date + 'T00:00:00'); return `<div class="ev"><div class="date-chip"><b>${d.getDate()}</b><small>${d.toLocaleString('en-IN', { month: 'short' })}</small></div><div><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p></div></div>`; }).join('') : empty('No upcoming events right now.');
    const ac = n.filter(x => x.type === 'Achievement').slice(0, 6);
    $('#achievements').innerHTML = ac.length ? ac.map(x => `<div class="ach"><h3>🏅 ${esc(x.title)}</h3><p>${esc(x.body)}</p></div>`).join('') : empty('Our achievements will appear here.');
  } catch (e) { $('#notices').innerHTML = empty('Unable to load. Please refresh.'); }
}
const ZOOM = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M11 8.5v5M8.5 11h5"/></svg>';
function drawGallery() {
  gList = photos.filter(p => !gcat || p.category === gcat);
  $('#gallery').innerHTML = gList.length ? gList.map((p, i) => `<figure class="g-item" tabindex="0" role="button" data-i="${i}" aria-label="View photo: ${esc(p.caption || 'School photo')}"><img loading="lazy" src="${esc(p.url)}" alt="${esc(p.caption || 'School photo')}" ${p.w ? `width="${p.w}" height="${p.h}"` : 'style="aspect-ratio:3/4"'}><span class="g-zoom">${ZOOM}</span><figcaption><small>${esc(p.label || p.category || 'School life')}</small>${esc(p.caption)}</figcaption></figure>`).join('') : empty('Photos coming soon.');
}
// photos without known size get a placeholder ratio until they load
$('#gallery').addEventListener('load', e => { if (e.target.tagName === 'IMG') e.target.style.aspectRatio = ''; }, true);
$('#gcats').onclick = e => { if (e.target.dataset.c === undefined) return; gcat = e.target.dataset.c; $$('#gcats button').forEach(b => b.classList.toggle('on', b === e.target)); drawGallery(); };

// ---- Photo viewer (tap / click a photo to see it full size; arrows, swipe and Esc supported)
const lb = document.createElement('div');
lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Photo viewer');
lb.innerHTML = '<span class="lb-count"></span><button type="button" class="lb-btn lb-close" aria-label="Close photo">✕</button><button type="button" class="lb-btn lb-prev" aria-label="Previous photo">‹</button><figure><img alt=""><figcaption></figcaption></figure><button type="button" class="lb-btn lb-next" aria-label="Next photo">›</button>';
document.body.appendChild(lb);
const lbImg = lb.querySelector('img'), lbCap = lb.querySelector('figcaption'), lbCount = lb.querySelector('.lb-count');
let lbList = [], lbI = 0, lbOpener = null, lbX = null;
function lbShow() {
  const p = lbList[lbI]; if (!p) return;
  lb.classList.add('busy'); lbImg.onload = lbImg.onerror = () => lb.classList.remove('busy');
  lbImg.src = p.url; lbImg.alt = p.caption || 'School photo'; if (lbImg.complete) lb.classList.remove('busy');
  lbCap.textContent = p.caption || ''; lbCount.textContent = lbList.length > 1 ? `${lbI + 1} / ${lbList.length}` : '';
  lb.classList.toggle('single', lbList.length < 2);
  if (lbList.length > 1) [1, -1].forEach(d => { new Image().src = lbList[(lbI + d + lbList.length) % lbList.length].url; });
}
function lbOpen(list, i, from) { lbList = list; lbI = i; lbOpener = from || null; lb.classList.add('open'); document.body.classList.add('lb-open'); lbShow(); lb.querySelector('.lb-close').focus(); }
function lbClose() { if (!lb.classList.contains('open')) return; lb.classList.remove('open'); document.body.classList.remove('lb-open'); lbImg.removeAttribute('src'); if (lbOpener && lbOpener.focus) lbOpener.focus({ preventScroll: true }); }
const lbStep = d => { if (lbList.length < 2) return; lbI = (lbI + d + lbList.length) % lbList.length; lbShow(); };
lb.addEventListener('click', e => { if (e.target.closest('.lb-close')) lbClose(); else if (e.target.closest('.lb-prev')) lbStep(-1); else if (e.target.closest('.lb-next')) lbStep(1); else if (!e.target.closest('img, figcaption')) lbClose(); });
lb.addEventListener('touchstart', e => { lbX = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
lb.addEventListener('touchend', e => { if (lbX === null) return; const dx = e.changedTouches[0].clientX - lbX; lbX = null; if (Math.abs(dx) > 50) lbStep(dx < 0 ? 1 : -1); });
addEventListener('keydown', e => {
  if (!lb.classList.contains('open')) return;
  if (e.key === 'Escape') lbClose();
  else if (e.key === 'ArrowLeft') lbStep(-1);
  else if (e.key === 'ArrowRight') lbStep(1);
  else if (e.key === 'Tab') { // keep keyboard focus inside the viewer
    const f = [...lb.querySelectorAll('button')].filter(b => getComputedStyle(b).display !== 'none'); if (!f.length) return;
    const first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (!lb.contains(a) || (e.shiftKey && a === first)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); } else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }
});
function zoomable(host, getList) {
  const go = (e, f) => { if (f && host.contains(f)) { e.preventDefault(); lbOpen(getList(), +f.dataset.i, f); } };
  host.addEventListener('click', e => go(e, e.target.closest('[data-i]')));
  host.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') go(e, e.target.closest('[data-i]')); });
}
zoomable($('#gallery'), () => gList); zoomable($('.intro-collage'), () => INTRO);

// ---- Admission
$('#enqForm').onsubmit = async e => {
  e.preventDefault(); const m = $('#enqMsg');
  try { await api('/enquiries', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); say(m, 'Thank you! We will contact you soon.', true); e.target.reset(); }
  catch (x) { say(m, x.message, false); }
};

// ---- Teachers page
let tAll = [], tSub = '';
async function loadTeachers() { try { tAll = await api('/teachers'); drawTeachers(); } catch { $('#tList').innerHTML = empty('Unable to load teachers.'); } }
function drawTeachers() {
  const subs = [...new Set(tAll.flatMap(x => x.subjects))].sort();
  $('#tSubs').innerHTML = subs.length ? `<button data-s="" class="${tSub ? '' : 'on'}">All</button>` + subs.map(s => `<button data-s="${esc(s)}" class="${tSub === s ? 'on' : ''}">${esc(s)}</button>`).join('') : '';
  const l = tAll.filter(x => !tSub || x.subjects.includes(tSub));
  $('#tList').innerHTML = l.length ? l.map(x => `<div class="card">${x.hasPhoto ? `<img class="avatar" loading="lazy" src="/api/teachers/${x.id}/photo" alt="${esc(x.name)}">` : `<div class="avatar">${esc((x.name.trim()[0] || 'T').toUpperCase())}</div>`}<h3>${esc(x.name)}</h3>${x.subjects.map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div>`).join('') : empty('Our teachers will be listed here soon.');
}
$('#tSubs').onclick = e => { if (e.target.dataset.s === undefined) return; tSub = e.target.dataset.s; drawTeachers(); };

// ---- Downloads page
let dAll = [], dCat = '';
async function loadDocs() { try { dAll = await api('/docs'); drawDocs(); } catch { $('#dList').innerHTML = empty('Unable to load downloads.'); } }
function drawDocs() {
  const cats = [...new Set(dAll.map(d => d.category))];
  $('#dCats').innerHTML = cats.length ? `<button data-c="" class="${dCat ? '' : 'on'}">All</button>` + cats.map(c => `<button data-c="${esc(c)}" class="${dCat === c ? 'on' : ''}">${esc(c)}</button>`).join('') : '';
  const l = dAll.filter(d => !dCat || d.category === dCat);
  $('#dList').innerHTML = l.length ? l.map(d => `<div class="doc"><div><a href="/api/docs/${d._id}/file" target="_blank" rel="noopener">📄 ${esc(d.title)}</a><br><small>${esc(d.category)} · ${fmt(d.createdAt)}</small></div><a class="btn" style="padding:7px 16px" href="/api/docs/${d._id}/file" target="_blank" rel="noopener">Open</a></div>`).join('') : empty('No documents yet.');
}
$('#dCats').onclick = e => { if (e.target.dataset.c === undefined) return; dCat = e.target.dataset.c; drawDocs(); };

// ---- Students
let cls = '1', sub = '';
$('#classTabs').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8].map(c => `<button data-c="${c}" class="${c == 1 ? 'on' : ''}">Class ${c}</button>`).join('');
$('#classTabs').onclick = e => { if (!e.target.dataset.c) return; cls = e.target.dataset.c; sub = ''; $$('#classTabs button').forEach(b => b.classList.toggle('on', b === e.target)); loadHW(); };
$('#subTabs').onclick = e => { if (e.target.dataset.s === undefined) return; sub = e.target.dataset.s; loadHW(); };
async function loadHW() {
  try {
    const all = await api('/homework?classNo=' + cls), subs = [...new Set(all.map(h => h.subject))];
    $('#subTabs').innerHTML = subs.length ? `<button data-s="" class="${sub ? '' : 'on'}">All Subjects</button>` + subs.map(s => `<button data-s="${esc(s)}" class="${sub === s ? 'on' : ''}">${esc(s)}</button>`).join('') : '';
    const list = all.filter(h => !sub || h.subject === sub);
    $('#hw').innerHTML = list.length ? list.map(h => hwCard(h)).join('') : empty(`No homework posted for Class ${esc(cls)} yet.`);
  } catch { $('#hw').innerHTML = empty('Unable to load homework.'); }
}
const hwCard = (h, del) => `<div class="card"><div class="row"><span><span class="tag">${esc(h.subject)}</span>${Date.now() - new Date(h.createdAt) < 864e5 ? '<span class="tag new">New</span>' : ''}</span>${del ? `<button class="del" data-del="homework" data-id="${h._id}">Delete</button>` : ''}</div><h3>${esc(h.title)}</h3><p>${esc(h.details)}</p>${h.hasFile ? `<a class="pdf" href="/api/homework/${h._id}/file" target="_blank" rel="noopener">📄 ${esc(h.fileName || 'Homework PDF')}</a><br>` : ''}<small>${del ? 'Class ' + h.classNo + ' · ' : ''}By ${esc(h.teacherName)} · Posted ${fmt(h.createdAt)}${h.dueDate ? ' · Due ' + esc(h.dueDate) : ''}</small></div>`;

// ---- Staff portal
const onSubmit = (id, fn) => { const f = $(id); if (f) f.onsubmit = async e => { e.preventDefault(); try { await fn(e); } catch (x) { const m = f.querySelector('.msg'); m ? say(m, x.message, false) : alert(x.message); } }; };
const msgP = '<p class="msg"></p>';
const hwForm = () => `<h3 class="sec">Post Homework / Assignment</h3><form id="hf" class="card form"><label>Class<select name="classNo">${[1, 2, 3, 4, 5, 6, 7, 8].map(c => `<option value="${c}">Class ${c}</option>`).join('')}</select></label><label>Subject<select name="subject">${opts(me.subjects && me.subjects.length ? me.subjects : SUBJECTS)}</select></label><label>Title<input name="title" required maxlength="120"></label><label>Details<textarea name="details" rows="3" maxlength="1500"></textarea></label><label>Due Date<input type="date" name="dueDate"></label><label>Attach PDF (optional, max 5 MB)<input type="file" name="pdf" accept="application/pdf"></label><button class="btn">Post</button>${msgP}</form>`;
const pwForm = () => `<h3 class="sec">Change Password</h3><form id="pf" class="card form" style="max-width:420px"><label>Current password<input type="password" name="current" required autocomplete="current-password"></label><label>New password (min 6)<input type="password" name="password" minlength="6" required autocomplete="new-password"></label><button class="btn">Update Password</button>${msgP}</form>`;

function renderRegister() {
  if (token && me) { location.hash = '#staff'; return; }
  $('#regBox').innerHTML = `<div class="narrow auth-box"><p class="eyebrow dark">Teacher registration</p><h2>Register as a Teacher</h2><p class="auth-sub">Create your account. The Principal approves it before you can post homework, and your name and subjects then appear on the Our Teachers page.</p>
  <form id="rf" class="card form"><label>Full Name<input name="name" required maxlength="80" autocomplete="name"></label><label>Email<input name="email" type="email" required autocomplete="email"></label><label>Phone<input name="phone" type="tel" autocomplete="tel"></label><div><b style="font-size:.9rem">Subjects you teach</b><div class="checks" style="margin-top:6px">${checks()}</div></div><label>Password (min 6)<input name="password" type="password" minlength="6" required autocomplete="new-password"></label><label>Confirm password<input name="confirm" type="password" minlength="6" required autocomplete="new-password"></label><button class="btn">Create Account</button>${msgP}</form>
  <p class="auth-switch">Already registered? <a href="#staff">Login here</a></p></div>`;
  onSubmit('#rf', async e => {
    const fd = new FormData(e.target);
    if (fd.get('password') !== fd.get('confirm')) throw new Error('Passwords do not match');
    if (!fd.getAll('subjects').length) throw new Error('Please select at least one subject you teach');
    setSession(await api('/auth/register', { method: 'POST', body: { name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'), password: fd.get('password'), subjects: fd.getAll('subjects') } }));
    location.hash = '#staff';
  });
}

async function renderStaff(tok) {
  const box = $('#staffBox');
  if (tok) {
    box.innerHTML = `<div class="narrow" style="margin:auto"><h2>Set a new password</h2><form id="rsf" class="card form"><label>New password (min 6)<input type="password" name="password" minlength="6" required autocomplete="new-password"></label><button class="btn">Save Password</button>${msgP}</form></div>`;
    onSubmit('#rsf', async e => { await api('/auth/reset', { method: 'POST', body: { token: tok, password: e.target.password.value } }); say(e.target.querySelector('.msg'), 'Password updated! Redirecting to login...', true); setTimeout(() => { location.hash = '#staff'; }, 1500); });
    return;
  }
  if (token) { try { me = (await api('/auth/me')).user; localStorage.setItem('me', JSON.stringify(me)); } catch {} }
  if (!me) {
    box.innerHTML = `<div class="narrow auth-box"><p class="eyebrow dark">Staff area</p><h2>Staff Login</h2><p class="auth-sub">Principal and teachers, please sign in to continue.</p>
    <form id="lf" class="card form"><label>Email<input name="email" type="email" required autocomplete="username"></label><label>Password<input name="password" type="password" required autocomplete="current-password"></label><button class="btn">Login</button>${msgP}<button type="button" class="link" id="fg">Forgot password?</button></form>
    <form id="ff" class="card form" hidden><p>Enter your registered email and we will send a reset link.</p><label>Email<input name="email" type="email" required></label><button class="btn">Send reset link</button>${msgP}<button type="button" class="link" id="bk">Back to login</button></form>
    <p class="auth-switch">New teacher? <a href="#register">Create your teacher account</a></p></div>`;
    const show = id => ['#lf', '#ff'].forEach(x => $(x).hidden = x !== id);
    $('#fg').onclick = () => show('#ff'); $('#bk').onclick = () => show('#lf');
    onSubmit('#lf', async e => { setSession(await api('/auth/login', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) })); renderStaff(); });
    onSubmit('#ff', async e => { const r = await api('/auth/forgot', { method: 'POST', body: { email: e.target.email.value } }); say(e.target.querySelector('.msg'), r.configured ? 'If this email is registered, a reset link has been sent. Check your inbox.' : 'Email reset is not set up yet. Please ask the Principal to reset your password.', r.configured); });
    return;
  }
  const admin = me.role === 'admin';
  const welcomeName = admin ? SCHOOL.principal : me.name;
  const head = `<div class="dash-head"><div><p class="eyebrow dark">${admin ? 'Principal Dashboard' : 'Teacher Dashboard'}</p><h2 id="wlc">Welcome, ${esc(welcomeName)}</h2></div><div class="dash-actions">${admin ? '<button class="btn" id="rfh">Refresh</button>' : ''}<button class="btn on-light" id="lo">Logout</button></div></div>`;
  if (!admin) {
    box.innerHTML = head + (me.approved ? '' : '<p class="msg err">Your account is awaiting principal approval. You can post homework once approved.</p>') +
      `<h3 class="sec">My Profile (shown on Our Teachers page once approved)</h3><form id="prf" class="card form"><div class="grid2"><label>Full name<input name="name" value="${esc(me.name)}" required></label><label>Phone<input name="phone" type="tel" value="${esc(me.phone || '')}"></label></div><div><b style="font-size:.9rem">Subjects you teach</b><div class="checks" style="margin-top:6px">${checks(me.subjects || [])}</div></div><label>Profile photo (JPG, PNG, WebP)<input type="file" name="photo" accept="image/jpeg,image/png,image/webp"></label><button class="btn">Save Profile</button>${msgP}</form>` +
      hwForm() + '<h3 class="sec">My Posts</h3><div id="mine" class="cards"></div>' + pwForm();
    onSubmit('#prf', async e => { const fd = new FormData(e.target), pf = fd.get('photo'); if (pf && pf.size) fd.set('photo', await shrink(pf, 500), 'photo.jpg'); else fd.delete('photo'); const r = await api('/auth/profile', { method: 'PUT', body: fd }); me = r.user; localStorage.setItem('me', JSON.stringify(me)); $('#wlc').textContent = 'Welcome, ' + me.name; say(e.target.querySelector('.msg'), 'Profile saved!', true); });
    loadMine();
  } else {
    box.innerHTML = head + '<div class="stats" id="stats"></div>' +
      `<h3 class="sec">Post Announcement / Event / Achievement</h3><form id="nf" class="card form"><div class="grid2"><label>Type<select name="type">${opts(NOTICE_TYPES)}</select></label><label>Date (for Events / Holidays)<input type="date" name="date"></label></div><label>Title<input name="title" required maxlength="150"></label><label>Message<textarea name="body" rows="3"></textarea></label><button class="btn">Publish</button>${msgP}</form>
      <h3 class="sec">Upload Photos to Home Gallery</h3><form id="gf" class="card form"><label>Photos (select one or many — JPG, PNG, WebP)<input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple required></label><label>Caption (optional)<input name="caption" maxlength="120"></label><label>Category<select name="category"><option value="infrastructure">Campus</option><option value="activities">Activities</option><option value="events">Events &amp; Competitions</option><option value="creative">Creative learning</option></select></label><button class="btn">Upload</button>${msgP}</form>
      <h3 class="sec">Upload Document (Downloads page)</h3><form id="df" class="card form"><label>Title<input name="title" required maxlength="150"></label><label>Category<select name="category">${opts(DOC_CATS)}</select></label><label>PDF file (max 5 MB)<input type="file" name="file" accept="application/pdf" required></label><button class="btn">Upload</button>${msgP}</form>
      <div class="row head-row"><h3 class="sec" id="tth">Teachers</h3><button class="btn" data-dl="/admin/teachers.csv" data-name="sona-teachers-${todayStr()}.csv">⬇ Export Teachers List (Excel)</button></div><div class="tbl" id="tt"></div>
      <div class="row head-row"><h3 class="sec">Admission Enquiries</h3><button class="btn" data-dl="/admin/enquiries.csv" data-name="admission-enquiries.csv">Export to Excel (CSV)</button></div><div class="tbl" id="et"></div>
      <h3 class="sec">Announcements, Events &amp; Achievements</h3><div id="nl" class="cards"></div><h3 class="sec">Gallery</h3><div id="gl" class="cards"></div><h3 class="sec">Documents</h3><div id="dlist"></div>
      ${hwForm()}<h3 class="sec">All Homework</h3><div id="mine" class="cards"></div>${pwForm()}
      <h3 class="sec">Backup</h3><p>Download a copy of all text data (teachers, enquiries, notices, homework). Do this regularly.</p><button class="btn" data-dl="/admin/backup" data-name="sona-backup.json">Download Backup</button>`;
    $('#rfh').onclick = loadAdmin;
    onSubmit('#nf', async e => { await api('/notices', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); e.target.reset(); say(e.target.querySelector('.msg'), 'Published!', true); loadAdmin(); });
    onSubmit('#gf', async e => { const m = e.target.querySelector('.msg'), el = e.target.elements; say(m, 'Uploading...'); const fd = new FormData(); fd.append('caption', el.caption.value); fd.append('category', el.category.value); for (const f of el.photos.files) fd.append('photos', await shrink(f), f.name.replace(/\.\w+$/, '') + '.jpg'); await api('/gallery', { method: 'POST', body: fd }); e.target.reset(); say(m, 'Uploaded! Visible on the home page.', true); loadAdmin(); });
    onSubmit('#df', async e => { const m = e.target.querySelector('.msg'), fd = new FormData(e.target); if (fd.get('file').size > 5 * 1024 * 1024) throw new Error('PDF must be under 5 MB'); say(m, 'Uploading...'); await api('/docs', { method: 'POST', body: fd }); e.target.reset(); say(m, 'Uploaded!', true); loadAdmin(); });
    loadAdmin();
  }
  $('#lo').onclick = () => logout();
  onSubmit('#hf', async e => { const m = e.target.querySelector('.msg'), fd = new FormData(e.target), pf = fd.get('pdf'); if (pf && pf.size > 5 * 1024 * 1024) throw new Error('PDF must be under 5 MB'); say(m, 'Uploading...'); await api('/homework', { method: 'POST', body: fd }); e.target.reset(); say(m, 'Posted!', true); admin ? loadAdmin() : loadMine(); });
  onSubmit('#pf', async e => { await api('/auth/change-password', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); e.target.reset(); say(e.target.querySelector('.msg'), 'Password updated!', true); });
}
async function loadMine() { const l = await api('/homework/mine'); $('#mine').innerHTML = l.length ? l.map(h => hwCard(h, true)).join('') : empty('Nothing posted yet.'); }
async function loadAdmin() { try { await loadAdminData(); } catch (e) { $('#tt').innerHTML = '<div class="empty err">Could not load dashboard: ' + esc(e.message) + '</div>'; } }
async function loadAdminData() {
  const [t, en, n, g, h, d, st] = await Promise.all([api('/admin/teachers'), api('/admin/enquiries'), api('/notices'), api('/gallery'), api('/admin/homework'), api('/docs'), api('/admin/stats')]);
  $('#stats').innerHTML = [['Visitors', st.visits], ['Enquiries', st.enquiries], ['Teachers', st.teachers], ['Pending approval', st.pending]].map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('');
  t.sort((a, b) => a.approved - b.approved); const pend = t.filter(x => !x.approved).length;
  $('#tth').textContent = 'Teachers' + (pend ? ` — ${pend} pending approval` : '');
  $('#tt').innerHTML = `<table><tr><th>Name</th><th>Email</th><th>Phone</th><th>Subjects</th><th>Status</th><th></th></tr>${t.map(x => `<tr><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${esc(x.phone)}</td><td>${esc((x.subjects || []).join(', '))}</td><td>${x.approved ? 'Approved' : 'Pending'}</td><td><button class="del" style="color:var(--navy)" data-appr="${x._id || x.id}" data-v="${!x.approved}">${x.approved ? 'Revoke' : 'Approve'}</button> <button class="del" style="color:var(--navy)" data-pw="${x.id}">Reset password</button> <button class="del" data-del="admin/teachers" data-id="${x.id}">Remove</button></td></tr>`).join('') || '<tr><td colspan=6>No teachers yet</td></tr>'}</table>`;
  $('#et').innerHTML = `<table><tr><th>Date</th><th>Student</th><th>Class</th><th>Phone</th><th>Email</th><th></th></tr>${en.map(x => `<tr><td>${fmt(x.createdAt)}</td><td>${esc(x.studentName)}</td><td>${esc(x.classApplying)}</td><td>${esc(x.phone)}</td><td>${esc(x.email)}</td><td><button class="del" data-del="admin/enquiries" data-id="${x._id}">Delete</button></td></tr>`).join('') || '<tr><td colspan=6>No enquiries yet</td></tr>'}</table>`;
  $('#nl').innerHTML = n.map(x => `<div class="card"><div class="row"><span class="tag">${esc(x.type)}</span><button class="del" data-del="notices" data-id="${x._id}">Delete</button></div><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p><small>${x.date ? 'Date: ' + esc(x.date) : fmt(x.createdAt)}</small></div>`).join('') || empty('None');
  $('#gl').innerHTML = g.map(x => `<div class="card"><img src="${esc(x.url)}" alt="" style="width:100%;height:120px;object-fit:cover;border-radius:8px"><div class="row"><small>${esc(x.caption)} (${esc(x.category)})</small><button class="del" data-del="gallery" data-id="${x._id}">Delete</button></div></div>`).join('') || empty('None');
  $('#dlist').innerHTML = d.map(x => `<div class="doc"><div><a href="/api/docs/${x._id}/file" target="_blank" rel="noopener">📄 ${esc(x.title)}</a><br><small>${esc(x.category)}</small></div><button class="del" data-del="docs" data-id="${x._id}">Delete</button></div>`).join('') || empty('None');
  $('#mine').innerHTML = h.map(x => hwCard(x, true)).join('') || empty('None');
}
$('#staffBox').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  try {
    if (d.dl) { await dl(d.dl, d.name); return; }
    if (d.pw) { if (!confirm('Generate a new temporary password for this teacher?')) return; const r = await api('/admin/teachers/' + d.pw + '/reset', { method: 'POST' }); alert('Temporary password: ' + r.password + '\n\nShare it with the teacher and ask them to change it after login.'); return; }
    if (!d.del && !d.appr) return;
    if (d.del && !confirm('Delete this item?')) return;
    if (d.appr) await api('/admin/teachers/' + d.appr, { method: 'PATCH', body: { approved: d.v === 'true' } });
    else await api('/' + d.del + '/' + d.id, { method: 'DELETE' });
    me.role === 'admin' ? loadAdmin() : loadMine();
  } catch (x) { alert(x.message); }
});
route();
