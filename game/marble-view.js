/* Marble roulette view: camera, minimap, ranking and the winner overlay.
   Physics lives in marble.js; this file only draws and drives it.
   Original behaviour kept: camera follows the deciding marble, the last stretch
   before the goal zooms in and slows down, stuck marbles are shaken. */

(function () {
  var ZOOM = 20;                 /* original 30; widened so more of the course is visible */
  var GOAL_SLOW_RANGE = 5;       /* original zoomThreshold */

  var cv, ctx, mini, mctx;
  var world = null, raf = 0, speed = 0.5, running = false;
  var stageIndex = 0, winnerMode = 'first', winnerCount = 1, useSkill = false;
  var camY = 0, camZoom = ZOOM, lastT = 0, carry = 0;

  function $(id) { return document.getElementById(id); }
  function stage() { return window.STAGES[stageIndex]; }

  function css(name, fb) {
    var v = getComputedStyle(document.body).getPropertyValue(name).trim();
    return v || fb;
  }

  function fitCanvas() {
    var box = cv.parentElement.getBoundingClientRect();
    var w = Math.max(280, Math.floor(box.width));
    var h = Math.round(w * 9 / 16);
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cv._w = w; cv._h = h;
  }

  function build() {
    var names = window.MarbleGame.parseNames($('mr-names').value);
    if (names.length < 2) { showToast && showToast('참가자를 2명 이상 적어주세요'); return false; }
    world = new window.MarbleGame.World(stageIndex, names, { skill: useSkill });
    camY = world.marbles[0].y; camZoom = ZOOM;
    renderRank();
    return true;
  }

  function start() {
    if (!world && !build()) return;
    world.start(); running = true; lastT = performance.now(); carry = 0;
    $('mr-start').textContent = '다시 시작';
    loop();
  }

  function reset() {
    running = false; cancelAnimationFrame(raf);
    world = null; $('mr-start').textContent = '시작하기';
    $('mr-winner').style.display = 'none';
    if (build()) draw();
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    var now = performance.now();
    var dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (running && world) {
      var slow = nearGoal() ? 0.2 : 1;
      /* leftover time carries to the next frame; a plain while-loop always ran one
         step per frame and made the speed setting do nothing */
      carry += dt * speed * slow;
      var guard = 0;
      while (carry >= 1 / 60 && guard < 20) { world.step(1 / 60); carry -= 1 / 60; guard++; }
      if (guard >= 20) carry = 0;
      if (world.allDone()) { running = false; showWinner(); }
      renderRank();
    }
    draw();
  }

  /* the marble that decides the result - the one the camera should watch */
  function decider() {
    if (!world) return null;
    var live = world.marbles.filter(function (m) { return !m.done; });
    if (!live.length) return null;
    if (winnerMode === 'last') {
      return live.reduce(function (a, b) { return a.y < b.y ? a : b; });
    }
    return live.reduce(function (a, b) { return a.y > b.y ? a : b; });
  }

  function nearGoal() {
    var d = decider();
    return !!d && (world.goalY - d.y) < GOAL_SLOW_RANGE;
  }

  function draw() {
    if (!ctx) return;
    var W = cv._w, H = cv._h;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = css('--ep-paper', '#fffdf6');
    ctx.fillRect(0, 0, W, H);
    if (!world) { hint(W, H); return; }

    var d = decider();
    var wantZoom = nearGoal() ? ZOOM * 1.9 : ZOOM;
    camZoom += (wantZoom - camZoom) * 0.06;
    var wantY = d ? d.y : camY;
    camY += (wantY - camY) * 0.12;

    ctx.save();
    ctx.translate(W / 2, H * 0.38);
    ctx.scale(camZoom * (W / 900), camZoom * (W / 900));
    ctx.translate(-12, -camY);

    drawStage();
    drawGoal();
    drawMarbles();
    ctx.restore();

    drawMinimap();
  }

  function hint(W, H) {
    ctx.fillStyle = css('--ep-muted', '#84907e');
    ctx.font = '600 15px Pretendard, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('참가자를 적고 시작하기를 누르면 구슬이 굴러갑니다', W / 2, H / 2);
    ctx.textAlign = 'left';
  }

  function drawStage() {
    var items = world.built.items;
    var line = css('--ep-ink', '#35513a');
    var fill = css('--ep-leaf', '#9db27d');
    ctx.lineWidth = 0.12;
    ctx.lineCap = 'round';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.dead) continue;
      if (it.shape.type === 'circle') {
        ctx.beginPath();
        ctx.arc(it.ox, it.oy, it.radius, 0, Math.PI * 2);
        ctx.fillStyle = it.life !== Infinity ? css('--ep-yellow', '#efb53d') : fill;
        ctx.globalAlpha = it.life !== Infinity ? 0.75 : 1;
        ctx.fill();
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.strokeStyle = it.kinematic ? css('--ep-forest', '#4f6949') : line;
      ctx.beginPath();
      for (var s = 0; s < it.world.length; s++) {
        var W2 = it.world[s];
        ctx.moveTo(W2[0], W2[1]); ctx.lineTo(W2[2], W2[3]);
      }
      ctx.stroke();
    }
  }

  function drawGoal() {
    ctx.save();
    ctx.strokeStyle = css('--ep-yellow', '#efb53d');
    ctx.lineWidth = 0.18;
    ctx.setLineDash([0.5, 0.4]);
    ctx.beginPath();
    ctx.moveTo(-40, world.goalY); ctx.lineTo(60, world.goalY);
    ctx.stroke();
    ctx.restore();
  }

  function drawMarbles() {
    var ms = world.marbles;
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (m.done) continue;
      ctx.beginPath();
      ctx.arc(m.x, m.y, window.MarbleGame.R, 0, Math.PI * 2);
      ctx.fillStyle = 'hsl(' + m.hue + ' 78% 62%)';
      ctx.fill();
      ctx.lineWidth = 0.05;
      ctx.strokeStyle = 'rgba(40,60,40,.55)';
      ctx.stroke();
      if (useSkill) {                       /* cool-time ring, as in the original */
        var p = 1 - Math.max(0, m.cool) / m.maxCool;
        ctx.beginPath();
        ctx.arc(m.x, m.y, window.MarbleGame.R + 0.07, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
        ctx.lineWidth = 0.06;
        ctx.strokeStyle = css('--ep-yellow', '#efb53d');
        ctx.stroke();
      }
      ctx.save();
      ctx.scale(0.03, 0.03);
      ctx.font = '700 11px Pretendard, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = css('--ep-ink', '#35513a');
      ctx.fillText(m.name, m.x / 0.03, (m.y - 0.42) / 0.03);
      ctx.restore();
    }
  }

  function drawMinimap() {
    if (!mctx || !world) return;
    var w = mini.width, h = mini.height;
    mctx.clearRect(0, 0, w, h);
    mctx.fillStyle = css('--ep-week', '#f1f7e9');
    mctx.fillRect(0, 0, w, h);
    var top = -2, bottom = world.goalY + 2;
    var sy = h / (bottom - top);
    mctx.strokeStyle = css('--ep-yellow', '#efb53d');
    mctx.beginPath();
    mctx.moveTo(0, (world.goalY - top) * sy); mctx.lineTo(w, (world.goalY - top) * sy);
    mctx.stroke();
    world.marbles.forEach(function (m) {
      if (m.done) return;
      mctx.beginPath();
      mctx.arc(w / 2 + (m.x - 12) * (w / 46), (m.y - top) * sy, 2.2, 0, Math.PI * 2);
      mctx.fillStyle = 'hsl(' + m.hue + ' 78% 55%)';
      mctx.fill();
    });
  }

  function renderRank() {
    var el = $('mr-rank');
    if (!el || !world) return;
    var live = world.marbles.filter(function (m) { return !m.done; })
      .sort(function (a, b) { return b.y - a.y; });
    var rows = world.finished.map(function (m, i) {
      return '<li class="done"><b>' + (i + 1) + '</b>' + esc(m.name) + '</li>';
    }).concat(live.map(function (m) {
      return '<li><b>·</b>' + esc(m.name) + '</li>';
    }));
    el.innerHTML = rows.join('');
  }

  function showWinner() {
    var fin = world.finished;
    var picks;
    if (winnerMode === 'last') picks = fin.slice(-winnerCount).reverse();
    else if (winnerMode === 'nth') picks = [fin[Math.min(fin.length, winnerCount) - 1]];
    else picks = fin.slice(0, winnerCount);
    var box = $('mr-winner');
    box.innerHTML = '<span class="wl">' +
      (winnerMode === 'last' ? '꼴등' : winnerMode === 'nth' ? winnerCount + '등' : '당첨') +
      '</span>' + picks.filter(Boolean).map(function (m) {
        return '<b>' + esc(m.name) + '</b>';
      }).join('');
    box.style.display = 'flex';
    if (typeof fxHearts === 'function') {
      var r = cv.getBoundingClientRect();
      fxHearts(r.left + r.width / 2, r.top + r.height / 2 + window.scrollY, 14);
    }
  }

  function bind() {
    $('mr-start').onclick = function () {
      if (running) return;
      if (world && world.allDone()) { reset(); }
      if (!world) { if (!build()) return; }
      $('mr-winner').style.display = 'none';
      start();
    };
    $('mr-reset').onclick = reset;
    $('mr-names').addEventListener('change', function () { if (!running) reset(); });

    document.querySelectorAll('[data-map]').forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll('[data-map]').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        stageIndex = +b.dataset.map;
        reset();
      };
    });
    document.querySelectorAll('[data-speed]').forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll('[data-speed]').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        speed = +b.dataset.speed;
      };
    });
    document.querySelectorAll('[data-wmode]').forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll('[data-wmode]').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        winnerMode = b.dataset.wmode;
        $('mr-count-wrap').style.display = winnerMode === 'nth' ? '' : '';
      };
    });
    $('mr-count').oninput = function () {
      winnerCount = Math.max(1, Math.min(20, parseInt(this.value, 10) || 1));
    };
    $('mr-skill').onchange = function () { useSkill = this.checked; if (!running) reset(); };
    window.addEventListener('resize', function () { fitCanvas(); draw(); });
  }

  window.initMarble = function () {
    cv = $('mr-canvas'); if (!cv) return;
    ctx = cv.getContext('2d');
    mini = $('mr-mini'); mctx = mini ? mini.getContext('2d') : null;
    fitCanvas(); bind(); reset();
  };
})();
