/* ==============================================================
 * ADMIN SHELL — sidebar nav, hash routing, mobile drawer.
 * ============================================================== */
import { logout, guardPage } from "../../lib/auth.js";
import { loadSettings } from "../../lib/site.js";

export const MODULES = [
  { key: "dashboard", label: "Dashboard", icon: "fa-gauge-high" },
  { key: "students", label: "Students", icon: "fa-user-graduates" },
  { key: "staff", label: "Staff", icon: "fa-chalkboard-user" },
  { key: "classes", label: "Classes", icon: "fa-school" },
  { key: "subjects", label: "Subjects", icon: "fa-book-open" },
  { key: "departments", label: "Departments", icon: "fa-building-columns" },
  { key: "fees", label: "Fees", icon: "fa-naira-sign" },
  { key: "requirements", label: "Requirements", icon: "fa-receipt" },
  { key: "prospectus", label: "Prospectus", icon: "fa-folder-open" },
  { key: "results", label: "Results", icon: "fa-file-pen" },
  { key: "scratchcards", label: "Scratch Cards", icon: "fa-ticket" },
  { key: "announcements", label: "Announcements", icon: "fa-bullhorn" },
  { key: "gallery", label: "Gallery", icon: "fa-images" },
  { key: "news", label: "News & Blog", icon: "fa-newspaper" },
  { key: "settings", label: "Settings", icon: "fa-gears" }
];

function openDrawer() {
  document.getElementById("dashSide")?.classList.add("open");
  document.getElementById("sideBackdrop")?.classList.add("show");
  document.getElementById("menuBtn")?.classList.add("active");
}

function closeDrawer() {
  document.getElementById("dashSide")?.classList.remove("open");
  document.getElementById("sideBackdrop")?.classList.remove("show");
  document.getElementById("menuBtn")?.classList.remove("active");
}

export function bootShell(views) {
  guardPage("admin", async (user) => {
    const s = await loadSettings(true);
    window.__settings = s;
    renderSidebar(views);
    document.getElementById("userName").textContent = user.email || "Admin";
    document.getElementById("userAvatar").src = "assets/logo/favicon.svg";
    document.getElementById("logoutBtn").addEventListener("click", () => logout());

    const menuBtn = document.getElementById("menuBtn");
    const backdrop = document.getElementById("sideBackdrop");
    const sideClose = document.getElementById("sideClose");
    menuBtn.onclick = () => { document.getElementById("dashSide").classList.contains("open") ? closeDrawer() : openDrawer(); };
    backdrop.onclick = () => closeDrawer();
    if (sideClose) sideClose.onclick = () => closeDrawer();

    const route = () => {
      closeDrawer();
      const key = (location.hash.replace("#", "") || "dashboard").trim();
      setActive(key);
      views[key] ? views[key]() : (location.hash = "#dashboard");
    };
    window.addEventListener("hashchange", route);
    route();
  });
}

let currentView = null;
function setActive(key) {
  currentView = key;
  document.querySelectorAll("[data-module]").forEach((n) => n.classList.toggle("active", n.dataset.module === key));
}

export function navigate(key) { location.hash = key; }

export function viewTitle(title, subtitle = "", actions = "") {
  return `<div class="page-title"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="flex" style="flex-wrap:wrap">${actions}</div></div>`;
}

function renderSidebar(views) {
  const groups = [
    { label: "Overview", items: ["dashboard"] },
    { label: "People", items: ["students", "staff"] },
    { label: "Academics", items: ["classes", "subjects", "departments", "results"] },
    { label: "Finance", items: ["fees", "requirements", "prospectus"] },
    { label: "Operations", items: ["scratchcards", "announcements", "gallery", "news"] },
    { label: "System", items: ["settings"] }
  ];
  document.getElementById("sideNav").innerHTML = groups.map((g) => `
    <div class="side-label">${g.label}</div>
    ${g.items.map((k) => {
      const m = MODULES.find((x) => x.key === k);
      return `<button class="side-link" data-module="${k}" type="button"><i class="fa-solid ${m.icon}"></i> ${m.label}</button>`;
    }).join("")}`).join("");
  document.querySelectorAll("[data-module]").forEach((btn) => {
    btn.addEventListener("click", () => { navigate(btn.dataset.module); closeDrawer(); });
  });
  const search = document.getElementById("globalSearch");
  if (search) search.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) return;
    const viewsWithListEls = ["students", "staff", "classes"];
    if (viewsWithListEls.includes(currentView) && window.__gridFilter) window.__gridFilter(q);
  });
}