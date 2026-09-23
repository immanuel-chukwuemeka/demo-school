/* ==============================================================
 * STUDENT PORTAL — overview, results, attendance, requirements,
 * announcements, profile. Role-gated to `student`.
 * ============================================================== */
import { colRef, queryData, doc, getDoc } from "../../lib/db.js";
import { db } from "../../lib/firebase.js";
import { guardPage, logout, profileOf } from "../../lib/auth.js";
import { loadSettings, naira } from "../../lib/site.js";
import { esc, toast, openModal, fmtDate } from "../../lib/ui.js";

const MODULES = [
  { key: "overview", label: "Overview", icon: "fa-house" },
  { key: "results", label: "My Results", icon: "fa-file-lines" },
  { key: "attendance", label: "Attendance", icon: "fa-clipboard-user" },
  { key: "requirements", label: "Fees & Requirements", icon: "fa-receipt" },
  { key: "announcements", label: "Announcements", icon: "fa-bullhorn" },
  { key: "profile", label: "My Profile", icon: "fa-id-card" }
];

const title = (h1, sub = "") => `<div class="page-title"><div><h1>${h1}</h1><p>${sub}</p></div></div>`;

let me = null, settings = null;

async function announcementsEl() {
  const list = await queryData(colRef("announcements"));
  return (list.filter((a) => a.active !== false).map((a) => `
    <div class="ann-item${a.pinned ? " pinned" : ""}">
      <div class="flex" style="gap:10px;align-items:flex-start"><i class="fa-solid ${a.pinned ? "fa-thumbtack" : "fa-bullhorn"}" style="color:var(--color-accent)"></i>
      <div><b style="color:var(--color-primary-dark)">${esc(a.title)}</b><div style="color:var(--color-muted);font-size:.9rem">${a.body}</div></div></div></div>`).join("") || '<div class="empty-state"><p>No announcements.</p></div>');
}

async function overviewView() {
  const host = document.getElementById("viewRoot");
  host.innerHTML = title("Welcome back", `Session ${settings.session} · ${settings.term} Term`);
  const resultPath = `results/${settings.sessionKey}/${me.classKey}/${me.id}`;
  let result = null;
  try { result = (await getDoc(doc(db, resultPath))).data() || null; } catch (e) { /* not found */ }
  host.innerHTML += `
    <div class="dash-card hero-card" style="background:linear-gradient(120deg,var(--color-primary-dark),var(--color-primary-blue));color:#fff;border:none">
      <div class="flex" style="justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">
        <div class="flex" style="gap:14px;align-items:center">
          <img class="profile-pic" src="${esc(me.passport || "assets/images/students/student-default.png")}" alt="" style="border:3px solid var(--color-accent)">
          <div><h2 style="margin:0">${esc(me.fullName)}</h2>
          <div style="opacity:.85">${esc(me.className)} ${esc(me.arm || "")} · ${esc(me.admissionNumber)}</div></div>
        </div>
        <div class="stats-row" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));flex:1;max-width:520px">
          <div class="stat"><div><b style="color:#fff">${result ? result.average + " / " + result.maxTotal : "—"}</b><span style="color:rgba(255,255,255,.75)">Term Average</span></div></div>
          <div class="stat"><div><b style="color:#fff">${result ? result.grade : "—"}</b><span style="color:rgba(255,255,255,.75)">Overall Grade</span></div></div>
          <div class="stat"><div><b style="color:#fff">${result ? result.position + " of " + result.classSize : "—"}</b><span style="color:rgba(255,255,255,.75)">Position</span></div></div>
        </div>
      </div>
    </div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:16px" id="ovGrid">
      <div class="dash-card"><div class="dc-head"><i class="fa-solid fa-file-lines" style="color:var(--color-accent)"></i><b>Latest Report Sheet</b></div><div class="dc-body" id="ovResult"></div></div>
      <div class="dash-card"><div class="dc-head"><i class="fa-solid fa-bullhorn" style="color:var(--color-accent)"></i><b>Announcements</b></div><div class="dc-body" id="ovAnn"></div></div>
    </div>`;
  document.getElementById("ovAnn").innerHTML = await announcementsEl();
  const box = document.getElementById("ovResult");
  if (!result) { box.innerHTML = '<div class="empty-state"><p>No report sheet published for this term yet.</p></div>'; }
  else {
    box.innerHTML = `<div class="flex" style="justify-content:space-between"><span>Published ${settings.term} Term report — <b>${result.published ? "Available" : "Pending"}</b></span><span class="pill ${result.locked ? "navy" : "gold"}">${result.locked ? "Locked" : "Live"}</span></div>`;
    import("../../lib/result-view.js").then(({ renderResultSheet }) => { box.insertAdjacentHTML("beforeend", '<div style="max-height:48vh;overflow:auto;margin-top:12px">' + renderResultSheet(result, settings) + "</div>"); });
  }
}

async function resultsView() {
  const host = document.getElementById("viewRoot");
  host.innerHTML = title("My Results", `Current ${settings.term} term · ${settings.session}`);
  let result = null;
  try { result = (await getDoc(doc(db, `results/${settings.sessionKey}/${me.classKey}/${me.id}`))).data() || null; } catch (e) { /* */ }
  const box = `<div class="dash-card"><div class="dc-body" id="resBox"></div></div>`;
  host.innerHTML += box;
  const rb = document.getElementById("resBox");
  if (!result) { rb.innerHTML = '<div class="empty-state"><p>No report sheet yet. Check again after results are published.</p></div>'; return; }
  import("../../lib/result-view.js").then(({ renderResultSheet, downloadResultPDF }) => {
    const sEl = document.createElement("div");
    sEl.innerHTML = renderResultSheet(result, settings);
    sEl.querySelectorAll("script").forEach((s) => s.remove());
    rb.innerHTML = sEl.innerHTML + `<div class="flex mt-3" style="gap:10px">
      <button class="btn btn-gold btn-sm" id="dlPdf"><i class="fa-solid fa-file-pdf"></i> Download Result PDF</button>
      <button class="btn btn-navy btn-sm" onclick="window.print()"><i class="fa-solid fa-print"></i> Print</button></div>`;
    document.getElementById("dlPdf").addEventListener("click", () => downloadResultPDF(result));
  });
}

async function attendanceView() {
  const host = document.getElementById("viewRoot");
  host.innerHTML = title("My Attendance", `${settings.term} term · ${settings.session}`);
  let score = null;
  try { score = (await getDoc(doc(db, "scores", `${settings.sessionKey}_${me.classKey}_${me.id}`))).data() || null; } catch (e) { /* */ }
  const a = score?.attendance || {};
  const present = +a.present || 0, days = +a.daysOpen || 0;
  host.innerHTML += `
    <div class="stats-row">
      <div class="stat"><i class="fa-solid fa-calendar-days" style="background:rgba(13,27,42,.1);color:var(--color-primary-dark)"></i><div><b>${days}</b><span>School Days</span></div></div>
      <div class="stat"><i class="fa-solid fa-circle-check" style="background:rgba(13,116,62,.1);color:var(--color-success)"></i><div><b>${present}</b><span>Days Present</span></div></div>
      <div class="stat"><i class="fa-solid fa-circle-xmark" style="background:rgba(180,40,40,.1);color:#DC2626"></i><div><b>${+a.absent || 0}</b><span>Days Absent</span></div></div>
      <div class="stat"><i class="fa-solid fa-percent" style="background:rgba(255,107,0,.15);color:var(--color-accent)"></i><div><b>${days ? ((present / days) * 100).toFixed(1) : 0}%</b><span>Attendance Rate</span></div></div>
    </div>
    <div class="dash-card mt-3"><div class="dc-body">
      <div class="progress-track"><div class="progress-fill ${present >= days * 0.85 ? "ok" : present >= days * 0.7 ? "warn" : "low"}" style="width:${days ? Math.min(100, (present / days) * 100) : 0}%"></div></div>
      <p class="muted mt-2">Attendance of <b>${present >= days * 0.85 ? "excellent" : present >= days * 0.7 ? "good" : "poor"}</b> —${a.formTeacherRemark ? " Form teacher: " + esc(a.formTeacherRemark) : ""}</p>
    </div></div>`;
}

async function requirementsView() {
  const host = document.getElementById("viewRoot");
  host.innerHTML = title("Fees & Requirements", `${me.className} requirement list`);
  const data = (await getDoc(doc(db, "requirements", me.classKey))).data() || null;
  host.innerHTML += `<div class="dash-card"><div class="dc-body" id="reqBox">${data ? `<div class="table-wrap"><table class="pub-table">
    ${[["tuition", "Tuition"], ["uniform", "Uniform"], ["books", "Books"], ["pta", "PTA"], ["development", "Development Levy"], ["toiletries", "Toiletries"], ["sports", "Sports"], ["ict", "ICT"], ["transport", "Transport"], ["other", "Other Fees"]].map(([k, l]) => `<tr><td>${l}</td><td style="text-align:right"><b>${naira(data[k] || 0)}</b></td></tr>`).join("")}
    <tr class="total-row"><td><b>Total</b></td><td style="text-align:right"><b>${naira(data.total || 0)}</b></td></tr></table></div>
    <button class="btn btn-navy btn-sm mt-3" onclick="window.open('requirements.html','_blank')"><i class="fa-solid fa-receipt"></i> View in website</button>` : '<div class="empty-state"><p>Requirement list not published yet.</p></div>'}</div></div>`;
}

async function announcementsView() {
  const host = document.getElementById("viewRoot");
  host.innerHTML = title("Announcements", "Updates from school administration.");
  host.innerHTML += `<div class="dash-card"><div class="dc-body" id="annBox"></div></div>`;
  document.getElementById("annBox").innerHTML = await announcementsEl();
}

async function profileView() {
  const host = document.getElementById("viewRoot");
  host.innerHTML = title("My Profile", "Your record at Greenwood Academy.");
  host.innerHTML += `<div class="dash-card"><div class="dc-body">
    <div class="flex" style="gap:16px;align-items:center;flex-wrap:wrap">
      <img class="profile-pic" src="${esc(me.passport || "assets/images/students/student-default.png")}" alt="">
      <div><h3 style="color:var(--color-primary-dark)">${esc(me.fullName)}</h3>
      <div style="color:var(--color-muted)">${esc(me.className)} ${esc(me.arm || "")} · ${esc(me.house || "—")} House</div>
      <div style="color:var(--color-muted)">Adm No: ${esc(me.admissionNumber)}</div></div></div>
    <hr style="border:0;border-top:1px solid var(--color-border);margin:18px 0">
    <div class="form-grid">
      <div class="kv"><span>Date of Birth</span><b>${esc(me.dob || "—")}</b></div>
      <div class="kv"><span>Gender</span><b>${esc(me.gender || "—")}</b></div>
      <div class="kv"><span>Parent / Guardian</span><b>${esc(me.parent || "—")}</b></div>
      <div class="kv"><span>Parent Phone</span><b>${esc(me.phone || "—")}</b></div>
      <div class="kv" style="grid-column:1/-1"><span>Address</span><b>${esc(me.address || "—")}</b></div>
    </div></div></div>`;
}

const views = { overview: overviewView, results: resultsView, attendance: attendanceView, requirements: requirementsView, announcements: announcementsView, profile: profileView };

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

function renderSidebar() {
  document.getElementById("sideNav").innerHTML = MODULES.map((m) => `<button class="side-link" data-module="${m.key}" type="button"><i class="fa-solid ${m.icon}"></i> ${m.label}</button>`).join("");
  document.querySelectorAll("[data-module]").forEach((b) => b.addEventListener("click", () => { location.hash = b.dataset.module; closeDrawer(); }));
}

guardPage("student", async (user) => {
  document.getElementById("logoutBtn").addEventListener("click", () => logout());
  const menuBtn = document.getElementById("menuBtn");
  const backdrop = document.getElementById("sideBackdrop");
  const sideClose = document.getElementById("sideClose");
  menuBtn.onclick = () => { document.getElementById("dashSide").classList.contains("open") ? closeDrawer() : openDrawer(); };
  backdrop.onclick = () => closeDrawer();
  if (sideClose) sideClose.onclick = () => closeDrawer();
  settings = await loadSettings(true);
  window.__settings = settings;
  const { uid } = await profileOf(user);
  const id = uid || user.uid;
  const snap = await getDoc(doc(db, "students", id));
  me = snap.exists() ? { id: snap.id, ...snap.data() } : null;
  if (!me) {
    document.getElementById("authGate").classList.add("hidden");
    document.getElementById("appRoot").classList.remove("hidden");
    document.getElementById("viewRoot").innerHTML = `<div class="dash-card"><div class="dc-body"><div class="empty-state"><p>No student record found for this account. Contact the office if this is a mistake.</p></div></div></div>`;
    return;
  }
  document.getElementById("userName").textContent = me.fullName;
  document.getElementById("userRole").textContent = me.className + (me.arm ? " " + me.arm : "");
  document.getElementById("userAvatar").src = me.passport || "assets/logo/favicon.svg";
  renderSidebar();
  const route = () => {
    closeDrawer();
    const key = (location.hash.replace("#", "") || "overview").trim();
    document.querySelectorAll("[data-module]").forEach((b) => b.classList.toggle("active", b.dataset.module === key));
    (views[key] || views.overview)();
  };
  window.addEventListener("hashchange", route);
  route();
});