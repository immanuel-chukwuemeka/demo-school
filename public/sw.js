/* ==============================================================
 * GREENWOOD ACADEMY — SERVICE WORKER
 *
 * Strategy (deliberately conservative for an authenticated school
 * portal — nothing private is ever written to a cache):
 *
 *   navigations        network-first  → cached page → offline.html
 *   css / js / shell   stale-while-revalidate (versioned precache)
 *   images / fonts     stale-while-revalidate (capped cache)
 *   Firebase + auth    network-only    (never cached, never replayed)
 *
 * Bump VERSION on every deploy: install fills a fresh cache and
 * activate deletes every older ga-* cache.
 * ============================================================== */

const VERSION = "1.0.0";
const SHELL_CACHE = `ga-shell-v${VERSION}`;
const ASSET_CACHE = `ga-assets-v${VERSION}`;
const IMAGE_CACHE = `ga-images-v${VERSION}`;
const OWNED_CACHES = [SHELL_CACHE, ASSET_CACHE, IMAGE_CACHE];
const MAX_IMAGE_ENTRIES = 160;

const PRECACHE = [
  "./", "./index.html", "./offline.html", "./manifest.webmanifest",

  /* public pages */
  "./about.html", "./academics.html", "./activities.html", "./admissions.html",
  "./blog.html", "./blog-post.html", "./check-result.html", "./contact.html",
  "./creche.html", "./gallery.html", "./news.html", "./nursery.html",
  "./primary.html", "./prospectus.html", "./requirements.html", "./secondary.html",

  /* portals */
  "./login.html", "./dashboard-admin.html", "./dashboard-staff.html", "./dashboard-student.html",

  /* design system */
  "./css/styles.css", "./css/dashboard.css", "./css/pwa.css",

  /* shared boot + libraries */
  "./js/main.js", "./js/firebase-config.js",
  "./js/lib/anim.js", "./js/lib/auth.js", "./js/lib/content.js", "./js/lib/db.js",
  "./js/lib/fee-pdf.js", "./js/lib/firebase.js", "./js/lib/pdf.js",
  "./js/lib/prospectus-pdf.js", "./js/lib/result-view.js", "./js/lib/shell.js",
  "./js/lib/site.js", "./js/lib/ui.js", "./js/lib/pwa.js",

  /* page modules */
  "./js/pages/activities.js", "./js/pages/blog.js", "./js/pages/blog-post.js",
  "./js/pages/check-result.js", "./js/pages/contact.js", "./js/pages/faq.js",
  "./js/pages/gallery.js", "./js/pages/index.js", "./js/pages/login.js",
  "./js/pages/news.js", "./js/pages/prospectus.js", "./js/pages/requirements.js",
  "./js/pages/requirements-page.js",

  /* dashboards */
  "./js/dashboards/admin/main.js", "./js/dashboards/admin/shell.js",
  "./js/dashboards/admin/dashboard.js", "./js/dashboards/admin/students.js",
  "./js/dashboards/admin/staff.js", "./js/dashboards/admin/classes.js",
  "./js/dashboards/admin/finance.js", "./js/dashboards/admin/results.js",
  "./js/dashboards/admin/scratchcards.js", "./js/dashboards/admin/content.js",
  "./js/dashboards/admin/settings.js",
  "./js/dashboards/staff/main.js", "./js/dashboards/student/main.js",

  /* brand */
  "./assets/logo/logo.svg", "./assets/logo/logo-white.svg",
  "./assets/logo/logo-mono.svg", "./assets/logo/favicon.svg",
  "./assets/images/students/student-default.svg", "./assets/images/staff/staff-default.svg",
  "./assets/icons/icon-192.png", "./assets/icons/icon-512.png",
  "./assets/icons/maskable-icon-192.png", "./assets/icons/maskable-icon-512.png",
  "./assets/icons/apple-touch-icon-180.png"
];

/* Hosts that must never be touched: Firebase data, Auth, sessions,
   analytics. They are always plain network requests. */
const NETWORK_ONLY = [
  "firestore.googleapis.com", "firebase.googleapis.com", "firebaseappcheck.googleapis.com",
  "firebaseinstallations.googleapis.com", "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com", "www.googleapis.com", "apis.google.com",
  "google-analytics.com", "googletagmanager.com", "doubleclick.net"
];

const IMAGE_EXT = /\.(?:png|jpe?g|webp|gif|avif|svg|ico)$/i;
const SHELL_EXT = /\.(?:html|css|js|json|webmanifest)$/i;

const scope = self.registration.scope;
const abs = (u) => new URL(u, scope).href;
const PRECACHE_URLS = [...new Set(PRECACHE.map(abs))];
const SHELL_PATHS = new Set(PRECACHE_URLS.map((u) => new URL(u).pathname));
const OFFLINE_URL = abs("./offline.html");

/* ------------------------------------------------------------ install */
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    /* Add one by one — a single missing file must not abort the
       whole install (allSettled semantics, explicit for clarity). */
    await Promise.all(PRECACHE_URLS.map(async (url) => {
      try {
        const res = await fetch(new Request(url, { cache: "reload", credentials: "same-origin" }));
        if (res && res.ok) await cache.put(url, res);
      } catch { /* offline during install: runtime caching will fill in */ }
    }));
    await self.skipWaiting();
  })());
});

/* ----------------------------------------------------------- activate */
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((k) => k.startsWith("ga-") && !OWNED_CACHES.includes(k))
      .map((k) => caches.delete(k)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch { /* optional */ }
    }
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") self.skipWaiting();
  if (data.type === "GET_VERSION" && event.source) {
    event.source.postMessage({ type: "VERSION", version: VERSION });
  }
});

/* -------------------------------------------------------------- fetch */
self.addEventListener("fetch", (event) => {
  const request = event.request;

  /* Only GET is cacheable — writes (contacts form, marks, uploads) pass through. */
  if (request.method !== "GET") return;
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") return;

  let url;
  try { url = new URL(request.url); } catch { return; }

  /* Firebase / Auth / analytics: straight to the network, never cached,
     never served from cache, so tokens and user data stay uncached. */
  if (NETWORK_ONLY.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`) || url.host.includes(h))) return;

  if (url.origin === scope.origin) {
    if (request.mode === "navigate") {
      event.respondWith(handleNavigation(event));
      return;
    }
    if (IMAGE_EXT.test(url.pathname) && !SHELL_PATHS.has(url.pathname)) {
      event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, MAX_IMAGE_ENTRIES));
      return;
    }
    if (SHELL_PATHS.has(url.pathname) || SHELL_EXT.test(url.pathname)) {
      event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
      return;
    }
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
    return;
  }

  /* Third-party CDNs (Font Awesome, Google Fonts, the Firebase JS SDK):
     safe to cache because those URLs are versioned/immutable. */
  event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
});

/* ------------------------------------------------------- strategies */

/** Pages: always try the network so fresh HTML wins; fall back to the
 *  precached copy, then to the offline page. */
async function handleNavigation(event) {
  const request = event.request;
  const url = new URL(request.url);
  try {
    const preloaded = event.preloadResponse ? await event.preloadResponse : null;
    const fresh = preloaded || (await fetch(request));
    if (!fresh) throw new Error("empty response");
    return fresh;
  } catch {
    const candidates = [
      url.pathname,
      url.pathname.replace(/\/$/, "/index.html"),
      url.pathname + ".html"
    ];
    for (const path of candidates) {
      const hit = await caches.match(abs(path), { ignoreSearch: true });
      if (hit) return hit;
    }
    return offlineResponse(url.pathname);
  }
}

/** The cached offline page, told which page could not be reached. */
async function offlineResponse(from) {
  const cached = await caches.match(OFFLINE_URL, { ignoreSearch: true });
  if (!cached) {
    return new Response("You are offline. Please reconnect to the internet and try again.", {
      status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
  const target = new URL(OFFLINE_URL);
  if (from) target.searchParams.set("from", from);
  const body = await cached.blob();
  return new Response(body, {
    status: 200,
    headers: new Headers({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" })
  });
}

/** Cache first for instant loads, refresh in the background so a new
 *  deploy is picked up on the next visit. */
async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreVary: true });

  const network = fetch(request).then(async (res) => {
    if (res && (res.ok || res.type === "opaque") && (res.status === 200 || res.type === "opaque")) {
      try {
        await cache.put(request, res.clone());
        if (maxEntries) trim(cache, maxEntries);
      } catch { /* quota / opaque — ignore */ }
    }
    return res;
  }).catch(() => null);

  if (hit) {
    network.catch(() => {});
    return hit;
  }
  const res = await network;
  if (res) return res;

  /* Offline and uncached: for a page request hand back the offline shell. */
  if (request.mode === "navigate") {
    return offlineResponse(new URL(request.url).pathname);
  }
  return new Response("", { status: 504, statusText: "Offline" });
}

/** Keep image caches bounded so they can never grow without limit. */
async function trim(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)));
}