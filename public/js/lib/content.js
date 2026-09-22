/* ==============================================================
 * CONTENT HELPERS — shared loading + rendering for news/events/blog.
 * ============================================================== */
import { colRef, queryData } from "./db.js";
import { esc, fmtDate } from "./ui.js";

export async function loadEvents() { return queryData(colRef("events")); }
export async function loadNews() { return queryData(colRef("news")); }
export async function loadBlog() { return queryData(colRef("blogPosts")); }

export function eventCard(e) {
  return `
    <article class="card card-zoom news-card reveal" style="cursor:pointer" data-open-event="${esc(e.id || e.slug)}">
      <div class="nc-media"><img src="${esc(e.image)}" alt="${esc(e.title)}"><span class="nc-tag">${esc(e.category || "Event")}</span></div>
      <div class="nc-body">
        <div class="nc-meta"><span><i class="fa-regular fa-calendar"></i> ${fmtDate(e.date)}</span><span><i class="fa-solid fa-location-dot"></i> ${esc(e.venue || "School Campus")}</span></div>
        <h3>${esc(e.title)}</h3>
        <p>${esc(e.excerpt || "").slice(0, 120)}…</p>
      </div>
    </article>`;
}

export function newsCard(n) {
  const href = n.type === "article" ? `blog-post.html?s=${encodeURIComponent(n.slug)}` : "#";
  return `
    <article class="card card-zoom news-card reveal" ${n.type === "article" ? `onclick="location.href='${href}'" style="cursor:pointer"` : ""}>
      <div class="nc-media"><img src="${esc(n.image)}" alt="${esc(n.title)}"><span class="nc-tag">${esc(n.category || "News")}</span></div>
      <div class="nc-body">
        <div class="nc-meta"><span><i class="fa-regular fa-calendar"></i> ${fmtDate(n.date)}</span><span><i class="fa-regular fa-clock"></i> ${esc(n.readTime || "3 min")} read</span></div>
        <h3>${esc(n.title)}</h3>
        <p>${esc(n.excerpt || "").slice(0, 120)}…</p>
      </div>
    </article>`;
}

export function blogCard(b) {
  return `
    <article class="card card-zoom news-card reveal" style="cursor:pointer" onclick="location.href='blog-post.html?s=${encodeURIComponent(b.slug)}'">
      <div class="nc-media"><img src="${esc(b.image)}" alt="${esc(b.title)}"><span class="nc-tag">${esc(b.category || "Blog")}</span></div>
      <div class="nc-body">
        <div class="nc-meta"><span><i class="fa-regular fa-calendar"></i> ${fmtDate(b.date)}</span><span><i class="fa-regular fa-clock"></i> ${esc(b.readTime || "5 min")} read</span><span><i class="fa-solid fa-user"></i> ${esc(b.author || "Editorial")}</span></div>
        <h3>${esc(b.title)}</h3>
        <p>${esc(b.excerpt || "").slice(0, 120)}…</p>
      </div>
    </article>`;
}

/** Render article content blocks into HTML. */
export function renderBlocks(blocks) {
  if (!Array.isArray(blocks)) return "<p></p>";
  return blocks.map((b) => {
    if (b.type === "h2") return `<h2>${esc(b.text)}</h2>`;
    if (b.type === "h3") return `<h3>${esc(b.text)}</h3>`;
    if (b.type === "quote") return `<blockquote>“${esc(b.text)}”</blockquote>`;
    if (b.type === "ul") return `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
    if (b.type === "img") return `<img src="${esc(b.src)}" alt="${esc(b.caption || "")}" style="border-radius:var(--radius);box-shadow:var(--shadow)">`;
    return `<p>${esc(b.text)}</p>`;
  }).join("");
}