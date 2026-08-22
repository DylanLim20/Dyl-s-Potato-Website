



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

function projectViewer() {
  if (!document.body.classList.contains("projects-page")) return;

  const triggers = $$(".gallery-trigger");
  if (triggers.length === 0) return;

  const viewer = document.createElement("div");
  viewer.className = "viewer";
  viewer.setAttribute("aria-hidden", "true");
  viewer.innerHTML =
    '<div class="viewer-panel" role="dialog" aria-modal="true" aria-label="Project screenshots">' +
      '<div class="viewer-top">' +
        '<p class="viewer-title"></p>' +
        '<p class="viewer-count"></p>' +
        '<button class="viewer-btn viewer-zoom" type="button">Zoom</button>' +
        '<button class="viewer-btn viewer-close" type="button" aria-label="Close">X</button>' +
      '</div>' +
      '<div class="viewer-main"></div>' +
      '<div class="viewer-bottom">' +
        '<button class="viewer-btn viewer-prev" type="button" aria-label="Previous screenshot">&#8592;</button>' +
        '<div class="viewer-thumbs"></div>' +
        '<button class="viewer-btn viewer-next" type="button" aria-label="Next screenshot">&#8594;</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(viewer);

  const title = $(".viewer-title", viewer);
  const count = $(".viewer-count", viewer);
  const main = $(".viewer-main", viewer);
  const image = document.createElement("img");
  image.alt = "";
  const thumbs = $(".viewer-thumbs", viewer);
  const close = $(".viewer-close", viewer);
  const zoom = $(".viewer-zoom", viewer);
  const prev = $(".viewer-prev", viewer);
  const next = $(".viewer-next", viewer);

  let images = [];
  let labels = [];
  let index = 0;
  let lastFocus = null;

  function show(nextIndex) {
    if (images.length === 0) return;
    if (!image.parentNode) main.appendChild(image);
    index = (nextIndex + images.length) % images.length;
    image.src = images[index];
    image.alt = labels[index] || title.textContent + " screenshot " + (index + 1);
    count.textContent = (index + 1) + " / " + images.length;
    main.classList.remove("zoomed");
    zoom.textContent = "Zoom";
    $$(".viewer-thumb", thumbs).forEach((button, i) => {
      button.classList.toggle("active", i === index);
      button.setAttribute("aria-current", i === index ? "true" : "false");
    });
  }

  function open(trigger) {
    images = (trigger.dataset.galleryImages || "").split("|").filter(Boolean);
    labels = (trigger.dataset.galleryLabels || "").split("|");
    if (images.length === 0) return;

    lastFocus = document.activeElement;
    title.textContent = trigger.dataset.galleryTitle || "Screenshots";
    thumbs.textContent = "";

    images.forEach((src, i) => {
      const button = document.createElement("button");
      button.className = "viewer-thumb";
      button.type = "button";
      button.setAttribute("aria-label", labels[i] || "Screenshot " + (i + 1));
      button.innerHTML = '<img src="' + src + '" alt="">';
      button.addEventListener("click", () => show(i));
      thumbs.appendChild(button);
    });

    viewer.classList.add("open");
    viewer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    show(0);
    close.focus();
  }

  function hide() {
    viewer.classList.remove("open");
    viewer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    main.classList.remove("zoomed");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => open(trigger));
  });

  close.addEventListener("click", hide);
  prev.addEventListener("click", () => show(index - 1));
  next.addEventListener("click", () => show(index + 1));
  zoom.addEventListener("click", () => {
    const zoomed = main.classList.toggle("zoomed");
    zoom.textContent = zoomed ? "Fit" : "Zoom";
  });
  main.addEventListener("click", () => {
    const zoomed = main.classList.toggle("zoomed");
    zoom.textContent = zoomed ? "Fit" : "Zoom";
  });
  viewer.addEventListener("click", (event) => {
    if (event.target === viewer) hide();
  });
  window.addEventListener("keydown", (event) => {
    if (!viewer.classList.contains("open")) return;
    if (event.key === "Escape") hide();
    if (event.key === "ArrowLeft") show(index - 1);
    if (event.key === "ArrowRight") show(index + 1);
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
projectViewer();
rows();
magnify();
buttons();
magnets();
focusLines();
progress();
