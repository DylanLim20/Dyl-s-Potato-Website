

(function () {
  "use strict";

  var page = document.querySelector(".t-page");
  if (!page) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  var hasLenis = typeof window.Lenis !== "undefined";
  var fx = hasGsap && !reduced;

  var lenis = null;

  function boot() {
    if (!fx) page.classList.add("no-fx");

    if (hasGsap) window.gsap.registerPlugin(window.ScrollTrigger);

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

  function cursor() {
    if (!hasHover || reduced) return;

    var root = document.querySelector(".t-cursor");
    var dot = document.querySelector(".t-dot");
    var ring = document.querySelector(".t-ring");
    var label = document.querySelector(".t-ring-l");
    if (!root || !dot || !ring) return;

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

        live = true;
        rx = px; ry = py;
        root.classList.add("is-live");
      }

      var el = e.target instanceof Element ? e.target.closest("[data-cursor]") : null;

      if (el) {
        var kind = el.dataset.cursor;
        setState(kind);
        if (label && (kind === "view" || kind === "drag")) {
          label.textContent = el.dataset.cursorLabel || (kind === "drag" ? "DRAG" : "VIEW");
        }

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

    document.addEventListener("mouseleave", function () { root.classList.remove("is-live"); });
    document.addEventListener("mouseenter", function () { if (live) root.classList.add("is-live"); });

    window.addEventListener("mousedown", function () { root.classList.add("is-down"); });
    window.addEventListener("mouseup", function () { root.classList.remove("is-down"); });

    (function loop() {

      rx += (px - rx) * 0.18;
      ry += (py - ry) * 0.18;
      scale += (scaleTo - scale) * 0.14;

      var down = root.classList.contains("is-down") ? 0.86 : 1;

      dot.style.transform = "translate3d(" + px + "px," + py + "px,0)";
      ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0) scale(" + (scale * down).toFixed(3) + ")";

      requestAnimationFrame(loop);
    })();
  }

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

  function reveals() {
    var groups = document.querySelectorAll("[data-reveal]");

    if (!fx) {

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

        s.loop = (s.el.scrollWidth + gap) / 2;
      });
    }

    measure();
    window.addEventListener("resize", measure);

    (function loop() {

      vel *= 0.9;
      var boost = Math.min(6, Math.abs(vel) * 0.4);

      state.forEach(function (s) {
        s.x += s.dir * (s.speed + boost);

        if (s.loop > 0) {

          if (s.x <= -s.loop) s.x += s.loop;
          if (s.x >= 0 && s.dir > 0) s.x -= s.loop;
        }

        var skew = Math.max(-8, Math.min(8, vel * 0.35));
        s.el.style.transform = "translate3d(" + s.x + "px,0,0) skewX(" + skew.toFixed(2) + "deg)";
      });

      requestAnimationFrame(loop);
    })();
  }

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

    tl.to(".t-hero-bg", { yPercent: 14, scale: 1.08, ease: "none" }, 0)
      .to(".t-hero-fig", { yPercent: 10, scale: 0.94, ease: "none" }, 0)
      .to(".t-hero-name", { yPercent: -40, ease: "none" }, 0)
      .to(".t-hero-sub, .t-card, .t-scroll-cue", { opacity: 0, ease: "none" }, 0);
  }

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
