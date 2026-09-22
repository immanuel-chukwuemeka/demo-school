/* ==============================================================
 * HOME PAGE — requirement widget + live events + news feed.
 * ============================================================== */
import { initRequirementWidget } from "./requirements.js";
import { initReveal } from "../lib/anim.js";
import { qWhere, queryData } from "../lib/db.js";
import { fmtDate, esc } from "../lib/ui.js";

initRequirementWidget();

async function loadEvents() {
  const host = document.getElementById("homeEvents");
  if (!host) return;
  try {
    const events = await queryData(qWhere("events", "published", "==", true));
    events.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    const upcoming = events.filter((e) => new Date(e.date) >= new Date()).slice(0, 3);
    const list = (upcoming.length ? upcoming : events.slice(0, 3));
    host.innerHTML = list.length ? list.map((e) => `
      <article class="card card-zoom news-card reveal">
        <div class="nc-media"><img src="${esc(e.image || "assets/images/activities/career-day.jpg")}" alt="${esc(e.title)}"><span class="nc-tag">${esc(e.category || "Event")}</span></div>
        <div class="nc-body">
          <div class="nc-meta"><span><i class="fa-regular fa-calendar"></i> ${fmtDate(e.date)}</span><span><i class="fa-solid fa-location-dot"></i> ${esc(e.venue || "School Campus")}</span></div>
          <h3>${esc(e.title)}</h3>
          <p>${esc(e.excerpt || "").slice(0, 110)}…</p>
          <a href="activities.html#${esc(e.slug || "events")}" class="lc-link" style="display:inline-flex;align-items:center;gap:8px;color:var(--color-accent);font-weight:700;font-size:.88rem;margin-top:12px">View <i class="fa-solid fa-arrow-right"></i></a>
        </div>
      </article>`).join("") : '<div class="empty-state" style="grid-column:1/-1"><i class="fa-regular fa-calendar-xmark"></i><p>New events are being planned. Check back soon.</p></div>';
    initReveal(host);
  } catch (e) { host.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fa-regular fa-calendar-xmark"></i><p>Events unavailable.</p></div>'; }
}

async function loadNews() {
  const host = document.getElementById("homeNews");
  if (!host) return;
  try {
    const news = await queryData(qWhere("news", "published", "==", true));
    const items = news.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const picked = [];
    news.forEach((n) => { if (n.tags && n.tags.some((t) => /news|event|result|admission/i.test(t))) picked.push(n); });
    const list = (picked.length ? picked : items).slice(0, 3);
    host.innerHTML = list.length ? list.map((n) => `
      <article class="card card-zoom news-card reveal">
        <div class="nc-media"><img src="${esc(n.image || "assets/images/hero/morning-assembly.jpg")}" alt="${esc(n.title)}"><span class="nc-tag">${esc(n.category || "News")}</span></div>
        <div class="nc-body">
          <div class="nc-meta"><span><i class="fa-regular fa-calendar"></i> ${fmtDate(n.date)}</span><span><i class="fa-regular fa-clock"></i> ${esc(n.readTime || "3 min")} read</span></div>
          <h3>${esc(n.title)}</h3>
          <p>${esc(n.excerpt || "").slice(0, 110)}…</p>
          <a href="${n.type === "article" ? "blog-post.html?s=" + encodeURIComponent(n.slug) : "news.html"}" class="lc-link" style="display:inline-flex;align-items:center;gap:8px;color:var(--color-accent);font-weight:700;font-size:.88rem;margin-top:12px">Read More <i class="fa-solid fa-arrow-right"></i></a>
        </div>
      </article>`).join("") : '<div class="empty-state" style="grid-column:1/-1"><i class="fa-regular fa-newspaper"></i><p>News coming soon.</p></div>';
    initReveal(host);
  } catch (e) { host.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fa-regular fa-newspaper"></i><p>News unavailable.</p></div>'; }
}

loadEvents();
loadNews();