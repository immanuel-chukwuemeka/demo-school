/* ==============================================================
 * BLOG POST — renders full article from `?s=slug`, share buttons,
 * related articles.
 * ============================================================== */
import { loadBlog, renderBlocks, blogCard } from "../lib/content.js";
import { esc, fmtDate } from "../lib/ui.js";
import { initReveal } from "../lib/anim.js";

const slug = new URLSearchParams(location.search).get("s");

(async () => {
  const host = document.getElementById("postBody");
  try {
    const posts = await loadBlog();
    const post = posts.find((p) => p.slug === slug) || posts[0];
    if (!post) { host.innerHTML = '<div class="empty-state"><p>Article not found.</p></div>'; return; }
    document.getElementById("phTitle").textContent = post.title;
    document.getElementById("phBg").src = post.image;

    const current = location.origin + location.pathname;
    const enc = encodeURIComponent(current + "?s=" + slug);
    host.innerHTML = `
      <article class="article-body">
        <h1 style="font-size:clamp(1.6rem,3.2vw,2.4rem);margin-bottom:18px">${esc(post.title)}</h1>
        <div class="article-meta mb-3">
          <span class="pill gold"><i class="fa-solid fa-tag"></i> ${esc(post.category || "Education")}</span>
          <span><i class="fa-regular fa-calendar"></i> ${fmtDate(post.date)}</span>
          <span><i class="fa-regular fa-clock"></i> ${esc(post.readTime)} min read</span>
        </div>
        <div class="author-chip mb-4"><img src="assets/images/hero/principal.jpg" alt=""><span><b>${esc(post.author || "Editorial Team")}</b><small style="display:block;color:var(--color-muted)">${esc(post.authorRole || "Writer, Greenwood Academy")}</small></span></div>
        <img src="${esc(post.image)}" alt="${esc(post.title)}" style="width:100%;border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);margin-bottom:26px;aspect-ratio:16/9;object-fit:cover">
        ${renderBlocks(post.blocks)}
        <div class="share-row">
          <span style="font-weight:700;color:var(--color-primary-dark)">Share:</span>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${enc}" target="_blank" rel="noopener" aria-label="Share on Facebook"><i class="fa-brands fa-facebook-f"></i></a>
          <a href="https://twitter.com/intent/tweet?url=${enc}&text=${encodeURIComponent(post.title)}" target="_blank" rel="noopener" aria-label="Share on X"><i class="fa-brands fa-x-twitter"></i></a>
          <a href="https://www.linkedin.com/sharing/share-offsite/?url=${enc}" target="_blank" rel="noopener" aria-label="Share on LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a>
          <a href="https://wa.me/?text=${encodeURIComponent(post.title + " " + current)}" target="_blank" rel="noopener" aria-label="Share on WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
        </div>
      </article>`;
    document.title = `${post.title} — ${window.__settings ? window.__settings.name : "Greenwood Academy"}`;

    const rel = posts.filter((p) => p.slug !== post.slug && p.category === post.category).concat(posts.filter((p) => p.slug !== post.slug && p.category !== post.category)).slice(0, 3);
    const relHost = document.getElementById("related");
    if (rel.length) relHost.innerHTML = `<div class="section-head"><span class="kicker">Keep Reading</span><h2 style="font-size:1.6rem">Related Articles</h2></div><div class="grid grid-3">${rel.map(blogCard).join("")}</div>`;
    initReveal();
  } catch { host.innerHTML = '<div class="empty-state"><p>Article unavailable.</p></div>'; }
})();