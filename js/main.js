/* ==========================================================================
   MAIN.JS
   The page's working parts. The living backgrounds live in scenes.js; this
   file is everything you can actually click.

     1. Menu          all pages
     2. Reveal        all pages
     3. Portrait swap home
     4. Tilt & sheen  projects
     5. Open a row    hobbies
     6. Magnify       gallery
     7. Buttons       all pages
     8. Magnetic      all pages
     9. Scroll-focus  all pages
    10. Scroll bar    all pages

   Every block looks for what it needs and returns quietly if it isn't
   there, so one file serves five pages with no per-page wiring.
   ========================================================================== */

const CALM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const $  = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));


/* --------------------------------------------------------------------------
   1. MENU
   -------------------------------------------------------------------------- */

function menu() {
  const button = $(".burger");
  const list = $(".nav-list");
  if (!button || !list) return;

  button.addEventListener("click", () => {
    const open = list.classList.toggle("open");
    button.setAttribute("aria-expanded", open);
  });

  list.addEventListener("click", (event) => {
    if (event.target.closest(".nav-a")) {
      list.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
    }
  });
}


/* --------------------------------------------------------------------------
   2. REVEAL
   Marked elements fade up the first time they come into view.
   -------------------------------------------------------------------------- */

function reveal() {
  const items = $$(".rise");
  if (items.length === 0) return;

  if (CALM || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }

  const watcher = new IntersectionObserver((rows) => {
    rows.forEach((row) => {
      if (!row.isIntersecting) return;
      row.target.classList.add("in");
      watcher.unobserve(row.target);
    });
  }, { rootMargin: "0px 0px -8% 0px" });

  items.forEach((el) => watcher.observe(el));

  // Failsafe. These start at opacity 0, so anything that stops the observer
  // firing would leave real content invisible — the worst thing a
  // decorative effect can do. After two seconds, show everything regardless.
  setTimeout(() => items.forEach((el) => el.classList.add("in")), 2000);
}


/* --------------------------------------------------------------------------
   3. PORTRAIT SWAP  (home)
   -------------------------------------------------------------------------- */

const PHOTOS = ["assets/Dylan1.jpg", "assets/Dylan2.jpg"];

function portrait() {
  const image = $(".portrait img");
  const button = $(".portrait-btn");
  if (!image || !button) return;

  let index = 0;

  button.addEventListener("click", () => {
    index = (index + 1) % PHOTOS.length;

    // Fade out, change the file, fade back in. The 200 has to match the
    // opacity transition on .portrait img in the stylesheet.
    image.classList.add("swap");

    setTimeout(() => {
      image.src = PHOTOS[index];
      image.classList.remove("swap");
      button.textContent = "Photo " + (index + 1) + " / " + PHOTOS.length;
    }, 200);
  });
}


/* --------------------------------------------------------------------------
   4. TILT & SHEEN  (projects)
   Cards lean toward the pointer with a highlight tracking across them.
   -------------------------------------------------------------------------- */

function tilt() {
  const cards = $$(".work-in");
  if (cards.length === 0 || CALM) return;

  const MAX = 7;   // degrees. Past about 8 it stops reading as a lean and
                   // starts reading as a bug.

  cards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const box = card.getBoundingClientRect();
      const px = (event.clientX - box.left) / box.width;
      const py = (event.clientY - box.top) / box.height;

      // Y rotation follows X position and vice versa — that's what makes
      // the card look pushed rather than swivelled.
      card.style.transform =
        "perspective(1000px) rotateX(" + ((0.5 - py) * MAX * 2).toFixed(2) + "deg) " +
        "rotateY(" + ((px - 0.5) * MAX * 2).toFixed(2) + "deg) translateZ(6px)";

      card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
      card.style.setProperty("--my", (py * 100).toFixed(1) + "%");

      // Drop the transition while the pointer is inside so the card tracks
      // exactly; it comes back for the return to flat.
      card.style.transition = "border-color 0.3s, box-shadow 0.5s";
    });

    card.addEventListener("pointerleave", () => {
      card.style.transition = "";
      card.style.transform = "";
    });
  });
}


/* --------------------------------------------------------------------------
   5. OPEN A ROW  (hobbies)
   Plain rows that expand in place. The height is measured from the content
   rather than guessed, so a long write-up is never cut off — and it's a
   list, not a fan, so it can't get cramped on a phone.
   -------------------------------------------------------------------------- */

function rows() {
  const items = $$(".thing");
  if (items.length === 0) return;

  items.forEach((button) => {
    const panel = document.getElementById(button.getAttribute("aria-controls"));
    if (!panel) return;

    const inner = $(".thing-more-in", panel);

    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") === "true";

      // One at a time. Six open rows is a wall of text and you lose the
      // list you were reading.
      items.forEach((other) => {
        const otherPanel = document.getElementById(other.getAttribute("aria-controls"));
        if (!otherPanel || other === button) return;
        other.setAttribute("aria-expanded", "false");
        otherPanel.style.maxHeight = "0px";
      });

      button.setAttribute("aria-expanded", !open);

      // scrollHeight is the content's natural height. Setting it as an
      // explicit pixel value is what lets the CSS transition run — a
      // transition to "auto" does nothing at all.
      panel.style.maxHeight = open ? "0px" : inner.scrollHeight + "px";
    });
  });

  // A row left open while the window narrows will re-wrap to a taller
  // block, so anything open is re-measured.
  window.addEventListener("resize", () => {
    items.forEach((button) => {
      if (button.getAttribute("aria-expanded") !== "true") return;
      const panel = document.getElementById(button.getAttribute("aria-controls"));
      const inner = panel && $(".thing-more-in", panel);
      if (inner) panel.style.maxHeight = inner.scrollHeight + "px";
    });
  });
}


/* --------------------------------------------------------------------------
   6. MAGNIFY  (gallery)
   Each plate gets a --near value: 0 far from the pointer, 1 directly under
   it. All the growing and brightening is CSS reading that one number.
   -------------------------------------------------------------------------- */

function magnify() {
  const wall = $(".plates");
  if (!wall || CALM) return;

  const plates = $$(".plate", wall);
  if (plates.length === 0) return;

  const RADIUS = 300;

  // Positions only change on resize, so they're measured once. Reading
  // layout inside a pointermove handler is what makes this stutter.
  let spots = [];

  function measure() {
    const box = wall.getBoundingClientRect();
    spots = plates.map((plate) => {
      const r = plate.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
    });
  }

  // Remembers the last value written per plate, so one sitting far from the
  // pointer isn't handed the same number sixty times a second.
  const written = plates.map(() => -1);

  function apply(px, py) {
    plates.forEach((plate, i) => {
      const spot = spots[i];
      if (!spot) return;

      let near = 0;
      if (px !== null) {
        const dist = Math.hypot(spot.x - px, spot.y - py);
        if (dist < RADIUS) near = 1 - dist / RADIUS;
      }

      const step = Math.round(near * 20) / 20;   // 5% steps
      if (step !== written[i]) {
        plate.style.setProperty("--near", step);
        written[i] = step;
      }
    });
  }

  let queued = false;
  let px = 0;
  let py = 0;

  wall.addEventListener("pointermove", (event) => {
    const box = wall.getBoundingClientRect();
    px = event.clientX - box.left;
    py = event.clientY - box.top;

    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; apply(px, py); });
  });

  wall.addEventListener("pointerleave", () => apply(null, null));

  measure();
  window.addEventListener("resize", measure);
}


/* --------------------------------------------------------------------------
   7. BUTTONS
   Three behaviours, all pointer-driven.

     - The sweep starts from whichever edge the cursor actually crossed and
       leaves by the opposite one. A sweep that always wipes in from the
       left is the giveaway that it came out of a snippet.
     - The button leans toward the cursor while it's nearby, and lets go
       when it isn't.
     - A press puts a ripple at the exact point of the click.
   -------------------------------------------------------------------------- */

function buttons() {
  const list = $$(".btn");
  if (list.length === 0) return;

  list.forEach((btn) => {
    // The sweep layer is injected rather than written into every button in
    // every page — one place to change, and the markup stays readable.
    const sweep = document.createElement("span");
    sweep.className = "btn-sweep";
    sweep.setAttribute("aria-hidden", "true");
    btn.insertBefore(sweep, btn.firstChild);

    if (CALM) return;

    /* --- which edge did the pointer cross? --- */
    function edge(event) {
      const box = btn.getBoundingClientRect();

      // Distance from the pointer to each of the four edges. The smallest
      // is the one it came through.
      const near = [
        { d: event.clientX - box.left, x: "-101%", y: "0" },   // left edge
        { d: box.right - event.clientX, x: "101%", y: "0" },   // right
        { d: event.clientY - box.top, x: "0", y: "-101%" },    // top
        { d: box.bottom - event.clientY, x: "0", y: "101%" }   // bottom
      ].sort((a, b) => a.d - b.d)[0];

      btn.style.setProperty("--sx", near.x);
      btn.style.setProperty("--sy", near.y);
    }

    btn.addEventListener("pointerenter", edge);

    // Set the exit direction before the sweep starts travelling back, so it
    // leaves the way the cursor went rather than reversing.
    btn.addEventListener("pointerleave", (event) => {
      edge(event);
      btn.style.transform = "";
    });

    /* --- magnetic --- */
    btn.classList.add("magnet");

    // Past about 8px the label starts to look like it's sliding off the
    // button rather than the button leaning, so the pull is hard-capped
    // instead of scaling with the button's width.
    const PULL = 8;

    btn.addEventListener("pointermove", (event) => {
      const box = btn.getBoundingClientRect();
      const dx = (event.clientX - (box.left + box.width / 2)) / (box.width / 2);
      const dy = (event.clientY - (box.top + box.height / 2)) / (box.height / 2);

      // dx and dy are now -1 to 1 regardless of size, so a wide button and
      // a small one lean by the same amount.
      const cap = (v) => Math.max(-1, Math.min(1, v)) * PULL;

      btn.style.transform =
        "translate(" + cap(dx).toFixed(1) + "px," + cap(dy).toFixed(1) + "px)";
    });

    /* --- press ripple --- */
    btn.addEventListener("pointerdown", (event) => {
      const box = btn.getBoundingClientRect();

      const ring = document.createElement("span");
      ring.className = "btn-ripple";
      ring.setAttribute("aria-hidden", "true");
      ring.style.left = (event.clientX - box.left) + "px";
      ring.style.top = (event.clientY - box.top) + "px";
      btn.appendChild(ring);

      ring.addEventListener("animationend", () => ring.remove());
    });
  });
}


/* --------------------------------------------------------------------------
   8. MAGNETIC
   The same lean, for things that aren't buttons. Kept gentler — a card is
   heavier than a button and should move less.
   -------------------------------------------------------------------------- */

function magnets() {
  if (CALM) return;

  $$("[data-magnet]").forEach((el) => {
    // data-magnet is the cap in pixels, so a big card and a small circle
    // can be tuned independently and neither drifts off its own footprint.
    const pull = parseFloat(el.dataset.magnet) || 6;
    el.classList.add("magnet");

    el.addEventListener("pointermove", (event) => {
      const box = el.getBoundingClientRect();
      const dx = (event.clientX - (box.left + box.width / 2)) / (box.width / 2);
      const dy = (event.clientY - (box.top + box.height / 2)) / (box.height / 2);
      const cap = (v) => Math.max(-1, Math.min(1, v)) * pull;

      el.style.transform =
        "translate(" + cap(dx).toFixed(1) + "px," + cap(dy).toFixed(1) + "px)";
    });

    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
}


/* --------------------------------------------------------------------------
   9. SCROLL-FOCUS TEXT
   Marked lines are split into words, and each word sharpens from a blur as
   it rises up the screen. The scroll position IS the animation — there's no
   timeline, so scrolling back up puts the words out of focus again.
   -------------------------------------------------------------------------- */

function focusLines() {
  const lines = $$(".focus-line");
  if (lines.length === 0) return;

  // Without motion, leave the text alone entirely — sharp and readable.
  if (CALM) return;

  const all = [];

  // How much of the band the whole stagger is allowed to use up. A fixed
  // per-word delay works for a short heading and breaks a long one: at 20
  // words the last one wouldn't sharpen until the line had almost left the
  // top of the screen. Spreading a fixed budget across however many words
  // there are means every line finishes in the same place.
  const STAGGER_BUDGET = 0.5;

  lines.forEach((line) => {
    const words = line.textContent.trim().split(/\s+/);

    // The split words are decorative markup around text that already reads
    // correctly, so the accessible name is pinned before rewriting.
    line.setAttribute("aria-label", words.join(" "));
    line.textContent = "";

    const step = words.length > 1 ? STAGGER_BUDGET / (words.length - 1) : 0;

    words.forEach((word, i) => {
      const span = document.createElement("span");
      span.className = "fw";
      span.setAttribute("aria-hidden", "true");
      span.textContent = word;
      line.appendChild(span);
      all.push({ el: span, line: line, lag: i * step });
    });

    line.classList.add("split");
  });

  let queued = false;

  function update() {
    queued = false;

    const vh = window.innerHeight;

    all.forEach((item) => {
      const box = item.line.getBoundingClientRect();

      // Progress through a band. It starts when the line's top reaches 85%
      // of the screen and runs for a third of the screen's height, which —
      // with the half-band of stagger on top — means the LAST word is sharp
      // by the time the line sits about a third of the way up. Lengthen the
      // band and the tail of a long line only resolves as it exits the top.
      const p = (vh * 0.85 - box.top) / (vh * 0.33) - item.lag;

      item.el.style.setProperty("--p", Math.min(Math.max(p, 0), 1).toFixed(3));
    });
  }

  window.addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }, { passive: true });

  window.addEventListener("resize", update);
  update();
}


/* --------------------------------------------------------------------------
   10. SCROLL PROGRESS
   -------------------------------------------------------------------------- */

function progress() {
  const bar = document.createElement("div");
  bar.className = "progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);

  let queued = false;

  function update() {
    queued = false;
    const travel = document.documentElement.scrollHeight - window.innerHeight;
    const done = travel > 0 ? window.scrollY / travel : 0;
    bar.style.transform = "scaleX(" + Math.min(Math.max(done, 0), 1).toFixed(4) + ")";
  }

  window.addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }, { passive: true });

  window.addEventListener("resize", update);
  update();
}


menu();
reveal();
portrait();
tilt();
rows();
magnify();
buttons();
magnets();
focusLines();
progress();
