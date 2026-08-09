/* Load order: supabase.js -> site.js -> page script -> fx.js -> preview fallback */

var EMBED = (function () { try { return window.self !== window.top; } catch (e) { return true; } })();

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* profile.data values can arrive as arrays or objects; only strings are usable as text. */
function txt(v) {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.map(function (x) { return txt(x); }).filter(Boolean).join(', ');
  return '';
}
function toList(v) {
  if (Array.isArray(v)) return v.map(function (x) { return txt(x); }).filter(Boolean);
  return txt(v).split(',').map(function (x) { return x.trim(); }).filter(Boolean);
}
function softHtml(v) { return esc(txt(v)).replace(/\n/g, '<br>'); }

function soopAvatar(id) {
  id = txt(id).toLowerCase();
  if (id.length < 2) return '';
  return 'https://profile.img.sooplive.co.kr/LOGO/' + id.slice(0, 2) + '/' + id + '/' + id + '.jpg';
}
function fmtDate(s) {
  try {
    var d = new Date(s);
    if (isNaN(d)) return '';
    return String(d.getFullYear()).slice(2) + '.' +
      String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  } catch (e) { return ''; }
}
/* accepts 1220 / 12.20 / 2026-12-20 -> MM-DD for fxDday */
function parseMMDD(v) {
  var s = txt(v).replace(/[^0-9]/g, '');
  if (s.length === 8) s = s.slice(4);
  if (s.length !== 4) return '';
  return s.slice(0, 2) + '-' + s.slice(2);
}

function setText(ids, d) {
  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    var v = txt(d[id]);
    if (v) el.textContent = v;
  });
}
function setLinks(d, keys) {
  keys.forEach(function (k) {
    var a = document.getElementById(k);
    if (a && txt(d[k])) a.href = txt(d[k]);
  });
}
function setImg(id, v) {
  var el = document.getElementById(id);
  if (!el) return;
  var s = txt(v);
  if (!s) return;
  el.src = s;
  el.style.display = 'block';
}
function renderChips(id, v, cls) {
  var el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = toList(v).map(function (t) {
    return '<span class="chip ' + (cls || '') + '">' + esc(t) + '</span>';
  }).join('');
}
function renderTags(id, v) { renderChips(id, v, 'tagchip'); }

/* days CSV is 0=Mon ... 6=Sun, matching the admin checkboxes and #day-0..#day-6 */
function renderDays(v) {
  var on = toList(v);
  for (var i = 0; i <= 6; i++) {
    var cell = document.getElementById('day-' + i);
    if (cell) cell.classList.toggle('on', on.indexOf(String(i)) >= 0);
  }
}

/* page heading keys: {slug}-kicker / {slug}-sub -> #hd-kicker / #hd-sub */
function applyHeading(slug, d) {
  [['hd-kicker', slug + '-kicker'], ['hd-sub', slug + '-sub']].forEach(function (p) {
    var el = document.getElementById(p[0]);
    var v = txt(d[p[1]]);
    if (el && v) el.textContent = v;
  });
}

/* one profile read shared by every script on the page */
window.profileData = (function () {
  if (typeof db === 'undefined' || !db) return Promise.resolve({});
  return db.from('profile').select('data').eq('id', 1)
    .then(function (r) { return (r && r.data && r.data[0] && r.data[0].data) || {}; })
    .catch(function () { return {}; });
})();

/* supabase.js provides showToast; this fallback keeps standalone preview files working. */
if (typeof window.showToast !== 'function') {
  window.showToast = function (msg, duration) {
    var t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast'; t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, duration || 2500);
  };
}

/* An admin-set loading face overrides the bundled crop before fx.js builds the cover. */
window.profileData.then(function (d) {
  var v = txt((d || {})['loader-img']);
  if (v) window.FX_LOADER_IMG = v;
}).catch(function () {});

/* ---------- dark mode ---------- */

(function () {
  var btn = document.getElementById('themeSwitch');
  if (!btn) return;
  function paint() {
    var k = document.getElementById('themeKnob');
    if (k) k.textContent = document.body.classList.contains('dark') ? '🌙' : '🍋';
  }
  btn.onclick = function () {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
    paint();
  };
  paint();
})();

/* ---------- inquiry modal ---------- */

var LAST_Y = 0;
document.addEventListener('click', function (e) { if (e.pageY) LAST_Y = e.pageY; }, true);

/* fixed inside an iframe is measured against the whole frame box (thousands of px in the
   SOOP app), so overlays are anchored to the last click instead. */
function placeMask(el) {
  if (!EMBED || !el) return;
  var inner = el.querySelector('.iq-modal, .modal');
  var dh = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  el.style.height = dh + 'px';
  var ih = inner ? inner.offsetHeight : 280;
  var y = Math.round(Math.max(16, Math.min(LAST_Y - ih / 2, dh - ih - 16)));
  if (inner) inner.style.marginTop = y + 'px';
}

function openInquiry() {
  var m = document.getElementById('iq-ov');
  if (!m) return;
  m.classList.add('show');
  placeMask(m);
}
function closeInquiry() {
  var m = document.getElementById('iq-ov');
  if (m) m.classList.remove('show');
}
async function sendInquiry() {
  var t = document.getElementById('iq-msg');
  var n = document.getElementById('iq-nick');
  var v = (t && t.value || '').trim();
  if (!v) { showToast('내용을 입력해 주세요'); return; }
  var row = { message: v };
  if (n && n.value.trim()) row.nickname = n.value.trim();
  var ok = false;
  try { ok = await insertRow('inquiries', row); } catch (e) { ok = false; }
  if (ok) {
    t.value = ''; if (n) n.value = '';
    closeInquiry();
    showToast('온실 문에 쪽지를 꽂아뒀어요');
  } else {
    showToast('전송에 실패했어요. 잠시 후 다시 시도해 주세요');
  }
}

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  closeInquiry();
  if (typeof closeModal === 'function') closeModal();
});
