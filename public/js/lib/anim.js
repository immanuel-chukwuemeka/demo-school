/* ==============================================================
 * ANIMATION LAB — IntersectionObserver-driven, dependency-free.
 * reveal/left/right/zoom, staggered groups, count-up stats,
 * hover tilt, ripple buttons, magnetic CTA, hero parallax, timeline.
 * ============================================================== */

const ioOpts = { threshold: 0.14, rootMargin: "0px 0px -60px 0px" };
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  });
}, ioOpts);

const countIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const node = e.target;
    const target = parseFloat(node.dataset.count);
    const dur = node.dataset.dur ? parseFloat(node.dataset.dur) : 1400;
    const suffix = node.dataset.suffix || "";
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = Math.round(target * eased).toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    countIO.unobserve(node);
  });
}, { threshold: 0.4 });

export function initReveal(root = document) {
  root.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-zoom, .stagger").forEach((n) => io.observe(n));
}

export function initCounters() {
  document.querySelectorAll("[data-count]").forEach((n) => countIO.observe(n));
}

export function initBars() {
  document.querySelectorAll(".bar-fill").forEach((b) => (b.style.width = b.dataset.val + "%"));
}

/* ---------- Ripple buttons ---------- */
export function initRipple() {
  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".btn");
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const ink = document.createElement("span");
    const size = Math.max(rect.width, rect.height);
    ink.className = "ripple-ink";
    ink.style.width = ink.style.height = size + "px";
    ink.style.left = (ev.clientX - rect.left - size / 2) + "px";
    ink.style.top = (ev.clientY - rect.top - size / 2) + "px";
    btn.appendChild(ink);
    setTimeout(() => ink.remove(), 650);
  });
}

/* ---------- Magnetic hover ---------- */
export function initMagnetic() {
  document.querySelectorAll(".magnetic").forEach((m) => {
    const strength = 18;
    m.addEventListener("mousemove", (e) => {
      const r = m.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
      const y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      m.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    });
    m.addEventListener("mouseleave", () => (m.style.transform = ""));
  });
}

/* ---------- Hero parallax (mouse depth) ---------- */
export function initParallax() {
  const layers = document.querySelectorAll("[data-depth]");
  if (!layers.length) return;
  const hero = document.querySelector(".hero");
  if (!hero) return;
  hero.addEventListener("mousemove", (e) => {
    const r = hero.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    layers.forEach((l) => {
      const d = parseFloat(l.dataset.depth || 10);
      l.style.transform = `translate(${x * d}px, ${y * d}px)`;
    });
  });
}

/* ---------- Tilt cards ---------- */
export function initTilt() {
  document.querySelectorAll(".tilt").forEach((c) => {
    c.addEventListener("mousemove", (e) => {
      const r = c.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -9;
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 9;
      c.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    c.addEventListener("mouseleave", () => (c.style.transform = ""));
  });
}

/* ---------- Back to top ---------- */
export function initBackToTop() {
  const btn = document.createElement("button");
  btn.className = "back-to-top";
  btn.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
  btn.setAttribute("aria-label", "Back to top");
  document.body.appendChild(btn);
  window.addEventListener("scroll", () => btn.classList.toggle("show", window.scrollY > 500), { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

export function bootAnimations() {
  initReveal();
  initCounters();
  initBars();
  initRipple();
  initMagnetic();
  initParallax();
  initTilt();
  initBackToTop();
}