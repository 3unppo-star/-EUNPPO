/* Spinning wheel. Items are edited on the page, not in the admin, and kept in
   localStorage so they survive a refresh.
   Labels sit on a radius bar that rotates with the slice; slices past the halfway
   point are flipped so text never reads upside down. */

(function () {
  var KEY = 'eunppo-wheel-items';
  var DEFAULT = ['이 벌칙 통과', '노래 한 곡', '춤 추기', '성대모사', '즉석 퀴즈', '아무거나'];
  var items = [], angle = 0, spinning = false, raf = 0;

  function $(id) { return document.getElementById(id); }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      items = raw ? JSON.parse(raw) : DEFAULT.slice();
    } catch (e) { items = DEFAULT.slice(); }
    if (!Array.isArray(items) || items.length < 2) items = DEFAULT.slice();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {} }

  function hue(i) { return Math.round((360 / items.length) * i); }

  function build() {
    var wheel = $('wh-wheel');
    var n = items.length, step = 360 / n;
    var stops = items.map(function (_, i) {
      return 'hsl(' + hue(i) + ' 62% ' + (i % 2 ? 82 : 90) + '%) ' + (step * i) + 'deg ' + (step * (i + 1)) + 'deg';
    }).join(',');
    wheel.style.background = 'conic-gradient(from 0deg,' + stops + ')';

    var labels = $('wh-labels');
    labels.innerHTML = items.map(function (t, i) {
      var mid = step * i + step / 2 - 90;          /* 0deg points right */
      /* the bar carries the label out to the slice centre, then the text is turned
         back so every label reads horizontally */
      return '<div class="wh-bar" style="transform:rotate(' + mid + 'deg)">' +
             '<span style="transform:rotate(' + (-mid) + 'deg)">' + esc(t) + '</span></div>';
    }).join('');

    var list = $('wh-list');
    list.innerHTML = items.map(function (t, i) {
      return '<li><i style="background:hsl(' + hue(i) + ' 62% 74%)"></i>' +
        '<input class="wh-in" data-i="' + i + '" value="' + esc(t) + '">' +
        '<button class="wh-del" data-del="' + i + '" title="삭제">✕</button></li>';
    }).join('');
    $('wh-count').textContent = items.length + '칸';
  }

  function spin() {
    if (spinning || items.length < 2) return;
    spinning = true;
    $('wh-result').style.display = 'none';
    var turns = 6 + Math.random() * 3;
    var target = angle + turns * 360 + Math.random() * 360;
    var from = angle, t0 = performance.now(), dur = 4200;
    cancelAnimationFrame(raf);
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - p, 4);            /* ease out, long tail */
      angle = from + (target - from) * e;
      $('wh-wheel').style.transform = 'rotate(' + angle + 'deg)';
      $('wh-labels').style.transform = 'rotate(' + angle + 'deg)';
      if (p < 1) raf = requestAnimationFrame(step);
      else { spinning = false; announce(); }
    })(t0);
  }

  /* the pointer sits at the top, so the winning slice is the one under -90deg */
  function announce() {
    var step = 360 / items.length;
    var norm = ((angle % 360) + 360) % 360;
    var idx = Math.floor(((360 - norm) % 360) / step);
    var box = $('wh-result');
    box.innerHTML = '<span class="wl">당첨</span><b>' + esc(items[idx]) + '</b>';
    box.style.display = 'flex';
    if (typeof fxHearts === 'function') {
      var r = $('wh-wheel').getBoundingClientRect();
      fxHearts(r.left + r.width / 2, r.top + r.height / 2 + window.scrollY, 14);
    }
  }

  window.initWheel = function () {
    if (!$('wh-wheel')) return;
    load(); build();
    $('wh-spin').onclick = spin;
    $('wh-add').onclick = function () {
      if (items.length >= 12) { showToast && showToast('최대 12칸까지예요'); return; }
      items.push('새 항목'); save(); build();
    };
    $('wh-reset').onclick = function () {
      items = DEFAULT.slice(); save(); build();
      $('wh-result').style.display = 'none';
    };
    $('wh-list').addEventListener('input', function (e) {
      var el = e.target.closest('.wh-in'); if (!el) return;
      items[+el.dataset.i] = el.value; save();
      var step = 360 / items.length;
      var bar = $('wh-labels').children[+el.dataset.i];
      if (bar) bar.querySelector('span').textContent = el.value;
    });
    $('wh-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-del]'); if (!b) return;
      if (items.length <= 2) { showToast && showToast('2칸 아래로는 못 줄여요'); return; }
      items.splice(+b.dataset.del, 1); save(); build();
    });
  };
})();
