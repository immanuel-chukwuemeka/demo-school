/* ==============================================================
 * ADMIN — Dashboard overview (stats + charts).
 * ============================================================== */
import { colRef, getDocs, queryData, qWhere } from "../../lib/db.js";
import { db } from "../../lib/firebase.js";
import { collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { viewTitle } from "./shell.js";
import { esc } from "../../lib/ui.js";

let charts = [];

function destroyCharts() { charts.forEach((c) => { try { c.destroy(); } catch {} }); charts = []; }

let resultCnt = null;
async function countResults() {
  if (resultCnt) return resultCnt;
  try {
    const s = window.__settings || {};
    const sk = s.sessionKey || "2026-2027_first";
    const classes = await getDocs(colRef("classes"));
    let cnt = 0, pub = 0;
    await Promise.all(classes.docs.map(async (c) => {
      const snap = await getDocs(collection(db, "results", sk, c.id));
      snap.forEach((d) => { cnt++; if (d.data().published) pub++; });
    }));
    resultCnt = [cnt, pub];
  } catch { resultCnt = [0, 0]; }
  return resultCnt;
}

export default function dashboard() {
  const host = document.getElementById("viewRoot");
  const s = window.__settings || {};
  host.innerHTML = `${viewTitle("Dashboard", "Welcome back, Administrator. Here's the school at a glance today.")}
    <div class="dash-stats" id="dashStats"><div style="grid-column:1/-1;display:grid;place-items:center;padding:40px"><div class="loader"></div></div></div>
    <div class="dash-grid-2">
      <div class="dash-card"><div class="dc-head"><h3><i class="fa-solid fa-chart-pie" style="color:var(--color-accent)"></i> Student Distribution by Level</h3></div><div class="dc-body chart-wrap"><canvas id="chLevel"></canvas></div></div>
      <div class="dash-card"><div class="dc-head"><h3><i class="fa-solid fa-chart-column" style="color:var(--color-accent)"></i> Students per Class</h3></div><div class="dc-body chart-wrap"><canvas id="chClass"></canvas></div></div>
    </div>
    <div class="dash-grid-2">
      <div class="dash-card"><div class="dc-head"><h3><i class="fa-solid fa-users" style="color:var(--color-accent)"></i> Staff by Department</h3></div><div class="dc-body chart-wrap"><canvas id="chDept"></canvas></div></div>
      <div class="dash-card"><div class="dc-head"><h3><i class="fa-solid fa-file-circle-check" style="color:var(--color-accent)"></i> Results Status (${esc(s.session)} · ${esc(s.term)} Term)</h3></div><div class="dc-body chart-wrap"><canvas id="chResults"></canvas></div></div>
    </div>
    <div class="dash-card"><div class="dc-head"><h3><i class="fa-solid fa-bullhorn" style="color:var(--color-accent)"></i> Latest Announcements</h3></div><div class="dc-body" id="annFeed"></div></div>`;

  const h = (v, lbl, ic, cls) => ` <div class="dash-stat"><div class="ds-ic ${cls}"><i class="fa-solid ${ic}"></i></div><div><b>${v}</b><span>${lbl}</span></div></div>`;

  Promise.all([
    getDocs(colRef("students")).then((s) => s.size),
    getDocs(colRef("staff")).then((s) => s.size),
    getDocs(colRef("classes")).then((s) => s.size),
    countResults()
  ]).then(async ([totStudents, totStaff, totClasses, [results, published]]) => {
    const snap = await getDocs(colRef("staff"));
    let teaching = 0, non = 0;
    snap.forEach((d) => { if (d.data().type === "Teaching") teaching++; else non++; });
    const pending = results - published;
    document.getElementById("dashStats").innerHTML =
      h(totStudents, "Total Students", "fa-user-graduates", "gold") +
      h(totStaff, "Total Staff", "fa-user-tie", "navy") +
      h(teaching, "Teaching Staff", "fa-chalkboard-user", "green") +
      h(`${totClasses}`, "Classes", "fa-school", "red");
    document.getElementById("dashStats").insertAdjacentHTML("beforeend",
      h(non, "Non-Teaching", "fa-briefcase", "navy") +
      h(results, "Results Submitted", "fa-file-circle-check", "green") +
      h(pending, "Pending Result Publish", "fa-hourglass-half", "red") +
      h(`${esc(s.session)} · ${esc(s.term)}`, "Current Session", "fa-calendar", "gold"));
  }).catch(console.error);

  // Charts
  (async () => {
    const [[students, staff], [results, published]] = await Promise.all([Promise.all([queryData(colRef("students")), queryData(colRef("staff"))]), countResults()]);
    const pending = results - published;
    const levelCount = { creche: 0, nursery: 0, primary: 0, secondary: 0 };
    students.forEach((st) => { const l = (st.level || "").toLowerCase(); levelCount[l] = (levelCount[l] || 0) + 1; });
    destroyCharts();
    if (window.Chart) {
      const navy = "#0D1B2A", royal = "#1E3A8A", acc = "#FF6B00", info = "#2563EB", ok = "#16A34A", bad = "#DC2626";
      charts.push(new Chart(document.getElementById("chLevel"), {
        type: "doughnut",
        data: { labels: ["Creche", "Nursery", "Primary", "Secondary"], datasets: [{ data: [levelCount.creche, levelCount.nursery, levelCount.primary, levelCount.secondary], backgroundColor: [navy, royal, acc, info] }] },
        options: { plugins: { legend: { position: "bottom" } } }
      }));

      const classCount = {};
      students.forEach((st) => { const c = st.className || "?"; classCount[c] = (classCount[c] || 0) + 1; });
      const keys = Object.keys(classCount).sort();
      charts.push(new Chart(document.getElementById("chClass"), {
        type: "bar",
        data: { labels: keys, datasets: [{ label: "Students", data: keys.map((k) => classCount[k]), backgroundColor: acc }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
      }));

      const dept = {};
      staff.forEach((st) => { const d = st.department || "General"; dept[d] = (dept[d] || 0) + 1; });
      charts.push(new Chart(document.getElementById("chDept"), {
        type: "doughnut",
        data: { labels: Object.keys(dept), datasets: [{ data: Object.values(dept), backgroundColor: [navy, royal, acc, info, ok] }] },
        options: { plugins: { legend: { position: "bottom" } } }
      }));

      const resCtx = document.getElementById("chResults");
      if (resCtx) {
        charts.push(new Chart(resCtx, {
          type: "bar",
          data: { labels: ["Submitted", "Published", "Pending"], datasets: [{ data: [results, published, pending], backgroundColor: [info, ok, bad] }] },
          options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
        }));
      }
    }
  })().catch(console.error);

  (async () => {
    try {
      const anns = await queryData(colRef("announcements"));
      anns.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      document.getElementById("annFeed").innerHTML = anns.slice(0, 5).map((a) => `
        <div class="flex" style="justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--color-border)">
          <div class="flex" style="gap:12px;flex:1"><i class="fa-solid ${a.type === "Holiday" ? "fa-umbrella-beach" : a.type === "Exam" ? "fa-file-pen" : a.type === "Event" ? "fa-calendar-day" : "fa-bullhorn"}" style="color:var(--color-accent)"></i>
            <div><b style="color:var(--color-primary-dark)">${esc(a.title)}</b><div style="color:var(--color-muted);font-size:.85rem">${esc(a.body || "").slice(0, 120)}</div></div></div>
          <span class="pill gold">${esc(a.type)}</span></div>`).join("") || '<div class="empty-state"><p>No announcements yet.</p></div>';
    } catch { document.getElementById("annFeed").innerHTML = '<div class="empty-state"><p>No announcements yet.</p></div>'; }
  })();
}