

(function () {

  const canvas = document.querySelector(".scene");
  if (!canvas) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    canvas.remove();
    return;
  }

  const ctx = canvas.getContext("2d");
  const name = document.body.dataset.scene;

  let w = 0;
  let h = 0;
  let dpr = 1;

  const css = getComputedStyle(document.body);
  const KEY = css.getPropertyValue("--key").trim() || "#38E1C4";
  const KEY2 = css.getPropertyValue("--key-2").trim() || "#7FD8FF";

  function rgb(hex) {
    const v = hex.replace("#", "");
    const n = parseInt(v.length === 3 ? v.replace(/./g, "$&$&") : v, 16);
    return ((n >> 16) & 255) + ", " + ((n >> 8) & 255) + ", " + (n & 255);
  }

  const K = rgb(KEY);
  const K2 = rgb(KEY2);

  const p = { x: -999, y: -999, px: -999, py: -999, vx: 0, vy: 0, down: false, seen: false };

  function track(event) {
    if (!p.seen) { p.x = p.px = event.clientX; p.y = p.py = event.clientY; p.seen = true; }
    p.x = event.clientX;
    p.y = event.clientY;
  }

  window.addEventListener("pointermove", track, { passive: true });

  window.addEventListener("pointerdown", (event) => {
    track(event);
    p.down = true;
    if (scene.tap) scene.tap(event.clientX, event.clientY);
  }, { passive: true });

  window.addEventListener("pointerup", () => { p.down = false; }, { passive: true });
  window.addEventListener("pointercancel", () => { p.down = false; }, { passive: true });

  const beach = {
    rings: [],
    crests: [],

    tap(x, y) {

      for (let i = 0; i < 3; i++) {
        this.rings.push({ x: x, y: y, r: 2, max: 150 + i * 55, life: 1, wait: i * 7 });
      }
    },

    step() {

      const speed = Math.hypot(p.vx, p.vy);

      if (speed > 1.6) {
        const dir = Math.atan2(p.vy, p.vx);

        for (const side of [-1, 1]) {
          const a = dir + Math.PI + side * 0.38;
          this.crests.push({
            x: p.x,
            y: p.y,
            vx: Math.cos(a) * (0.5 + speed * 0.05),
            vy: Math.sin(a) * (0.5 + speed * 0.05),
            a: a,
            life: 1,
            size: Math.min(6 + speed * 0.7, 26)
          });
        }
      }

      for (let i = this.rings.length - 1; i >= 0; i--) {
        const ring = this.rings[i];
        if (ring.wait-- > 0) continue;

        ring.r += (ring.max - ring.r) * 0.035;
        ring.life -= 0.011;

        if (ring.life <= 0) { this.rings.splice(i, 1); continue; }

        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(" + K + "," + (ring.life * 0.5).toFixed(3) + ")";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r * 0.82, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(" + K2 + "," + (ring.life * 0.22).toFixed(3) + ")";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      for (let i = this.crests.length - 1; i >= 0; i--) {
        const c = this.crests[i];

        c.x += c.vx;
        c.y += c.vy;
        c.vx *= 0.975;
        c.vy *= 0.975;
        c.size += 0.35;
        c.life -= 0.016;

        if (c.life <= 0) { this.crests.splice(i, 1); continue; }

        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, c.a - 0.9, c.a + 0.9);
        ctx.strokeStyle = "rgba(" + K + "," + (c.life * 0.3).toFixed(3) + ")";
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      if (this.crests.length > 220) this.crests.splice(0, this.crests.length - 220);
    }
  };

  const galaxy = {
    stars: [],
    reach: 150,

    build() {

      const count = Math.min(Math.round((w * h) / 11000), 220);
      this.stars = [];

      for (let i = 0; i < count; i++) {
        this.stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.16,
          vy: (Math.random() - 0.5) * 0.16,
          r: Math.random() * 1.3 + 0.4
        });
      }
    },

    step() {
      const stars = this.stars;

      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;

        if (s.x < 0) s.x = w; else if (s.x > w) s.x = 0;
        if (s.y < 0) s.y = h; else if (s.y > h) s.y = 0;

        const near = Math.max(0, 1 - Math.hypot(s.x - p.x, s.y - p.y) / 260);

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (1 + near * 1.6), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + (near > 0.35 ? K : K2) + "," + (0.35 + near * 0.65).toFixed(3) + ")";
        ctx.fill();
      }

      const close = stars.filter((s) => Math.hypot(s.x - p.x, s.y - p.y) < 220);

      for (let i = 0; i < close.length; i++) {
        for (let j = i + 1; j < close.length; j++) {
          const d = Math.hypot(close[i].x - close[j].x, close[i].y - close[j].y);
          if (d > this.reach) continue;

          ctx.beginPath();
          ctx.moveTo(close[i].x, close[i].y);
          ctx.lineTo(close[j].x, close[j].y);
          ctx.strokeStyle = "rgba(" + K + "," + ((1 - d / this.reach) * 0.28).toFixed(3) + ")";
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    },

    resize() { this.build(); }
  };

  const blossom = {
    petals: [],

    build() {
      const count = Math.min(Math.round((w * h) / 16000), 130);
      this.petals = [];

      for (let i = 0; i < count; i++) this.petals.push(this.make(Math.random() * h));
    },

    make(y) {
      return {
        x: Math.random() * w,
        y: y,
        vx: 0,
        vy: 0.35 + Math.random() * 0.5,
        size: 3 + Math.random() * 4.5,
        spin: Math.random() * Math.PI * 2,
        spinRate: (Math.random() - 0.5) * 0.03,

        sway: Math.random() * Math.PI * 2,
        swayRate: 0.01 + Math.random() * 0.02,
        tone: Math.random() > 0.55
      };
    },

    step() {
      for (const f of this.petals) {
        f.sway += f.swayRate;
        f.spin += f.spinRate;

        const dx = f.x - p.x;
        const dy = f.y - p.y;
        const dist = Math.hypot(dx, dy) || 1;

        if (dist < 190) {
          const push = (1 - dist / 190) * (0.6 + Math.hypot(p.vx, p.vy) * 0.16);
          f.vx += (dx / dist) * push;
          f.vy += (dy / dist) * push * 0.5;
        }

        f.vx *= 0.94;
        f.vy *= 0.94;

        f.x += f.vx + Math.sin(f.sway) * 0.7;
        f.y += f.vy + f.vy * 0 + (0.35 + f.size * 0.05);

        if (f.y > h + 20) { Object.assign(f, this.make(-20)); }
        if (f.x < -20) f.x = w + 20; else if (f.x > w + 20) f.x = -20;

        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.spin);
        ctx.beginPath();
        ctx.ellipse(0, 0, f.size, f.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + (f.tone ? K : K2) + ", 0.5)";
        ctx.fill();
        ctx.restore();
      }
    },

    resize() { this.build(); }
  };

  const forest = {
    flies: [],

    build() {
      const count = Math.min(Math.round((w * h) / 24000), 80);
      this.flies = [];

      for (let i = 0; i < count; i++) {
        this.flies.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          r: 1 + Math.random() * 1.8,
          pulse: Math.random() * Math.PI * 2,
          pulseRate: 0.02 + Math.random() * 0.03,

          blown: 0
        });
      }
    },

    tap(x, y) {
      const REACH = 300;

      for (const f of this.flies) {
        const dx = f.x - x;
        const dy = f.y - y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > REACH) continue;

        const force = (1 - dist / REACH) * 7 + 1.5;

        f.vx += (dx / dist) * force;
        f.vy += (dy / dist) * force;
        f.blown = 1;
      }
    },

    step() {
      for (const f of this.flies) {
        f.pulse += f.pulseRate;

        f.vx += (Math.random() - 0.5) * 0.06;
        f.vy += (Math.random() - 0.5) * 0.06;

        const dx = p.x - f.x;
        const dy = p.y - f.y;
        const dist = Math.hypot(dx, dy) || 1;

        if (f.blown > 0) {

          f.blown -= 0.014;
        } else if (dist < 300 && dist > 40) {

          const pull = (1 - dist / 300) * 0.05;
          f.vx += (dx / dist) * pull;
          f.vy += (dy / dist) * pull;
        }

        f.vx *= 0.96;
        f.vy *= 0.96;
        f.x += f.vx;
        f.y += f.vy;

        if (f.x < 0) f.x = w; else if (f.x > w) f.x = 0;
        if (f.y < 0) f.y = h; else if (f.y > h) f.y = 0;

        const near = Math.max(0, 1 - dist / 300);

        const flare = Math.max(f.blown, 0) * 0.7;
        const glow = 0.35 + Math.sin(f.pulse) * 0.25 + near * 0.4 + flare;

        const halo = f.r * (7 + flare * 6);
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, halo);
        grad.addColorStop(0, "rgba(" + K + "," + Math.min(glow * 0.5, 1).toFixed(3) + ")");
        grad.addColorStop(1, "rgba(" + K + ", 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, halo, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * (1 + flare), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + K2 + "," + Math.min(glow + 0.3, 1).toFixed(3) + ")";
        ctx.fill();
      }
    },

    resize() { this.build(); }
  };

  const snow = {
    flakes: [],
    drift: [],
    DRIFTS: 90,

    build() {
      const count = Math.min(Math.round((w * h) / 9000), 260);
      this.flakes = [];

      for (let i = 0; i < count; i++) this.flakes.push(this.make(Math.random() * h));

      if (this.drift.length !== this.DRIFTS) this.drift = new Array(this.DRIFTS).fill(0);
    },

    make(y) {
      return {
        x: Math.random() * w,
        y: y,
        r: 0.8 + Math.random() * 2.2,
        vy: 0.4 + Math.random() * 1.1,
        vx: 0,
        sway: Math.random() * Math.PI * 2,
        swayRate: 0.008 + Math.random() * 0.02
      };
    },

    step() {
      const colWidth = w / this.DRIFTS;

      for (const f of this.flakes) {
        f.sway += f.swayRate;

        const dx = f.x - p.x;
        const dy = f.y - p.y;
        const dist = Math.hypot(dx, dy) || 1;

        if (dist < 170) {
          const force = (1 - dist / 170) * 0.5;
          f.vx += (-dy / dist) * force;
          f.x += (dx / dist) * force * 0.6;
        }

        f.vx *= 0.97;
        f.x += f.vx + Math.sin(f.sway) * 0.4;
        f.y += f.vy;

        const col = Math.max(0, Math.min(this.DRIFTS - 1, Math.floor(f.x / colWidth)));
        const floor = h - this.drift[col];

        if (f.y > floor) {

          this.drift[col] += 0.35;
          if (col > 0) this.drift[col - 1] += 0.12;
          if (col < this.DRIFTS - 1) this.drift[col + 1] += 0.12;

          if (this.drift[col] > h * 0.16) this.drift[col] = h * 0.16;

          Object.assign(f, this.make(-10));
          continue;
        }

        if (f.x < -10) f.x = w + 10; else if (f.x > w + 10) f.x = -10;

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + K2 + ", 0.65)";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.moveTo(0, h);

      for (let i = 0; i < this.DRIFTS; i++) {
        ctx.lineTo(i * colWidth + colWidth / 2, h - this.drift[i]);
      }

      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = "rgba(" + K2 + ", 0.14)";
      ctx.fill();
    },

    resize() { this.build(); }
  };

  const scenes = { beach, galaxy, blossom, forest, snow };
  const scene = scenes[name] || beach;

  function size() {
    w = window.innerWidth;
    h = window.innerHeight;

    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (scene.resize) scene.resize();
  }

  let running = true;

  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (!running) return;

    if (canvas.width === 0 || w !== window.innerWidth) size();
    requestAnimationFrame(frame);
  });

  function frame() {
    if (!running) return;

    p.vx = p.x - p.px;
    p.vy = p.y - p.py;
    p.px = p.x;
    p.py = p.y;

    ctx.clearRect(0, 0, w, h);
    scene.step();

    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", size);
  size();
  if (scene.build) scene.build();
  requestAnimationFrame(frame);

})();
