/* ==============================================================
 * ACTIVITIES / EVENTS — grid + rich detail modal with gallery.
 * ============================================================== */
import { colRef, queryData } from "../lib/db.js";
import { loadEvents, renderBlocks } from "../lib/content.js";
import { esc, fmtDate, openModal } from "../lib/ui.js";
import { initReveal } from "../lib/anim.js";

document.addEventListener("click", (e) => {
  const card = e.target.closest("[data-open-event]");
  if (card) openEventModal(card.dataset.openEvent);
});

async function openEventModal(slug) {
  const list = await loadEvents();
  const ev = list.find((x) => x.slug === slug || x.id === slug);
  if (!ev) return;
  const gallery = (ev.images && ev.images.length) ? ev.images : [ev.image];
  openModal(`
    <img src="${esc(ev.image)}" alt="${esc(ev.title)}" style="width:100%;border-radius:var(--radius);margin-bottom:16px">
    <div class="flex" style="flex-wrap:wrap;margin-bottom:14px">
      <span class="pill navy"><i class="fa-regular fa-calendar"></i> ${fmtDate(ev.date)}</span>
      <span class="pill gold"><i class="fa-solid fa-location-dot"></i> ${esc(ev.venue)}</span>
      <span class="pill green"><i class="fa-solid fa-tag"></i> ${esc(ev.category)}</span>
    </div>
    <div class="article-body">${renderBlocks(ev.blocks || [{ type: "p", text: ev.excerpt || "" }])}</div>
    ${gallery.length > 1 ? `
      <h4 style="margin-top:18px">Event Gallery</h4>
      <div class="container" style="columns:2 180px;column-gap:12px;padding:0">
        ${gallery.map((g) => `<img src="${esc(g)}" alt="" style="width:100%;border-radius:10px;margin-bottom:12px" loading="lazy">`).join("")}
      </div>` : ""}
    ${(ev.highlights && ev.highlights.length) ? `
      <h4 style="margin-top:18px">Highlights</h4>
      <ul class="feature-list">${ev.highlights.map((h) => `<li><i class="fa-solid fa-star"></i><div>${esc(h)}</div></li>`).join("")}</ul>` : ""}
  `, ev.title, "fa-calendar-day");
}

(async () => {
  const host = document.getElementById("eventsGrid");
  try {
    const events = (await loadEvents()).filter((e) => e.published !== false);
    events.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    host.innerHTML = events.map((e) => `
      <article class="card card-zoom news-card reveal" data-open-event="${esc(e.slug || e.id)}" style="cursor:pointer">
        <div class="nc-media"><img src="${esc(e.image)}" alt="${esc(e.title)}">
          <span class="nc-tag">${esc(e.category || "Event")}</span>
          ${e.upcoming ? '<span class="nc-tag" style="background:var(--color-success);left:auto;right:14px">Upcoming</span>' : ""}</div>
        <div class="nc-body">
          <div class="nc-meta"><span><i class="fa-regular fa-calendar"></i> ${fmtDate(e.date)}</span><span><i class="fa-solid fa-location-dot"></i> ${esc(e.venue || "School Campus")}</span></div>
          <h3>${esc(e.title)}</h3>
          <p>${esc(e.excerpt || "").slice(0, 130)}…</p>
          <a href="#" class="lc-link" style="display:inline-flex;align-items:center;gap:8px;color:var(--color-accent);font-weight:700;font-size:.88rem;margin-top:12px" onclick="event.preventDefault()">Event Details <i class="fa-solid fa-arrow-right"></i></a>
        </div>
      </article>`).join("") || '<div class="empty-state" style="grid-column:1/-1"><i class="fa-regular fa-calendar-xmark"></i><p>No events published yet.</p></div>';
    initReveal(host);
  } catch { host.innerHTML = '<div class="empty-state"><p>Events unavailable.</p></div>'; }
})();