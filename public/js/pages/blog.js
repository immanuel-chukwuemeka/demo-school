/* Blog index: card grid of Firestore blog posts. */
import { loadBlog, blogCard } from "../lib/content.js";
import { initReveal } from "../lib/anim.js";

(async () => {
  const host = document.getElementById("blogGrid");
  try {
    const posts = (await loadBlog()).filter((b) => b.published !== false);
    posts.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    host.innerHTML = posts.map(blogCard).join("") || '<div class="empty-state" style="grid-column:1/-1"><i class="fa-regular fa-pen-to-square"></i><p>Articles coming soon.</p></div>';
  } catch { host.innerHTML = '<div class="empty-state"><p>Blog unavailable.</p></div>'; }
  initReveal();
})();