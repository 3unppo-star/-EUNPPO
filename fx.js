

/* Per-site shapes. FX_CLICK also accepts data: / https: image URLs. */
var FX_FLOAT = ['\uD83C\uDF4B','\u2726','\uD83C\uDF3F','\u2727','\uD83C\uDF4B','\u2726'];
var FX_CLICK = '\uD83C\uDF4B';
var FX_COUNT = 16;
var FX_TILT  = true;

var FX_LOADER      = true;
/* Circular loading avatar: a zoomed face crop. Resolved against fx.js's own location so
   subfolder pages get the same file. */
var FX_LOADER_IMG  = 'assets/loader.jpg';
var FX_BASE = (function () {
  var sc = document.currentScript;
  if (!sc) { var all = document.getElementsByTagName('script'); sc = all[all.length - 1]; }
  return (sc && sc.src ? sc.src.replace(/[^/]*$/, '') : '');
})();
var FX_LOADER_TEXT = '';
var FX_TRANS_MS    = 460;

(function () {
  var mqReduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mqFine   = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;

  var css = `
    body::before{ display:none !important; }
    #fx{ position:fixed; inset:0; z-index:0; pointer-events:none; overflow:hidden; }
    .fx-p{ position:absolute; top:-26px; color:var(--main); opacity:0; will-change:transform,opacity; animation:fxFall linear infinite; }
    @keyframes fxFall{
      0%{ transform:translateY(-26px) translateX(0) rotate(0); opacity:0; }
      12%{ opacity:.5; } 88%{ opacity:.4; }
      100%{ transform:translateY(103vh) translateX(var(--drift,20px)) rotate(210deg); opacity:0; }
    }
    .container, .wrap{ perspective:1300px; }
    .card{ transition:transform .25s ease, box-shadow .25s ease; will-change:transform; }
    .fx-tilting{ box-shadow:var(--shadow-hover, 0 16px 36px rgba(31,60,90,.16)); }
    .fx-heart{ position:fixed; z-index:500; pointer-events:none; color:var(--main); transform:translate(-50%,-50%); animation:fxHeart .95s ease-out forwards; }
    @keyframes fxHeart{
      0%{ opacity:0; transform:translate(-50%,-50%) scale(.4); }
      18%{ opacity:.85; }
      100%{ opacity:0; transform:translate(calc(-50% + var(--hx,0px)), calc(-50% - 62px)) scale(1.05); }
    }
    @media (prefers-reduced-motion: reduce){ #fx{ display:none; } .card{ transition:none; } .fx-heart{ display:none; } }

    
    #fxload{ position:fixed; inset:0; z-index:9999; display:grid; place-items:center; background:var(--ep-paper, var(--bg, #fffdf6)); transition:opacity .28s ease; }
    #fxload .fxload-box{ position:relative; display:flex; flex-direction:column; align-items:center; gap:18px; }
    /* the caption stack hangs below so the avatar stays on the exact centre line */
    #fxload .fxload-name, #fxload .fxload-dots{ position:absolute; left:50%; transform:translateX(-50%); }
    #fxload .fxload-name{ top:calc(100% + 24px); white-space:nowrap; }
    #fxload .fxload-dots{ top:calc(100% + 64px); }
    #fxload.fx-hide{ opacity:0; pointer-events:none; }
    #fxload.fx-hide .fxload-av, #fxload.fx-hide .fxload-dots i{ animation-play-state:paused; }
    #fxload .fxload-av{ width:190px; height:190px; border-radius:50%; border:6px solid var(--ep-paper, #fffdf6); background:var(--ep-week, #f1f7e9); background-size:cover; background-position:center; display:flex; align-items:center; justify-content:center; font-size:46px; font-weight:800; color:var(--main-dark); box-shadow:0 14px 34px rgba(83,98,83,.16); animation:fxBob 1.5s ease-in-out infinite; }
    #fxload .fxload-av.mascot{ width:200px; height:200px; border-radius:0; background-color:transparent; background-size:contain; background-repeat:no-repeat; box-shadow:none; filter:drop-shadow(0 12px 22px rgba(0,0,0,.16)); }
    @keyframes fxBob{ 0%,100%{ transform:translateY(0) scale(1); } 50%{ transform:translateY(-7px) scale(1.015); } }
    #fxload .fxload-name{ font-weight:800; font-size:21px; color:var(--ep-ink, #35513a); letter-spacing:.02em; }
    #fxload .fxload-dots{ display:flex; gap:7px; }
    #fxload .fxload-dots i{ width:9px; height:9px; border-radius:50%; background:var(--ep-leaf, #9db27d); display:block; animation:fxDot 1.1s ease-in-out infinite; }
    #fxload .fxload-dots i:nth-child(2){ animation-delay:.15s; }
    #fxload .fxload-dots i:nth-child(3){ animation-delay:.3s; }
    @keyframes fxDot{ 0%,100%{ opacity:.3; transform:translateY(0); } 40%{ opacity:1; transform:translateY(-7px); } }
    .fx-enter{ animation:fxPop var(--fx-trans,.46s) cubic-bezier(.22,.68,.28,1) both; transform-origin:50% 0; }
    @keyframes fxPop{ from{ opacity:0; transform:scale(.985) translateY(8px); } to{ opacity:1; transform:none; } }
    @media (prefers-reduced-motion: reduce){ #fxload .fxload-av, #fxload .fxload-dots i{ animation:none !important; } .fx-enter{ animation:none !important; } }
  `;
  var st = document.createElement('style'); st.id = 'fx-style'; st.textContent = css; document.head.appendChild(st);

  
  var loaderOn = FX_LOADER && !mqReduce;
  var fxLoadEl = null, shownAt = 0;
  document.documentElement.style.setProperty('--fx-trans', (FX_TRANS_MS || 800) + 'ms');

  function buildLoader() {
    if (!loaderOn || fxLoadEl || !document.body) return;
    var el = document.createElement('div'); el.id = 'fxload'; el.setAttribute('aria-hidden', 'true');
    var av = document.createElement('div'); av.className = 'fxload-av';
    var ch = (getComputedStyle(document.body).getPropertyValue('--char') || '').trim();
    var img = FX_LOADER_IMG;
    if (!img) {
      var ico = document.querySelector('link[rel~="icon"]');
      if (ico && ico.href && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(ico.href)) img = ico.href;
    }
    var logoEl = document.querySelector('.nav-name') || document.querySelector('.nav-logo');
    var logoTxt = ((logoEl && logoEl.firstChild ? logoEl.firstChild.textContent : '') || document.title || '').trim();
    var LIMG = window.FX_LOADER_IMG || FX_LOADER_IMG;
    if (LIMG)                     av.style.backgroundImage = 'url("' + (/^(data:|https?:|\/)/.test(LIMG) ? LIMG : FX_BASE + LIMG) + '")';
    else if (ch && ch !== 'none') { av.style.backgroundImage = ch; av.classList.add('mascot'); }
    else if (img)                av.style.backgroundImage = 'url("' + img + '")';
    else                         av.textContent = (FX_LOADER_TEXT || logoTxt || '✿').charAt(0) || '✿';
    var nm = document.createElement('div'); nm.className = 'fxload-name';
    nm.textContent = (FX_LOADER_TEXT || logoTxt || '');
    var dt = document.createElement('div'); dt.className = 'fxload-dots'; dt.innerHTML = '<i></i><i></i><i></i>';
    var box = document.createElement('div'); box.className = 'fxload-box';
    box.appendChild(av); if (nm.textContent) box.appendChild(nm); box.appendChild(dt);
    el.appendChild(box);
    document.body.appendChild(el); fxLoadEl = el; shownAt = Date.now();
  }

  var revealed = false;
  function revealPage() {
    if (!loaderOn || revealed) return;
    revealed = true;
    var wait = Math.max(0, 140 - (Date.now() - shownAt));
    setTimeout(function () {
      var w = document.querySelector('.wrap, .container, main');
      if (w) {
        w.classList.remove('fx-enter'); void w.offsetWidth; w.classList.add('fx-enter');
        w.addEventListener('animationend', function once(){
          w.removeEventListener('animationend', once);
          w.classList.remove('fx-enter');
          w.style.transform = 'none';     /* a lingering transform would capture fixed children */
        });
      }
      if (fxLoadEl) fxLoadEl.classList.add('fx-hide');
    }, wait);
  }

  if (loaderOn) {
    if (document.body) buildLoader(); else document.addEventListener('DOMContentLoaded', buildLoader);
    /* Reveal as soon as the markup is parsed. Waiting for window.load kept the cover up
       until every photo finished downloading. A hard cap guards slow assets. */
    if (document.readyState !== 'loading') revealPage();
    else document.addEventListener('DOMContentLoaded', revealPage);
    window.addEventListener('load', revealPage);
    setTimeout(revealPage, 900);
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]'); if (!a) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      var href = a.getAttribute('href') || '';
      if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return;
      var url; try { url = new URL(a.href, location.href); } catch (_) { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && (url.hash || url.href === location.href)) return;
      e.preventDefault();
      if (!fxLoadEl) buildLoader();
      if (fxLoadEl) { fxLoadEl.classList.remove('fx-hide'); shownAt = Date.now(); revealed = false; }
      setTimeout(function () { location.href = a.href; }, 190);
    }, true);
  }

  function build() {
    
    if (!mqReduce) {
      var fx = document.getElementById('fx');
      if (!fx) { fx = document.createElement('div'); fx.id = 'fx'; fx.setAttribute('aria-hidden','true'); document.body.appendChild(fx); }
      if (!fx.childElementCount) {
        for (var i = 0; i < FX_COUNT; i++) {
          var p = document.createElement('span'); p.className = 'fx-p';
          p.textContent = FX_FLOAT[(Math.random() * FX_FLOAT.length) | 0];
          var dur = 13 + Math.random() * 11;
          p.style.left = (Math.random() * 100).toFixed(2) + 'vw';
          p.style.fontSize = (9 + Math.random() * 7).toFixed(1) + 'px';
          p.style.animationDuration = dur.toFixed(1) + 's';
          p.style.animationDelay = (-Math.random() * dur).toFixed(1) + 's';
          p.style.setProperty('--drift', (Math.random() * 60 - 30).toFixed(0) + 'px');
          fx.appendChild(p);
        }
      }
    }
    
    if (FX_TILT && mqFine && !mqReduce && !window.__fxTiltOn) {
      window.__fxTiltOn = true;
      var TILT_SEL = '.card, .item-card, .viewer-card, .notice-item, .up-item, .vod-ph';
      var TILT_DEG = 2.5;
      var _tiltEl = null;
      document.addEventListener('mousemove', function (e) {
        var card = e.target.closest ? e.target.closest(TILT_SEL) : null;
        if (_tiltEl && _tiltEl !== card) { _tiltEl.style.transform = ''; _tiltEl.classList.remove('fx-tilting'); _tiltEl = null; }
        if (!card) return;
        var r = card.getBoundingClientRect();
        var rx = (0.5 - (e.clientY - r.top) / r.height) * TILT_DEG;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * TILT_DEG;
        card.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
        card.classList.add('fx-tilting');
        _tiltEl = card;
      }, { passive: true });
      document.addEventListener('mouseleave', function () {
        if (_tiltEl) { _tiltEl.style.transform = ''; _tiltEl.classList.remove('fx-tilting'); _tiltEl = null; }
      });
    }
    
    var av = document.querySelector('.avatar-wrap, #avatarWrap, .avatar');
    if (av && !av.dataset.fxPop) {
      av.dataset.fxPop = '1'; av.style.cursor = 'pointer';
      av.addEventListener('click', function (e) { window.fxHearts(e.clientX, e.clientY, 10); });
    }
  }

  
  window.fxHearts = function (x, y, n) {
    if (mqReduce) return;
    for (var i = 0; i < n; i++) {
      var h = document.createElement('span'); h.className = 'fx-heart';
      var _sz = (14 + Math.random() * 10);
      if (/^data:|^https?:\/\//i.test(FX_CLICK)) {
        h.style.width = _sz.toFixed(0) + 'px'; h.style.height = _sz.toFixed(0) + 'px';
        h.style.backgroundImage = 'url("' + FX_CLICK + '")';
        h.style.backgroundSize = 'contain'; h.style.backgroundRepeat = 'no-repeat'; h.style.backgroundPosition = 'center';
      } else { h.textContent = FX_CLICK; h.style.fontSize = _sz.toFixed(0) + 'px'; }
      h.style.left = x + 'px'; h.style.top = y + 'px';
      h.style.setProperty('--hx', (Math.random() * 64 - 32).toFixed(0) + 'px');
      h.style.animationDelay = (Math.random() * 0.12).toFixed(2) + 's';
      document.body.appendChild(h);
      (function (el) { setTimeout(function () { el.remove(); }, 1200); })(h);
    }
  };

  
  window.fxDday = function (mmdd) {
    try {
      var t = String(mmdd).split(/[-./]/); var m = parseInt(t[0],10), d = parseInt(t[1],10);
      if (!m || !d) return null;
      var now = new Date(); now.setHours(0,0,0,0);
      var y = now.getFullYear(); var next = new Date(y, m-1, d);
      if (next < now) next = new Date(y+1, m-1, d);
      return Math.round((next - now) / 86400000);
    } catch (e) { return null; }
  };

  
  document.addEventListener('click', function (e) {
    if (e.target.closest('input, textarea, button, a, .iq-modal, .iq-ov, .avatar-wrap, #avatarWrap, .avatar')) return;
    window.fxHearts(e.clientX, e.clientY, 4);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
