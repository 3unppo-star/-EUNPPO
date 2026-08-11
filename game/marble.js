/* Marble roulette, ported from lazygyu/roulette (MIT, (c) 2023 LazyGyu).
   Course data lives in maps.js and is unchanged. Box2D is replaced by a circle
   vs segment solver in the same world units, so the original constants apply:
     gravity 10, marble radius 0.25, spawn 10.25 + (order % 10) * 0.6,
     cool time 1000 + (1 - weight) * 4000, skill rate 0.2 * weight, stuck 5000ms.
   Load order: maps.js -> marble.js -> page script. */

(function (root) {
  var GRAVITY = 10;
  var R = 0.25;
  var STUCK_DELAY = 5000;
  var SUBSTEP = 1 / 240;

  function len(x, y) { return Math.sqrt(x * x + y * y); }

  function rotate(px, py, deg) {
    var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return [px * c - py * s, px * s + py * c];
  }

  /* Every shape is reduced to segments once, at load time. */
  function buildSegments(stage) {
    var segs = [], spin = [];
    stage.entities.forEach(function (e, idx) {
      var ox = e.position.x, oy = e.position.y, sh = e.shape;
      var kinematic = e.type === 'kinematic';
      var av = (e.props && e.props.angularVelocity) || 0;
      var life = (e.props && e.props.life !== undefined) ? e.props.life : Infinity;
      var local = [];

      if (sh.type === 'polyline') {
        for (var i = 0; i + 1 < sh.points.length; i++) {
          local.push([sh.points[i][0], sh.points[i][1], sh.points[i + 1][0], sh.points[i + 1][1]]);
        }
      } else if (sh.type === 'box') {
        var hw = sh.width / 2, hh = sh.height / 2;
        var c = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(function (p) {
          return rotate(p[0], p[1], sh.rotation || 0);
        });
        for (var k = 0; k < 4; k++) {
          var a = c[k], b = c[(k + 1) % 4];
          local.push([a[0], a[1], b[0], b[1]]);
        }
      }

      var item = {
        id: idx, ox: ox, oy: oy, kinematic: kinematic, av: av, angle: 0,
        life: life, dead: false, shape: sh,
        radius: sh.type === 'circle' ? sh.radius : 0,
        local: local, world: []
      };
      if (kinematic || sh.type === 'circle') spin.push(item);
      segs.push(item);
    });
    segs.forEach(bake);
    return { items: segs, moving: spin };
  }

  function bake(it) {
    it.world.length = 0;
    var a = it.angle * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    for (var i = 0; i < it.local.length; i++) {
      var L = it.local[i];
      var x1 = L[0] * c - L[1] * s + it.ox, y1 = L[0] * s + L[1] * c + it.oy;
      var x2 = L[2] * c - L[3] * s + it.ox, y2 = L[2] * s + L[3] * c + it.oy;
      it.world.push([x1, y1, x2, y2]);
    }
  }

  function Marble(order, total, name, weight) {
    this.id = order;
    this.name = name || ('M' + order);
    this.weight = weight === undefined ? 1 : weight;
    this.maxCool = 1000 + (1 - this.weight) * 4000;
    this.cool = this.maxCool * Math.random();
    this.skillRate = 0.2 * this.weight;
    this.impact = 0;
    this.hue = (360 / total) * order;
    this.mass = 1 + Math.random();          /* original: density 1 + random */
    var maxLine = Math.ceil(total / 10);
    var line = Math.floor(order / 10);
    var lineDelta = -Math.max(0, Math.ceil(maxLine - 5));
    this.x = 10.25 + (order % 10) * 0.6;
    this.y = maxLine - line + lineDelta;
    this.vx = 0; this.vy = 0;
    this.active = false; this.done = false; this.rank = -1;
    this.stuck = 0; this.lx = this.x; this.ly = this.y;
  }

  function World(stageIndex, names, opts) {
    opts = opts || {};
    this.stage = root.STAGES[stageIndex];
    this.built = buildSegments(this.stage);
    this.goalY = this.stage.goalY;
    this.zoomY = this.stage.zoomY;
    this.useSkill = !!opts.skill;
    this.rng = opts.rng || Math.random;
    this.marbles = [];
    this.finished = [];
    this.time = 0;

    /* The starting slots themselves are not equal on some maps, so the names are
       shuffled across slots. Slot bias then cannot attach to a person. */
    var list = names.slice();
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(this.rng() * (i + 1));
      var t = list[i]; list[i] = list[j]; list[j] = t;
    }
    for (var k = 0; k < list.length; k++) {
      this.marbles.push(new Marble(k, list.length, list[k].name, list[k].weight));
    }
  }

  World.prototype.start = function () {
    this.marbles.forEach(function (m) { m.active = true; });
  };

  World.prototype.step = function (dt) {
    var n = Math.min(8, Math.max(1, Math.round(dt / SUBSTEP)));
    for (var i = 0; i < n; i++) this.sub(SUBSTEP);
    this.time += dt;
  };

  World.prototype.sub = function (h) {
    var self = this;
    var mv = this.built.moving;
    for (var i = 0; i < mv.length; i++) {
      if (mv[i].av) { mv[i].angle += mv[i].av * h * 180 / Math.PI; bake(mv[i]); }
    }

    /* Processing marbles in array order lets the first one win far too often,
       so the order is shuffled every step. */
    var idx = [];
    for (var a = 0; a < this.marbles.length; a++) idx.push(a);
    for (var b = idx.length - 1; b > 0; b--) {
      var r = Math.floor(this.rng() * (b + 1));
      var t = idx[b]; idx[b] = idx[r]; idx[r] = t;
    }

    idx.forEach(function (k) {
      var m = self.marbles[k];
      if (!m.active || m.done) return;
      m.vy += GRAVITY * h;
      var nx = m.x + m.vx * h, ny = m.y + m.vy * h;

      /* Move in slices no longer than the radius so nothing tunnels through. */
      var dist = len(nx - m.x, ny - m.y);
      var steps = Math.max(1, Math.ceil(dist / (R * 0.8)));
      for (var s = 0; s < steps; s++) {
        m.x += (nx - m.x) / (steps - s);
        m.y += (ny - m.y) / (steps - s);
        self.collide(m);
      }

      if (len(m.x - m.lx, m.y - m.ly) < 0.003) {
        m.stuck += h * 1000;
        if (m.stuck > STUCK_DELAY) {
          m.vx += self.rng() * 10 - 5; m.vy += self.rng() * 10 - 5; m.stuck = 0;
        }
      } else m.stuck = 0;
      m.lx = m.x; m.ly = m.y;

      if (self.useSkill) {
        m.cool -= h * 1000;
        if (m.cool <= 0) {
          m.cool = m.maxCool;
          if (self.rng() < m.skillRate) self.impact(m);
        }
      }

      if (m.y > self.goalY) {
        m.done = true; m.active = false;
        m.rank = self.finished.length;
        self.finished.push(m);
      }
    });

    this.marbleContacts();
  };

  World.prototype.impact = function (src) {
    src.impact = 500;
    for (var i = 0; i < this.marbles.length; i++) {
      var o = this.marbles[i];
      if (o === src || o.done) continue;
      var dx = o.x - src.x, dy = o.y - src.y, d = len(dx, dy);
      if (d > 0 && d < 2.5) {
        var f = (2.5 - d) * 6 / d;
        o.vx += dx * f; o.vy += dy * f;
      }
    }
  };

  World.prototype.marbleContacts = function () {
    var ms = this.marbles;
    for (var i = 0; i < ms.length; i++) {
      if (ms[i].done) continue;
      for (var j = i + 1; j < ms.length; j++) {
        if (ms[j].done) continue;
        var a = ms[i], b = ms[j];
        var dx = b.x - a.x, dy = b.y - a.y, d = len(dx, dy);
        if (d > 0 && d < R * 2) {
          var ux = dx / d, uy = dy / d, push = (R * 2 - d) / 2;
          a.x -= ux * push; a.y -= uy * push;
          b.x += ux * push; b.y += uy * push;
          var rel = (b.vx - a.vx) * ux + (b.vy - a.vy) * uy;
          if (rel < 0) {
            var imp = -rel * 0.55;
            a.vx -= ux * imp; a.vy -= uy * imp;
            b.vx += ux * imp; b.vy += uy * imp;
          }
        }
      }
    }
  };

  World.prototype.collide = function (m) {
    var items = this.built.items;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.dead) continue;

      if (it.shape.type === 'circle') {
        var dx = m.x - it.ox, dy = m.y - it.oy, d = len(dx, dy), rr = it.radius + R;
        if (d < rr && d > 0) {
          if (it.life !== Infinity) { it.dead = true; continue; }   /* poppable */
          var ux = dx / d, uy = dy / d;
          m.x = it.ox + ux * rr; m.y = it.oy + uy * rr;
          var vn = m.vx * ux + m.vy * uy;
          if (vn < 0) {
            var e = (it.shape.restitution !== undefined) ? it.shape.restitution : 0.4;
            m.vx -= (1 + e) * vn * ux; m.vy -= (1 + e) * vn * uy;
          }
        }
        continue;
      }

      for (var s = 0; s < it.world.length; s++) {
        var W = it.world[s];
        var ax = W[0], ay = W[1], bx = W[2], by = W[3];
        var ex = bx - ax, ey = by - ay;
        var L2 = ex * ex + ey * ey;
        var t = L2 > 0 ? ((m.x - ax) * ex + (m.y - ay) * ey) / L2 : 0;
        t = t < 0 ? 0 : (t > 1 ? 1 : t);
        var cx = ax + ex * t, cy = ay + ey * t;
        var dx2 = m.x - cx, dy2 = m.y - cy, d2 = len(dx2, dy2);
        if (d2 < R && d2 > 1e-9) {
          if (it.life !== Infinity) { it.dead = true; break; }
          var nxu = dx2 / d2, nyu = dy2 / d2;
          m.x = cx + nxu * R; m.y = cy + nyu * R;
          /* A spinning bar carries its contact point; without that surface velocity a
             marble balances on it forever instead of being flicked off. */
          var svx = 0, svy = 0;
          if (it.av) { svx = -it.av * (cy - it.oy); svy = it.av * (cx - it.ox); }
          var rvx = m.vx - svx, rvy = m.vy - svy;
          var vn2 = rvx * nxu + rvy * nyu;
          if (vn2 < 0) {
            rvx -= 1.35 * vn2 * nxu;
            rvy -= 1.35 * vn2 * nyu;
            m.vx = rvx * 0.995 + svx; m.vy = rvy * 0.995 + svy;
          }
        }
      }
    }
  };

  World.prototype.allDone = function () {
    return this.finished.length >= this.marbles.length;
  };

  /* "name*3" spawns three marbles for that person, "name/2" makes skills frequent. */
  function parseNames(text) {
    var out = [];
    String(text || '').split(/[\n,]/).forEach(function (raw) {
      var s = raw.trim();
      if (!s) return;
      var count = 1, weight = 1;
      var mul = s.match(/\*\s*(\d+)\s*$/);
      if (mul) { count = Math.min(20, Math.max(1, parseInt(mul[1], 10))); s = s.slice(0, mul.index).trim(); }
      var div = s.match(/\/\s*(\d+(?:\.\d+)?)\s*$/);
      if (div) { weight = Math.max(0.1, Math.min(1, 1 / parseFloat(div[1]))); s = s.slice(0, div.index).trim(); }
      if (!s) return;
      for (var i = 0; i < count; i++) out.push({ name: s, weight: weight });
    });
    return out.slice(0, 60);
  }

  root.MarbleGame = { World: World, parseNames: parseNames, R: R, GRAVITY: GRAVITY };
  if (typeof module !== 'undefined') module.exports = root.MarbleGame;
})(typeof window !== 'undefined' ? window : global);
