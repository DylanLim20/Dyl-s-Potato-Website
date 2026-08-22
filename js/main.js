



const CALM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const $  = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));





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


  setTimeout(() => items.forEach((el) => el.classList.add("in")), 2000);
}





const PHOTOS = ["assets/Dylan1.jpg", "assets/Dylan2.jpg"];

function portrait() {
  const image = $(".portrait img");
  const button = $(".portrait-btn");
  if (!image || !button) return;

  let index = 0;

  button.addEventListener("click", () => {
    index = (index + 1) % PHOTOS.length;


    image.classList.add("swap");

    setTimeout(() => {
      image.src = PHOTOS[index];
      image.classList.remove("swap");
      button.textContent = "Photo " + (index + 1) + " / " + PHOTOS.length;
    }, 200);
  });
}





function tilt() {
  const cards = $$(".work-in");
  if (cards.length === 0 || CALM) return;

  const MAX = 7;


  cards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const box = card.getBoundingClientRect();
      const px = (event.clientX - box.left) / box.width;
      const py = (event.clientY - box.top) / box.height;


      card.style.transform =
        "perspective(1000px) rotateX(" + ((0.5 - py) * MAX * 2).toFixed(2) + "deg) " +
        "rotateY(" + ((px - 0.5) * MAX * 2).toFixed(2) + "deg) translateZ(6px)";

      card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
      card.style.setProperty("--my", (py * 100).toFixed(1) + "%");


      card.style.transition = "border-color 0.3s, box-shadow 0.5s";
    });

    card.addEventListener("pointerleave", () => {
      card.style.transition = "";
      card.style.transform = "";
    });
  });
}





function rows() {
  const items = $$(".thing");
  if (items.length === 0) return;

  items.forEach((button) => {
    const panel = document.getElementById(button.getAttribute("aria-controls"));
    if (!panel) return;

    const inner = $(".thing-more-in", panel);

    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") === "true";


      items.forEach((other) => {
        const otherPanel = document.getElementById(other.getAttribute("aria-controls"));
        if (!otherPanel || other === button) return;
        other.setAttribute("aria-expanded", "false");
        otherPanel.style.maxHeight = "0px";
      });

      button.setAttribute("aria-expanded", !open);


      panel.style.maxHeight = open ? "0px" : inner.scrollHeight + "px";
    });
  });


  window.addEventListener("resize", () => {
    items.forEach((button) => {
      if (button.getAttribute("aria-expanded") !== "true") return;
      const panel = document.getElementById(button.getAttribute("aria-controls"));
      const inner = panel && $(".thing-more-in", panel);
      if (inner) panel.style.maxHeight = inner.scrollHeight + "px";
    });
  });
}





function magnify() {
  const wall = $(".plates");
  if (!wall || CALM) return;

  const plates = $$(".plate", wall);
  if (plates.length === 0) return;

  const RADIUS = 300;


  let spots = [];

  function measure() {
    const box = wall.getBoundingClientRect();
    spots = plates.map((plate) => {
      const r = plate.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
    });
  }


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

      const step = Math.round(near * 20) / 20;
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





function buttons() {
  const list = $$(".btn");
  if (list.length === 0) return;

  list.forEach((btn) => {

    const sweep = document.createElement("span");
    sweep.className = "btn-sweep";
    sweep.setAttribute("aria-hidden", "true");
    btn.insertBefore(sweep, btn.firstChild);

    if (CALM) return;


    function edge(event) {
      const box = btn.getBoundingClientRect();


      const near = [
        { d: event.clientX - box.left, x: "-101%", y: "0" },
        { d: box.right - event.clientX, x: "101%", y: "0" },
        { d: event.clientY - box.top, x: "0", y: "-101%" },
        { d: box.bottom - event.clientY, x: "0", y: "101%" }
      ].sort((a, b) => a.d - b.d)[0];

      btn.style.setProperty("--sx", near.x);
      btn.style.setProperty("--sy", near.y);
    }

    btn.addEventListener("pointerenter", edge);


    btn.addEventListener("pointerleave", (event) => {
      edge(event);
      btn.style.transform = "";
    });


    btn.classList.add("magnet");


    const PULL = 8;

    btn.addEventListener("pointermove", (event) => {
      const box = btn.getBoundingClientRect();
      const dx = (event.clientX - (box.left + box.width / 2)) / (box.width / 2);
      const dy = (event.clientY - (box.top + box.height / 2)) / (box.height / 2);


      const cap = (v) => Math.max(-1, Math.min(1, v)) * PULL;

      btn.style.transform =
        "translate(" + cap(dx).toFixed(1) + "px," + cap(dy).toFixed(1) + "px)";
    });


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





function magnets() {
  if (CALM) return;

  $$("[data-magnet]").forEach((el) => {

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





function focusLines() {
  const lines = $$(".focus-line");
  if (lines.length === 0) return;


  if (CALM) return;

  const all = [];


  const STAGGER_BUDGET = 0.5;

  lines.forEach((line) => {
    const words = line.textContent.trim().split(/\s+/);


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
