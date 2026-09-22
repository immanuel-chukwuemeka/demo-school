/* ==============================================================
 * GALLERY — animated filtering over Firestore `gallery` images.
 * ============================================================== */
import { colRef, queryData } from "../lib/db.js";
import { esc } from "../lib/ui.js";
import { initReveal } from "../lib/anim.js";

const CATS = ["all", "assembly", "academics", "sports", "cultural", "laboratory", "graduation", "events"];

(async () => {
  const host = document.getElementById("galleryGrid");
  try {
    const items = await queryData(colRef("gallery"));
    const cats = ["all", ...new Set(items.map((i) => i.category).filter(Boolean))];
    const filterHost = document.getElementById("galleryFilters");
    filterHost.innerHTML = cats.map((c) => `<button class="tab-btn ${c === "all" ? "active" : ""}" data-cat="${esc(c)}">${CATS.includes(c) ? c[0].toUpperCase() + c.slice(1) : c}</button>`).join("");

    host.innerHTML = `<div class="masonry" id="masonry">${items.map((im, idx) => `
      <figure class="m-item m-item-${idx}" data-cat="${esc(im.category || "events")}" style="animation:zoomIn .6s ${(idx % 8) * 0.06}s both">
        <img src="${esc(im.url)}" alt="${esc(im.caption || "Greenwood Academy")}" loading="lazy">
        <figcaption class="m-cap" style="position:absolute;left:12px;bottom:12px;background:rgba(13,27,42,.7);color:#fff;padding:6px 12px;border-radius:999px;font-size:.78rem;backdrop-filter:blur(6px)">${esc(im.caption || "")}</figcaption>
      </figure>`).join("")}</div>`;
    host.offsetWidth; // reflow so transition applies
    const masonry = document.getElementById("masonry");

    filterHost.querySelectorAll(".tab-btn").forEach((b) => b.addEventListener("click", () => {
      filterHost.querySelectorAll(".tab-btn").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      const cat = b.dataset.cat;
      host.classList.add("fade");
      setTimeout(() => {
        masonry.querySelectorAll(".m-item").forEach((it) => {
          const show = cat === "all" || it.dataset.cat === cat;
          it.style.display = show ? "inline-block" : "none";
        });
        host.classList.remove("fade");
      }, 220);
    }));

    host.querySelectorAll(".m-item").forEach((it) => it.addEventListener("click", () => {
      const img = it.querySelector("img");
      const cap = it.querySelector("figcaption");
      window.open(img.src, "_blank");
    }));
  } catch { host.innerHTML = '<div class="empty-state"><i class="fa-regular fa-images"></i><p>Gallery unavailable.</p></div>'; }
})();