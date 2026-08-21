/* ==========================================================================
   SCENES.JS
   The living background. One full-bleed canvas per page, one scene painted
   on it, chosen by the data-scene attribute on <body>.

     beach     ripples on tap, a gentle wake behind a drag
     galaxy    drifting stars that join up near the pointer
     blossom   falling petals pushed around by a gust
     forest    fireflies drawn toward the pointer
     snow      snowfall that swirls past the pointer and settles

   Shared rules:

     - One canvas, one rAF loop, one pointer. Adding a scene costs a draw
       function and nothing else.
     - Everything is sized to the device's pixel density, or it looks soft
       on a phone.
     - Particle counts scale with the area of the screen, so a laptop isn't
       running a phone's budget and a phone isn't running a laptop's.
     - It stops when the tab is hidden and it never starts if the visitor
       asked for less motion.
   ========================================================================== */

(function () {

  const canvas = document.querySelector(".scene");
  if (!canvas) return;

  // No motion wanted: take the canvas out entirely rather than leaving a
  // still one that costs memory for nothing.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    canvas.remove();
    return;
  }

  const ctx = canvas.getContext("2d");
  const name = document.body.dataset.scene;

  let w = 0;
  let h = 0;
  let dpr = 1;

  /* ----------------------------------------------------------------------
     Palette
     Read once from the stylesheet, so a scene never hard-codes a colour and
     changing a palette in CSS changes the scene with it.
     ---------------------------------------------------------------------- */

  const css = getComputedStyle(document.body);
  const KEY = css.getPropertyValue("--key").trim() || "#38E1C4";
  const KEY2 = css.getPropertyValue("--key-2").trim() || "#7FD8FF";

  /* Turns #RRGGBB into "r, g, b" so it can be dropped into rgba(). */
  function rgb(hex) {
    const v = hex.replace("#", "");
    const n = parseInt(v.length === 3 ? v.replace(/./g, "$&$&") : v, 16);
    return ((n >> 16) & 255) + ", " + ((n >> 8) & 255) + ", " + (n & 255);
  }

  const K = rgb(KEY);
  const K2 = rgb(KEY2);

  /* ----------------------------------------------------------------------
     Pointer
     Position, velocity and whether it's held down — in CSS pixels, page
     coordinates, because the canvas is fixed to the viewport.
     ---------------------------------------------------------------------- */

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

  /* ----------------------------------------------------------------------
     BEACH — ripples and a wake

     Two things, both asked for:

       - A tap drops a set of rings that spread outward in a circle, the way
         a stone lands in shallow water.
       - Dragging leaves a wake: two lines of small crests peeling away
         behind the pointer at an angle, like the V a boat leaves. They're
         kept low and slow on purpose — this should read as a swell, not
         as spray.
     ---------------------------------------------------------------------- */

  const beach = {
    rings: [],
    crests: [],

    tap(x, y) {
      // Three rings, staggered, so a tap reads as a disturbance with
      // weight rather than one thin circle.
      for (let i = 0; i < 3; i++) {
        this.rings.push({ x: x, y: y, r: 2, max: 150 + i * 55, life: 1, wait: i * 7 });
      }
    },

    step() {
      /* --- the wake --- */
      const speed = Math.hypot(p.vx, p.vy);

      // Only leave a wake when the pointer is actually travelling. Below
      // this the "boat" is drifting and the water is flat.
      if (speed > 1.6) {
        const dir = Math.atan2(p.vy, p.vx);

        // One crest on each side, peeling back at about 22° — roughly the
        // angle a real wake holds regardless of speed.
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

      /* --- draw the rings --- */
      for (let i = this.rings.length - 1; i >= 0; i--) {
        const ring = this.rings[i];
        if (ring.wait-- > 0) continue;

        // Ease out: fast at first, slowing as it widens, like a real ring.
        ring.r += (ring.max - ring.r) * 0.035;
        ring.life -= 0.011;

        if (ring.life <= 0) { this.rings.splice(i, 1); continue; }

        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(" + K + "," + (ring.life * 0.5).toFixed(3) + ")";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // A second, tighter ring just inside gives the wave a thickness
        // that one stroke can't.
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r * 0.82, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(" + K2 + "," + (ring.life * 0.22).toFixed(3) + ")";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      /* --- draw the wake --- */
      for (let i = this.crests.length - 1; i >= 0; i--) {
        const c = this.crests[i];

        c.x += c.vx;
        c.y += c.vy;
        c.vx *= 0.975;      // water is thick; crests lose way quickly
        c.vy *= 0.975;
        c.size += 0.35;
        c.life -= 0.016;

        if (c.life <= 0) { this.crests.splice(i, 1); continue; }

        // An arc rather than a full circle: a crest is a piece of a wave,
        // and drawing the whole ring makes the wake look like bubbles.
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, c.a - 0.9, c.a + 0.9);
        ctx.strokeStyle = "rgba(" + K + "," + (c.life * 0.3).toFixed(3) + ")";
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      // Cheap insurance: a long fast drag across a big screen can queue up
      // a lot of crests, so the oldest go if the list runs away.
      if (this.crests.length > 220) this.crests.splice(0, this.crests.length - 220);
    }
  };

  /* ----------------------------------------------------------------------
     GALAXY — drifting stars that join up

     Stars drift slowly on their own. Near the pointer they brighten, and
     any two close enough to each other are joined by a line — so moving
     the cursor draws constellations that fall apart again behind it.
     ---------------------------------------------------------------------- */

  const galaxy = {
    stars: [],
    reach: 150,

    build() {
      // One star per ~11,000 px² — dense enough to connect, sparse enough
      // that the line-drawing stays cheap.
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

        // Wrap rather than bounce: a bounce reveals the edges of the box
        // and makes the field feel like a container.
        if (s.x < 0) s.x = w; else if (s.x > w) s.x = 0;
        if (s.y < 0) s.y = h; else if (s.y > h) s.y = 0;

        const near = Math.max(0, 1 - Math.hypot(s.x - p.x, s.y - p.y) / 260);

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (1 + near * 1.6), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + (near > 0.35 ? K : K2) + "," + (0.35 + near * 0.65).toFixed(3) + ")";
        ctx.fill();
      }

      /* --- the constellation lines ---
         Only stars near the pointer are considered. Testing every pair on
         screen is O(n²) and would cost far more than it looks. */
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

  /* ----------------------------------------------------------------------
     BLOSSOM — falling petals and a gust

     Petals fall and sway. Moving the pointer pushes a gust through them:
     they're shoved away from it, then settle back into their fall. Each
     petal is an ellipse rotated to the direction it's drifting, which is
     enough to read as a petal without any artwork.
     ---------------------------------------------------------------------- */

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
        // Each petal sways on its own clock, or they all swing together
        // and it reads as a curtain rather than as falling.
        sway: Math.random() * Math.PI * 2,
        swayRate: 0.01 + Math.random() * 0.02,
        tone: Math.random() > 0.55
      };
    },

    step() {
      for (const f of this.petals) {
        f.sway += f.swayRate;
        f.spin += f.spinRate;

        // The gust. Falls off with distance and is much stronger when the
        // pointer is actually moving.
        const dx = f.x - p.x;
        const dy = f.y - p.y;
        const dist = Math.hypot(dx, dy) || 1;

        if (dist < 190) {
          const push = (1 - dist / 190) * (0.6 + Math.hypot(p.vx, p.vy) * 0.16);
          f.vx += (dx / dist) * push;
          f.vy += (dy / dist) * push * 0.5;
        }

        // Air resistance brings a shoved petal back to a normal fall.
        f.vx *= 0.94;
        f.vy *= 0.94;

        f.x += f.vx + Math.sin(f.sway) * 0.7;
        f.y += f.vy + f.vy * 0 + (0.35 + f.size * 0.05);

        // Recycle off the bottom, and wrap sideways.
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

  /* ----------------------------------------------------------------------
     FOREST — fireflies

     Each fly wanders on its own, but is gently pulled toward the pointer
     when it's within reach, and brightens as it gets closer. They pulse at
     their own rate so the canopy never blinks in unison.

     Hold still and they gather into a knot over the cursor. Click it and
     the knot bursts: every fly in reach is flung outward, flares as it
     goes, and is deaf to the pull for a moment so it can actually get
     away — without that they'd be sucked straight back and the click
     would do nothing visible.
     ---------------------------------------------------------------------- */

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
          // 1 straight after a burst, easing to 0. While it's above 0 the
          // fly ignores the pointer and burns brighter.
          blown: 0
        });
      }
    },

    // Wired up by the pointerdown listener at the top of the file.
    tap(x, y) {
      const REACH = 300;   // the same radius the pull uses, so anything
                           // that was gathered is what gets thrown

      for (const f of this.flies) {
        const dx = f.x - x;
        const dy = f.y - y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > REACH) continue;

        // Hardest at the centre of the knot and tailing off outward.
        const force = (1 - dist / REACH) * 7 + 1.5;

        f.vx += (dx / dist) * force;
        f.vy += (dy / dist) * force;
        f.blown = 1;
      }
    },

    step() {
      for (const f of this.flies) {
        f.pulse += f.pulseRate;

        // Wander: a small random nudge each frame, which reads as far more
        // alive than any fixed path.
        f.vx += (Math.random() - 0.5) * 0.06;
        f.vy += (Math.random() - 0.5) * 0.06;

        const dx = p.x - f.x;
        const dy = p.y - f.y;
        const dist = Math.hypot(dx, dy) || 1;

        if (f.blown > 0) {
          // Recently thrown: no attraction, and the shove fades over about
          // a second and a half before it starts drifting back.
          f.blown -= 0.014;
        } else if (dist < 300 && dist > 40) {
          // Attraction. Gentle, and it stops well short of the pointer so
          // they never pile into a single dot.
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

        // The flare. A fly that's just been thrown is the brightest thing
        // on screen, which is what makes the burst read as an event rather
        // than as the cluster quietly coming apart.
        const flare = Math.max(f.blown, 0) * 0.7;
        const glow = 0.35 + Math.sin(f.pulse) * 0.25 + near * 0.4 + flare;

        // A soft halo behind the hard dot. Two fills is much cheaper than
        // a canvas shadowBlur and looks the same at this size.
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

  /* ----------------------------------------------------------------------
     SNOW — snowfall, swirl and drifts

     Flakes fall and drift sideways. Near the pointer they're pushed around
     it rather than away from it — a tangential force, which is what makes
     it read as a swirl instead of an explosion. Flakes that reach the
     bottom raise a drift line, so the page slowly collects snow.
     ---------------------------------------------------------------------- */

  const snow = {
    flakes: [],
    drift: [],
    DRIFTS: 90,

    build() {
      const count = Math.min(Math.round((w * h) / 9000), 260);
      this.flakes = [];

      for (let i = 0; i < count; i++) this.flakes.push(this.make(Math.random() * h));

      // Keep the drift shape across a resize if there is one, so the snow
      // that's already settled doesn't vanish when you turn a phone.
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

        // The swirl: push perpendicular to the line from pointer to flake,
        // so flakes are carried around it.
        const dx = f.x - p.x;
        const dy = f.y - p.y;
        const dist = Math.hypot(dx, dy) || 1;

        if (dist < 170) {
          const force = (1 - dist / 170) * 0.5;
          f.vx += (-dy / dist) * force;      // perpendicular, not radial
          f.x += (dx / dist) * force * 0.6;  // and a little outward
        }

        f.vx *= 0.97;
        f.x += f.vx + Math.sin(f.sway) * 0.4;
        f.y += f.vy;

        // Which drift column this flake is over, and how high the snow is
        // standing there.
        const col = Math.max(0, Math.min(this.DRIFTS - 1, Math.floor(f.x / colWidth)));
        const floor = h - this.drift[col];

        if (f.y > floor) {
          // Land: raise this column a little, and let it bleed into its
          // neighbours so drifts form slopes rather than towers.
          this.drift[col] += 0.35;
          if (col > 0) this.drift[col - 1] += 0.12;
          if (col < this.DRIFTS - 1) this.drift[col + 1] += 0.12;

          // Cap it, or the page eventually fills with snow.
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

      /* --- the drift along the bottom --- */
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

  /* ----------------------------------------------------------------------
     Wiring
     ---------------------------------------------------------------------- */

  const scenes = { beach, galaxy, blossom, forest, snow };
  const scene = scenes[name] || beach;

  function size() {
    w = window.innerWidth;
    h = window.innerHeight;

    // Cap at 2: past that the extra pixels cost real frames and nobody can
    // see the difference on a particle field.
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (scene.resize) scene.resize();
  }

  let running = true;

  // A hidden tab still runs rAF in some browsers, and a scene painting into
  // nothing is pure battery drain.
  //
  // Coming back also re-measures. A page that loads in a background tab can
  // report a viewport of 0, which would leave a 0x0 canvas and an empty
  // scene until something happened to fire a resize — so measuring again on
  // the way back is what stops the background arriving blank.
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (!running) return;

    if (canvas.width === 0 || w !== window.innerWidth) size();
    requestAnimationFrame(frame);
  });

  function frame() {
    if (!running) return;

    // Pointer velocity, worked out once per frame rather than per event —
    // pointermove fires far more often than the screen redraws.
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
