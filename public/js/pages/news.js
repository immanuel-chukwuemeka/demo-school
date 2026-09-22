/* News page: news grid + a few upcoming events. */
import { loadNews, loadEvents, newsCard, eventCard } from "../lib/content.js";
import { initReveal } from "../lib/anim.js";

(async () => {
  const ng = document.getElementById("newsGrid");
  try {
    const news = (await loadNews()).filter((n) => n.published !== false);
    news.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    ng.innerHTML = news.slice(0, 9).map(newsCard).join("") || '<div class="empty-state" style="grid-column:1/-1"><i class="fa-regular fa-newspaper"></i><p>News coming soon.</p></div>';
  } catch { ng.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><p>News unavailable.</p></div>'; }

  const me = document.getElementById("miniEvents");
  try {
    const events = (await loadEvents()).filter((e) => e.published !== false);
    events.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    me.innerHTML = events.slice(0, 3).map(eventCard).join("") || '<div class="empty-state" style="grid-column:1/-1"><p>No upcoming events.</p></div>';
  } catch { me.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><p>Events unavailable.</p></div>'; }
  initReveal();
})();