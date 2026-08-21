/* ==========================================================================
   TEST — MOTION
   Everything the editorial page does that CSS cannot do alone.

   The stack matches what the reference build uses, because it is the stack
   these sites converge on:

     Lenis          takes over scrolling so it has momentum and can be read
     GSAP           tweens
     ScrollTrigger  pins and scroll-scrubbed timelines

   All three come off a CDN in test.html. If any of them fails to load the
   page still works: boot() falls back to a no-effects mode where the
   layout is plain and vertical, the cursor still runs, and reveals happen
   through IntersectionObserver instead. Nothing here is load-bearing for
   reading the page.

   CONTENTS
   1. Boot & capability      4. Reveals
   2. Cursor                 5. Marquee
   3. Scroll progress        6. Hero, track, theme
   ========================================================================== */

(function () {
  "use strict";

  var page = document.querySelector(".t-page");
  if (!page) return;

  /* Capability gates. Both are decisions about intent, not about screen
     size: a laptop with a trackpad still wants the cursor, a phone plugged
     into a monitor still does not. */
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  var hasLenis = typeof window.Lenis !== "undefined";
  var fx = hasGsap && !reduced;

  var lenis = null;

  /* ========================================================================
     1. BOOT & CAPABILITY
     ======================================================================== */

  function boot() {
    if (!fx) page.classList.add("no-fx");

    if (hasGsap) window.gsap.registerPlugin(window.ScrollTrigger);

    /* --- Lenis. The important part is not the easing, it is that scroll
           position now lives in JS. ScrollTrigger has to be told to read
           from Lenis instead of from the scroll event, or pins jitter by
           one frame forever. --- */
    if (hasLenis && !reduced) {
      lenis = new window.Lenis({
        duration: 1.05,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel: true,
        touchMultiplier: 1.6
      });

      if (hasGsap) {
        lenis.on("scroll", window.ScrollTrigger.update);
        window.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        window.gsap.ticker.lagSmoothing(0);
      } else {
        requestAnimationFrame(function loop(t) { lenis.raf(t); requestAnimationFrame(loop); });
      }
    }

    cursor();
    progress();
    reveals();
    marquee();

    if (fx) {
      hero();
      track();
      theme();
    }

    wipe();

    /* Anchor links have to go through Lenis, otherwise the browser jumps
       the real scroll position and Lenis snaps back. */
    document.querySelectorAll('.t-page a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var target = document.querySelector(a.getAttribute("href"));
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { offset: -40 });
        else target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      });
    });
  }

  /* The load wipe clears once fonts are resolved, so the big display type
     does not swap face in front of the viewer. */
  function wipe() {
    var el = document.querySelector(".t-wipe");
    if (!el) return;

    var done = function () {
      if (fx) {
        window.gsap.to(el, {
          yPercent: -100,
          duration: 1,
          ease: "expo.inOut",
          onComplete: function () { el.remove(); }
        });
        window.gsap.from(".t-hero-name .t-line-i", {
          yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.06, delay: 0.35
        });
      } else {
        el.remove();
      }
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { setTimeout(done, 120); });
    } else {
      setTimeout(done, 400);
    }
  }

  /* ========================================================================
     2. CURSOR
     Three layers, one loop:

       dot   written on every mousemove with no easing. This is the truth
             of where the pointer is, so clicks always feel exact.
       ring  eased toward the same point inside a rAF loop. The lag is the
             entire effect - it reads as mass.
       label text inside the ring, for the VIEW and DRAG states.

     Both layers sit in a mix-blend-mode: difference container, so they
     invert against whatever is behind them. That is why the cursor needs
     no knowledge of the light/dark flip.

     State is not stored in JS. Elements declare data-cursor="view" and the
     nearest one wins via closest(), so a caption inside a tile inherits the
     tile state instead of fighting it. JS copies that onto the container as
     data-state and CSS owns every visual difference.

     The native cursor is deliberately kept everywhere except the two states
     where the ring genuinely replaces it. Hiding the system cursor across a
     whole page is the most common way these builds turn hostile.
     ======================================================================== */

  function cursor() {
    if (!hasHover || reduced) return;

    var root = document.querySelector(".t-cursor");
    var dot = document.querySelector(".t-dot");
    var ring = document.querySelector(".t-ring");
    var label = document.querySelector(".t-ring-l");
    if (!root || !dot || !ring) return;

    /* Target (px, py) is where the pointer is. (rx, ry) is where the ring
       has got to. scale is lerped the same way so state changes have the
       same weight as movement. */
    var px = -100, py = -100, rx = -100, ry = -100;
    var scale = 1, scaleTo = 1;
    var live = false;

    var SCALES = { "": 1, link: 1.7, view: 2.3, drag: 2.3, text: 0 };

    function setState(name) {
      if (root.dataset.state === name) return;
      root.dataset.state = name;
      scaleTo = SCALES[name] === undefined ? 1 : SCALES[name];
    }

    window.addEventListener("mousemove", function (e) {
      px = e.clientX;
      py = e.clientY;

      if (!live) {
        /* First move: drop the ring straight onto the pointer before
           fading in, so it does not fly in from the corner. */
        live = true;
        rx = px; ry = py;
        root.classList.add("is-live");
      }

      /* --- Resolve state from the element under the pointer. --- */
      var el = e.target instanceof Element ? e.target.closest("[data-cursor]") : null;

      if (el) {
        var kind = el.dataset.cursor;
        setState(kind);
        if (label && (kind === "view" || kind === "drag")) {
          label.textContent = el.dataset.cursorLabel || (kind === "drag" ? "DRAG" : "VIEW");
        }

        /* --- Magnet. The ring is pulled most of the way to the element
               centre while the dot keeps tracking the real pointer, so a
               button feels like it has gravity without the click target
               ever moving. --- */
        if (el.hasAttribute("data-magnet")) {
          var r = el.getBoundingClientRect();
          px = r.left + r.width / 2 + (e.clientX - (r.left + r.width / 2)) * 0.25;
          py = r.top + r.height / 2 + (e.clientY - (r.top + r.height / 2)) * 0.25;
        }
      } else if (e.target instanceof Element && e.target.closest("p, .t-quote, .t-lab")) {
        setState("text");
      } else {
        setState("");
      }
    }, { passive: true });

    /* Leaving the window has to hide the cursor, or it freezes mid-page. */
    document.addEventListener("mouseleave", function () { root.classList.remove("is-live"); });
    document.addEventListener("mouseenter", function () { if (live) root.classList.add("is-live"); });

    window.addEventListener("mousedown", function () { root.classList.add("is-down"); });
    window.addEventListener("mouseup", function () { root.classList.remove("is-down"); });

    (function loop() {
      /* Exponential smoothing. 0.18 is the whole feel of the thing: lower
         is heavier and starts to feel broken past about 0.08, higher stops
         reading as lag at all above roughly 0.4. */
      rx += (px - rx) * 0.18;
      ry += (py - ry) * 0.18;
      scale += (scaleTo - scale) * 0.14;

      var down = root.classList.contains("is-down") ? 0.86 : 1;

      dot.style.transform = "translate3d(" + px + "px," + py + "px,0)";
      ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0) scale(" + (scale * down).toFixed(3) + ")";

      requestAnimationFrame(loop);
    })();
  }

  /* ========================================================================
     3. SCROLL PROGRESS
     The right-edge bar, blend-difference so it reads on both skins. This is
     the one piece of pointer/scroll furniture the reference actually ships.
     ======================================================================== */

  function progress() {
    var wrap = document.querySelector(".t-prog");
    var bar = document.querySelector(".t-prog-b");
    if (!wrap || !bar) return;

    function draw() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = "translateY(" + p * 900 + "%)";
      wrap.classList.toggle("is-live", window.scrollY > 40);
    }

    if (lenis) lenis.on("scroll", draw);
    window.addEventListener("scroll", draw, { passive: true });
    draw();
  }

  /* ========================================================================
     4. REVEALS
     Masked upward reveal per line. Real per-line splitting needs a text
     splitter (the reference ships SplitType); here the lines that matter
     are marked up as .t-line in the HTML, and everything else gets a
     staggered fade-up on its container.
     ======================================================================== */

  function reveals() {
    var groups = document.querySelectorAll("[data-reveal]");

    if (!fx) {
      /* No GSAP: still reveal, just with a class and CSS transitions, so
         nothing is stuck invisible. */
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
        });
      }, { rootMargin: "0px 0px -12% 0px" });
      groups.forEach(function (g) { io.observe(g); });
      return;
    }

    groups.forEach(function (group) {
      var lines = group.querySelectorAll(".t-line-i");
      var targets = lines.length ? lines : [group];

      window.gsap.from(targets, {
        yPercent: lines.length ? 110 : 0,
        opacity: lines.length ? 1 : 0,
        y: lines.length ? 0 : 28,
        duration: 1,
        ease: "expo.out",
        stagger: 0.07,
        scrollTrigger: { trigger: group, start: "top 85%", once: true }
      });
    });
  }

  /* ========================================================================
     5. MARQUEE
     Two identical sets per row. The row is translated left forever and
     wrapped by exactly one set width plus one gap, which is what makes the
     seam invisible.

     Scroll velocity feeds two things: it adds to the drift speed, and it
     skews the row. The skew is the cheap stand-in for the WebGL distortion
     the reference runs on this section - same read, no shader.
     ======================================================================== */

  function marquee() {
    var rows = Array.prototype.slice.call(document.querySelectorAll(".t-mq-row"));
    if (!rows.length || reduced) return;

    var vel = 0;

    if (lenis) {
      lenis.on("scroll", function (e) { vel = e.velocity || 0; });
    } else {
      var last = window.scrollY;
      window.addEventListener("scroll", function () {
        vel = (window.scrollY - last) * 0.6;
        last = window.scrollY;
      }, { passive: true });
    }

    var state = rows.map(function (row, i) {
      return {
        el: row,
        dir: row.dataset.dir === "right" ? 1 : -1,
        speed: parseFloat(row.dataset.speed || "0.6"),
        x: 0,
        loop: 0
      };
    });

    function measure() {
      state.forEach(function (s) {
        var gap = parseFloat(getComputedStyle(s.el).columnGap) || 0;
        /* Row holds two sets and one gap between them, so one hop is
           (total + gap) / 2. */
        s.loop = (s.el.scrollWidth + gap) / 2;
      });
    }

    measure();
    window.addEventListener("resize", measure);

    (function loop() {
      /* Decay velocity so the boost trails off instead of latching. */
      vel *= 0.9;
      var boost = Math.min(6, Math.abs(vel) * 0.4);

      state.forEach(function (s) {
        s.x += s.dir * (s.speed + boost);

        if (s.loop > 0) {
          /* Modulo both ways so it survives a scroll-driven overshoot. */
          if (s.x <= -s.loop) s.x += s.loop;
          if (s.x >= 0 && s.dir > 0) s.x -= s.loop;
        }

        var skew = Math.max(-8, Math.min(8, vel * 0.35));
        s.el.style.transform = "translate3d(" + s.x + "px,0,0) skewX(" + skew.toFixed(2) + "deg)";
      });

      requestAnimationFrame(loop);
    })();
  }

  /* ========================================================================
     6. HERO, TRACK, THEME
     ======================================================================== */

  /* Sticky-track hero. The outer element is two viewports tall and the
     inner one is stuck at the top, so the second viewport of scroll scrubs
     the hero apart instead of pushing it up the screen. */
  function hero() {
    var track = document.querySelector(".t-hero-track");
    if (!track) return;

    var tl = window.gsap.timeline({
      scrollTrigger: {
        trigger: track,
        start: "top top",
        end: "bottom bottom",
        scrub: true
      }
    });

    /* Three depths moving at three rates is the whole parallax. */
    tl.to(".t-hero-bg", { yPercent: 14, scale: 1.08, ease: "none" }, 0)
      .to(".t-hero-fig", { yPercent: 10, scale: 0.94, ease: "none" }, 0)
      .to(".t-hero-name", { yPercent: -40, ease: "none" }, 0)
      .to(".t-hero-sub, .t-card, .t-scroll-cue", { opacity: 0, ease: "none" }, 0);
  }

  /* Horizontal pin. The spacer supplies vertical distance, the pin holds
     still, and the rail is translated by exactly its overflow. Setting the
     spacer height from the measured rail width is what keeps the section
     from ending early or leaving dead scroll at the end. */
  function track() {
    var section = document.querySelector(".t-track");
    var spacer = document.querySelector(".t-track-spacer");
    var rail = document.querySelector(".t-rail");
    if (!section || !spacer || !rail) return;

    var distance = 0;

    function size() {
      distance = Math.max(0, rail.scrollWidth - window.innerWidth);
      spacer.style.height = window.innerHeight + distance + "px";
    }

    size();

    window.gsap.to(rail, {
      x: function () { return -distance; },
      ease: "none",
      scrollTrigger: {
        trigger: spacer,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6,
        invalidateOnRefresh: true
      }
    });

    window.ScrollTrigger.addEventListener("refreshInit", size);
  }

  /* Theme flip. One class on .t-page; every palette name inverts in CSS.
     Toggled rather than scrubbed, because a half-inverted palette looks
     like a bug. */
  function theme() {
    var dark = document.querySelector("[data-theme-dark]");
    if (!dark) return;

    window.ScrollTrigger.create({
      trigger: dark,
      start: "top 50%",
      end: "bottom 50%",
      onToggle: function (self) { page.classList.toggle("is-dark", self.isActive); }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
