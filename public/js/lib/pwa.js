/* ==============================================================
 * PWA — service worker registration + "Install app" prompt.
 *
 * No imports on purpose: safe to pull into any page (public site,
 * login, dashboards). Nothing here touches app logic.
 *
 * Behaviour
 *   • Chromium fires `beforeinstallprompt` → the banner's Install
 *     button calls the real native prompt. If the user accepts, the
 *     banner disappears for good.
 *   • iOS / iPadOS has no such event → the banner explains
 *     "tap Share → Add to Home Screen" instead of showing a button
 *     that could not work.
 *   • Any other browser without the event (Firefox, etc.) shows
 *     nothing at all rather than a dead button.
 *   • Already-installed (standalone) → never shown.
 *   • Dismissal is remembered in localStorage for 30 days and the
 *     banner never re-appears within the same tab session.
 * ============================================================== */

const KEY = "GA_PWA_V1";
const DISMISS_MS = 30 * 24 * 60 * 60 * 1000;
const SW_URL = new URL("../../sw.js", import.meta.url);
const ICON = new URL("../../assets/icons/icon-192.png", import.meta.url).href;

const DOWNLOAD_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v9.6l3.5-3.5 1.4 1.4-5.9 5.9-5.9-5.9 1.4-1.4L10 12.6V3h2Zm-7 15h14v3H5v-3Z"/></svg>';
const CLOSE_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z"/></svg>';

let deferredPrompt = null;
let banner = null;

/* ------------------------------------------------------------ store */
const store = {
  read() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  },
  write(patch) {
    try { localStorage.setItem(KEY, JSON.stringify({ ...store.read(), ...patch })); } catch { /* private mode */ }
  },
  sessionFlag(name) {
    try { return sessionStorage.getItem(name) === "1"; } catch { return false; }
  },
  setSessionFlag(name) {
    try { sessionStorage.setItem(name, "1"); } catch { /* private mode */ }
  }
};

/* --------------------------------------------------------- detection */
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.matchMedia("(display-mode: fullscreen)").matches ||
  window.matchMedia("(display-mode: minimal-ui)").matches ||
  window.navigator.standalone === true;

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/** "Greenwood Academy International" → "Greenwood Academy" */
function appName() {
  const full = (window.__settings && window.__settings.name) || "Greenwood Academy International";
  return full.replace(/\s+International$/i, "") || full;
}

/* ------------------------------------------------------------ banner */
function buildBanner(mode) {
  const name = appName();
  const el = document.createElement("aside");
  el.className = "pwa-bar";
  el.setAttribute("role", "region");
  el.setAttribute("aria-label", `Install the ${name} app`);

  const ios = mode === "ios";
  el.innerHTML = `
    <div class="pwa-bar-inner">
      <img class="pwa-bar-icon" src="${ICON}" alt="" aria-hidden="true" width="46" height="46" decoding="async">
      <div class="pwa-bar-text">
        <b class="pwa-bar-title">Install ${name}</b>
        <span class="pwa-bar-msg" id="pwaBarMsg">${
          ios
            ? "Get faster access from your home screen. To install: tap <b>Share</b>, then <b>Add to Home Screen</b>."
            : "Get faster access from your home screen — open it like a native app, even offline."
        }</span>
      </div>
      <div class="pwa-bar-actions">
        ${ios ? "" : `<button type="button" class="pwa-install" id="pwaInstall">${DOWNLOAD_SVG}<span>Install</span></button>`}
        <button type="button" class="pwa-close" id="pwaClose" aria-label="Dismiss install prompt">${CLOSE_SVG}</button>
      </div>
    </div>`;

  const close = el.querySelector("#pwaClose");
  close.addEventListener("click", () => {
    store.write({ dismissedAt: Date.now() });
    store.setSessionFlag("GA_PWA_HIDDEN_SESSION");
    hide();
  });

  const install = el.querySelector("#pwaInstall");
  if (install) install.addEventListener("click", onInstallClick);

  /* First tab stop should not jump the user away from the page, but
     screen readers get a live announcement that something appeared. */
  return el;
}

function onInstallClick() {
  const btn = document.getElementById("pwaInstall");
  if (btn) btn.disabled = true;
  if (!deferredPrompt) {
    if (btn) btn.disabled = false;
    return;
  }
  const prompt = deferredPrompt;
  deferredPrompt = null;
  Promise.resolve()
    .then(() => prompt.prompt())
    .then(() => prompt.userChoice)
    .then((choice) => {
      if (choice && choice.outcome === "accepted") {
        store.write({ installed: true });
        hide();
      } else {
        /* Cancelled — leave the door open, but not in this session. */
        store.setSessionFlag("GA_PWA_HIDDEN_SESSION");
        hide();
      }
    })
    .catch(() => { /* the browser refused — just leave things as they are */ })
    .finally(() => { const b = document.getElementById("pwaInstall"); if (b) b.disabled = false; });
}

function hide() {
  if (!banner) return;
  banner.hidden = true;
  if (banner.parentNode) banner.parentNode.removeChild(banner);
  banner = null;
}

/** Show the prompt, at most once per session and never while installed. */
function show(mode, delay = 0) {
  if (isStandalone()) return;
  if (store.read().installed) return;
  if (store.sessionFlag("GA_PWA_HIDDEN_SESSION")) return;
  const { dismissedAt } = store.read();
  if (dismissedAt && Date.now() - dismissedAt < DISMISS_MS) return;

  window.setTimeout(() => {
    if (banner) return;
    if (isStandalone()) return;
    banner = buildBanner(mode);
    /* First in <body> → above the header, pushes the page down, covers nothing. */
    document.body.insertBefore(banner, document.body.firstChild);
  }, delay);
}

/* --------------------------------------------------- offline notice */
function offlineNotice() {
  const el = document.createElement("div");
  el.className = "pwa-net";
  el.setAttribute("role", "status");
  el.innerHTML = '<i aria-hidden="true"></i><span>You are offline — pages you have already opened still work.</span>';
  document.body.appendChild(el);

  const sync = () => el.classList.toggle("show", !navigator.onLine);
  window.addEventListener("offline", sync);
  window.addEventListener("online", sync);
  sync();
}

/* ------------------------------------------------- service worker */
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol === "file:") return;          /* nothing to register */

  const go = () => {
    navigator.serviceWorker
      .register(SW_URL, { scope: new URL("../../", import.meta.url).pathname })
      .then((reg) => {
        /* The worker bumps its own cache on install, so a new deploy
           takes over on the next load without a manual refresh. */
        if (reg && reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
        reg.addEventListener("updatefound", () => {
          const waiting = reg.installing;
          if (waiting) waiting.addEventListener("statechange", () => { /* activated by sw.js */ });
        });
      })
      .catch((err) => console.warn("[pwa] service worker not registered:", err));
  };

  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
}

/* ------------------------------------------------------------ entry */
/**
 * Boot the PWA layer.
 * @param {{ banner?: boolean }} [opts] set banner:false on in-app
 *        screens (dashboards) where a prompt would get in the way.
 */
export function initPWA(opts = {}) {
  registerServiceWorker();
  offlineNotice();

  if (opts.banner === false) return;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();                 /* we drive the prompt ourselves */
    deferredPrompt = event;
    show("native", 900);
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    store.write({ installed: true });
    hide();
  });

  /* iOS never fires beforeinstallprompt — show the manual steps instead. */
  if (isIOS() && !isStandalone()) show("ios", 2600);
}