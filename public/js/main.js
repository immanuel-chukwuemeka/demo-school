/* ==============================================================
 * MAIN — shared boot for every public page.
 * Mounts shell + animations, exposes settings globally.
 * ============================================================== */
import { mountShell } from "./lib/shell.js";
import { bootAnimations, initReveal } from "./lib/anim.js";
import { loadSettings } from "./lib/site.js";

(async () => {
  const s = await loadSettings();
  window.__settings = s;
  const tokenMap = {
    name: s.name, motto: s.motto, session: s.session, term: s.term,
    phone: s.phone, phone2: s.phone2, whatsapp: s.whatsapp,
    email: s.email, admissionsEmail: s.admissionsEmail, address: s.address, domain: s.domain,
    phoneRaw: s.phone.replace(/\s/g, ""), whatsappRaw: s.whatsapp.replace(/\D/g, "")
  };
  document.body.querySelectorAll("*").forEach((n) => {
    if (n.children.length === 0 && /^[^{]*\{[a-zA-Z]+\}[^}]*$/.test(n.textContent)) {
      n.textContent = n.textContent.replace(/\{([a-zA-Z]+)\}/g, (m, k) => tokenMap[k] ?? m);
    }
  });
  document.title = document.title.replace(/\{(\w+)\}/g, (m, k) => tokenMap[k] ?? m);
  await mountShell();
  bootAnimations();
  initReveal();
})();

export {};