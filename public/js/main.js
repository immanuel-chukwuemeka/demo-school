/* ==============================================================
 * MAIN — shared boot for every public page.
 * Shell + tokens render instantly from cached/default settings
 * (no header flash, no literal {tokens}), then refresh from
 * Firestore once it responds.
 * ============================================================== */
import { mountShell } from "./lib/shell.js";
import { bootAnimations, initReveal } from "./lib/anim.js";
import { loadSettings, settingsSync } from "./lib/site.js";

const TOKEN_RE = /\{([a-zA-Z]+)\}/g;

function tokenMap(s) {
  return {
    name: s.name, motto: s.motto, session: s.session, term: s.term,
    phone: s.phone, phone2: s.phone2, whatsapp: s.whatsapp,
    email: s.email, admissionsEmail: s.admissionsEmail, address: s.address, domain: s.domain,
    phoneRaw: String(s.phone || "").replace(/\s/g, ""),
    whatsappRaw: String(s.whatsapp || "").replace(/\D/g, "")
  };
}

/** Walk text nodes so tokens inside elements that have child icons are replaced too. */
function replaceTokens(map) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const v = n.nodeValue;
    if (!v || v.indexOf("{") === -1) continue;
    if (n.__origText === undefined) n.__origText = v;
    n.nodeValue = n.__origText.replace(TOKEN_RE, (m, k) => map[k] ?? m);
  }
  if (document.body.dataset.title === undefined) document.body.dataset.title = document.title;
  document.title = document.body.dataset.title.replace(TOKEN_RE, (m, k) => map[k] ?? m);
}

function fingerprint(s) {
  return [s.name, s.motto, s.phone, s.email, s.address, s.vision, s.newsletterText,
    s.facebook, s.twitter, s.instagram, s.youtube, s.domain, s.whatsapp].join("|");
}

(async () => {
  const boot = settingsSync();
  window.__settings = boot;
  replaceTokens(tokenMap(boot));
  await mountShell();
  bootAnimations();
  initReveal();

  try {
    const s = (await loadSettings(true)) || settingsSync();
    window.__settings = s;
    if (fingerprint(s) !== fingerprint(boot)) {
      replaceTokens(tokenMap(s));
      await mountShell();
    }
  } catch { /* offline — cached/default values already rendered */ }
})();

export {};