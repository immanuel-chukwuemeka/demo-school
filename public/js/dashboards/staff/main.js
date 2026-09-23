/* ==============================================================
 * STAFF PORTAL — marksheet capture, form-teacher attendance,
 * published results, announcements. Role-gated to `staff`.
 * ============================================================== */
import { colRef, queryData, doc, getDoc, setDoc, updateDoc, onSnapshot } from "../../lib/db.js";
import { db } from "../../lib/firebase.js";
import { guardPage, logout } from "../../lib/auth.js";
import { loadSettings } from "../../lib/site.js";
import { esc, toast, openModal } from "../../lib/ui.js";
import { classKeyOf } from "../../pages/requirements.js";

const MODULES = [
  { key: "marksheets", label: "Mark Sheets", icon: "fa-table" },
  { key: "attendance", label: "Attendance", icon: "fa-clipboard-user" },
  { key: "reports", label: "Results", icon: "fa-file-lines" },
  { key: "announcements", label: "Announcements", icon: "fa-bullhorn" },
  { key: "profile", label: "My Profile", icon: "fa-id-card" }
];

const LEVEL_LABEL = { creche: "Creche", nursery: "Nursery", primary: "Primary", secondary: "Secondary" };
const classDisplay = (key) => {
  const groups = { creche1: "Creche 1", creche2: "Creche 2", nursery1: "Nursery 1", nursery2: "Nursery 2", p1: "Primary 1", p2: "Primary 2", p3: "Primary 3", p4: "Primary 4", p5: "Primary 5", p6: "Primary 6", jss1: "JSS1", jss2: "JSS2", jss3: "JSS3", ss1: "SS1", ss2: "SS2", ss3: "SS3" };
  return groups[key] || key;
};

let currentStaff = null;
let sessionKey = "2026-2027_first";
let assignments = [], subjects = [], classes = [], students = [];

async function loadContext() {
  const s = await loadSettings(true);
  sessionKey = s.sessionKey || "2026-2027_first";
  [assignments, subjects, classes, students] = await Promise.all([
    queryData(colRef("teacherAssignments")),
    queryData(colRef("subjects")),
    queryData(colRef("classes")),
    queryData(colRef("students"))
  ]);
}

function staffAssignments() {
  return assignments.filter((a) => a.teacherId === currentStaff.id);
}

function taughtClasses(includeForm = true) {
  const keys = new Set(staffAssignments().map((a) => a.classId));
  if (includeForm) return [...keys];
  staffAssignments().filter((a) => a.isFormTeacher).forEach((a) => keys.delete(a.classId));
  return [...keys];
}

async function getScoreDoc(studentId, classKey) {
  const ref = doc(db, "scores", sessionKey + "_" + classKey + "_" + studentId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : { sessionKey, classId: classKey, term: sessionKey.split("_")[1], attendance: {}, subjects: {} };
}

async function saveScoreMerged(studentId, classKey, patch) {
  const cur = await getScoreDoc(studentId, classKey);
  const merged = { ...cur, ...patch };
  await setDoc(doc(db, "scores", sessionKey + "_" + classKey + "_" + studentId), merged);
}

const title = (h1, sub = "", actions = "") => `<div class="page-title"><div><h1>${h1}</h1><p>${sub}</p></div><div class="flex" style="flex-wrap:wrap">${actions}</div></div>`;

/* ---------------- MARKSHEET ENTRY ---------------- */
async function marksheetView() {
  const host = document.getElementById("viewRoot");
  const assignments = staffAssignments();
  if (!assignments.length) {
    host.innerHTML = title("My Mark Sheets", "You have no subject assignments yet. The administrator will assign you classes.");
    return;
  }
  const groups = [...new Set(assignments.map((a) => a.classId))];
  host.innerHTML = title("My Mark Sheets", "Select a class + subject to award CA1 (20), CA2 (20) and Exam (60).", "");
  host.innerHTML += `<div class="stats-row" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))" id="taCards"></div><div class="dash-card mt-3" id="sheetCard"><div class="dc-body" id="sheetBody"><div class="empty-state"><p>Pick a class to begin entering scores.</p></div></div></div>`;
  document.getElementById("taCards").innerHTML = groups.map((ck) => {
    const as = assignments.filter((a) => a.classId === ck);
    return `<div class="stat stat-card" data-open="${ck}"><i class="fa-solid fa-chalkboard" style="background:rgba(13,27,42,.1);color:var(--color-primary-dark)"></i><div><b>${classDisplay(ck)}</b><span>${as.map((a) => subjects.find((s) => s.id === a.subjectId)?.name || a.subjectId).join(" · ")}</span></div></div>`;
  }).join("");

  const openSheet = async (classKey, subjectId) => {
    const body = document.getElementById("sheetBody");
    const cls = students.filter((s) => s.classKey === classKey).sort((a, b) => a.fullName.localeCompare(b.fullName));
    const sub = subjects.find((s) => s.id === subjectId);
    const scores = new Map();
    await Promise.all(cls.map(async (s) => scores.set(s.id, (await getScoreDoc(s.id, classKey)).subjects?.[subjectId] || {})));
    body.innerHTML = `
      <div class="flex mb-2" style="justify-content:space-between;flex-wrap:wrap">
        <b style="color:var(--color-primary-dark);font-size:1.05rem"><i class="fa-solid fa-table-list"></i> ${classDisplay(classKey)} — ${esc(sub?.name || "")} (CA1 20 · CA2 20 · Exam 60)</b>
        <div class="flex"><button class="dbtn dbtn-navy" id="saveSheet"><i class="fa-solid fa-floppy-disk"></i> Save ${cls.length} Students</button></div>
      </div>
      <div class="dtable-wrap"><table class="dtable"><thead><tr><th>#</th><th>Student</th><th>Adm No</th><th>CA1</th><th>CA2</th><th>Exam</th><th>Total</th></tr></thead>
      <tbody>${cls.map((s, i) => { const sc = scores.get(s.id) || {}; return `
        <tr><td>${i + 1}</td><td><b>${esc(s.fullName)}</b></td><td><span class="pill navy">${esc(s.admissionNumber)}</span></td>
        <td><input class="score-in" data-id="${esc(s.id)}" data-f="ca1" min="0" max="20" value="${sc.ca1 ?? ""}"></td>
        <td><input class="score-in" data-id="${esc(s.id)}" data-f="ca2" min="0" max="20" value="${sc.ca2 ?? ""}"></td>
        <td><input class="score-in" data-id="${esc(s.id)}" data-f="exam" min="0" max="60" value="${sc.exam ?? ""}"></td>
        <td><b class="sheet-total" data-id="${esc(s.id)}"></b></td></tr>`; }).join("")}</tbody></table></div>`;
    body.querySelectorAll(".score-in").forEach((inp) => inp.addEventListener("input", () => {
      const row = inp.closest("tr");
      const vs = row.querySelectorAll("input");
      const total = [0, 1, 2].reduce((a, i) => a + (+vs[i].value || 0), 0);
      row.querySelector(".sheet-total").textContent = total;
    }));
    body.querySelectorAll(".score-in").forEach((inp) => inp.dispatchEvent(new Event("input")));
    document.getElementById("saveSheet").addEventListener("click", async () => {
      const byStudent = {};
      body.querySelectorAll(".score-in").forEach((inp) => {
        const id = inp.dataset.id;
        byStudent[id] = byStudent[id] || {};
        byStudent[id][inp.dataset.f] = Math.max(0, Math.min(+inp.value || 0, inp.max || 60));
      });
      for (const [id, values] of Object.entries(byStudent)) {
        const cur = await getScoreDoc(id, classKey);
        await setDoc(doc(db, "scores", sessionKey + "_" + classKey + "_" + id), { ...cur, subjects: { ...cur.subjects, [subjectId]: values } });
      }
      toast(`Saved marks for ${Object.keys(byStudent).length} students in ${sub?.name}.`, "success", "Sheet Saved");
    });
  };

  document.getElementById("taCards").addEventListener("click", (e) => {
    const card = e.target.closest("[data-open]");
    if (!card) return;
    const as = assignments.filter((a) => a.classId === card.dataset.open);
    if (as.length === 1) { openSheet(as[0].classId, as[0].subjectId); return; }
    const m = openModal(`<p class="muted mb-2">Choose a subject for <b>${classDisplay(card.dataset.open)}</b>:</p>
      ${as.map((a, i) => `<button class="subject-pick" data-i="${i}" style="display:block;width:100%;text-align:left;padding:10px;border:1.5px solid var(--color-border);border-radius:10px;margin-bottom:8px;cursor:pointer"><b>${esc(subjects.find((s) => s.id === a.subjectId)?.name || a.subjectId)}</b>${a.isFormTeacher ? ' <span class="chip gold">Form Teacher</span>' : ""}</button>`).join("")}
      <button class="dbtn dbtn-soft" id="multiAll" style="width:100%"><i class="fa-solid fa-layer-group"></i> Enter all subjects together</button>`, "Choose Subject", "fa-book");
    m.overlay.querySelectorAll(".subject-pick").forEach((b) => b.addEventListener("click", () => {
      const a = as[+b.dataset.i];
      m.close(); openSheet(a.classId, a.subjectId);
    }));
    m.overlay.querySelector("#multiAll").addEventListener("click", () => { m.close(); multiSheet(card.dataset.open); });
  });

  async function multiSheet(classKey) {
    const as = assignments.filter((a) => a.classId === classKey);
    const body = document.getElementById("sheetBody");
    const cls = students.filter((s) => s.classKey === classKey).sort((a, b) => a.fullName.localeCompare(b.fullName));
    const scores = new Map();
    await Promise.all(cls.map(async (s) => scores.set(s.id, (await getScoreDoc(s.id, classKey)).subjects || {})));
    body.innerHTML = `
      <div class="flex mb-2" style="justify-content:space-between">
        <b style="color:var(--color-primary-dark)">${classDisplay(classKey)} — all my subjects</b>
        <button class="dbtn dbtn-navy" id="saveMulti"><i class="fa-solid fa-floppy-disk"></i> Save All</button></div>
      <div class="table-wrap" style="overflow-x:auto"><table class="dtable" style="min-width:${as.length * 110 + 200}px">
        <thead><tr><th>Student</th>${as.map((a) => `<th>${esc(subjects.find((s) => s.id === a.subjectId)?.name || "")}</th>`).join("")}</tr></thead>
        <tbody>${cls.map((s, i) => {
          const cells = as.map((a) => { const v = scores.get(s.id)?.[a.subjectId] || {}; const t = (+v.ca1 || 0) + (+v.ca2 || 0) + (+v.exam || 0); return `<td><input class="multi-in" data-id="${esc(s.id)}" data-sub="${esc(a.subjectId)}" data-f="ca1" style="width:40px" value="${v.ca1 ?? ""}"><span style="opacity:.4">/20</span> <input class="multi-in" data-id="${esc(s.id)}" data-sub="${esc(a.subjectId)}" data-f="ca2" style="width:40px" value="${v.ca2 ?? ""}"><span style="opacity:.4">/20</span> <input class="multi-in" data-id="${esc(s.id)}" data-sub="${esc(a.subjectId)}" data-f="exam" style="width:44px" value="${v.exam ?? ""}"><span style="opacity:.4">/60</span> <b class="m-total" style="color:var(--color-primary-dark)">${t}</b></td>`; }).join("");
          return `<tr><td><b>${esc(s.fullName)}</b></td>${cells}</tr>`;
        }).join("")}</tbody></table></div>`;
    body.querySelectorAll(".multi-in").forEach((inp) => inp.addEventListener("input", () => {
      const box = inp.closest("td");
      const ins = box.querySelectorAll("input");
      box.querySelector(".m-total").textContent = [0, 1, 2].reduce((a, i) => a + (+ins[i].value || 0), 0);
    }));
    document.getElementById("saveMulti").addEventListener("click", async () => {
      const byStudent = {};
      body.querySelectorAll(".multi-in").forEach((inp) => {
        const id = inp.dataset.id;
        byStudent[id] = byStudent[id] || {};
        byStudent[id][inp.dataset.sub] = byStudent[id][inp.dataset.sub] || {};
        byStudent[id][inp.dataset.sub][inp.dataset.f] = Math.max(0, Math.min(+inp.value || 0, 60));
      });
      for (const [id, subs] of Object.entries(byStudent)) {
        const cur = await getScoreDoc(id, classKey);
        await setDoc(doc(db, "scores", sessionKey + "_" + classKey + "_" + id), { ...cur, subjects: { ...cur.subjects, ...subs } });
      }
      toast(`Saved all subjects for ${Object.keys(byStudent).length} students.`, "success", "Sheet Saved");
    });
  }
}

/* ---------------- ATTENDANCE ---------------- */
async function attendanceView() {
  const host = document.getElementById("viewRoot");
  const formAssigns = staffAssignments().filter((a) => a.isFormTeacher);
  if (!formAssigns.length) { host.innerHTML = title("Attendance", "You are not assigned as a form teacher yet."); return; }
  const classKeys = [...new Set(formAssigns.map((a) => a.classId))];
  host.innerHTML = title("Form Class Attendance", "Register daily/term attendance and the form teacher remark for your class.");
  host.innerHTML += `<div class="flex mb-3" style="gap:10px;flex-wrap:wrap"><select id="attClass">${classKeys.map((ck) => `<option value="${ck}">${classDisplay(ck)}</option>`).join("")}</select>
    <button class="dbtn dbtn-navy" id="saveAtt"><i class="fa-solid fa-floppy-disk"></i> Save Attendance</button></div>
    <div class="dash-card"><div class="dc-body">
      <div class="stats-row" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
        <div class="stat"><i class="fa-solid fa-calendar-days" style="background:rgba(13,27,42,.1);color:var(--color-primary-dark)"></i><div><b id="aDays">0</b><span>Days Open</span></div></div>
        <div class="stat"><i class="fa-solid fa-circle-check" style="background:rgba(13,116,62,.1);color:var(--color-success)"></i><div><b id="aPres">0</b><span>Present</span></div></div>
        <div class="stat"><i class="fa-solid fa-circle-xmark" style="background:rgba(180,40,40,.1);color:#DC2626"></i><div><b id="aAbs">0</b><span>Absent</span></div></div>
        <div class="stat"><i class="fa-solid fa-percent" style="background:rgba(255,107,0,.15);color:var(--color-accent)"></i><div><b id="aPct">0%</b><span>Present %</span></div></div>
      </div>
      <div class="form-field mt-3"><label>Days Open (term so far)</label><input type="number" id="daysOpen" value="90"></div>
      <div class="form-field"><label>Form Teacher Remark</label><input id="remark" value="A promising result. Encouraged to keep improving."></div>
      <div class="dtable-wrap mt-3"><table class="dtable"><thead><tr><th>Student</th><th>Adm No</th><th>Present</th><th>Absent</th></tr></thead><tbody id="attRows"></tbody></table></div>
    </div></div>`;

  const attClass = document.getElementById("attClass");
  const renderAtt = async () => {
    const ck = attClass.value;
    const cls = students.filter((s) => s.classKey === ck).sort((a, b) => a.admissionNumber.localeCompare(b.admissionNumber));
    if (!cls.length) { document.getElementById("attRows").innerHTML = '<tr><td colspan="4"><div class="empty-state"><p>No students in this class.</p></div></td></tr>'; return; }
    const sample = await getScoreDoc(cls[0].id, ck);
    document.getElementById("daysOpen").value = sample.attendance?.daysOpen || 90;
    if (sample.attendance?.formTeacherRemark) document.getElementById("remark").value = sample.attendance.formTeacherRemark;
    const atts = new Map();
    await Promise.all(cls.map(async (s) => atts.set(s.id, (await getScoreDoc(s.id, ck)).attendance || {})));
    document.getElementById("attRows").innerHTML = cls.map((s, i) => {
      const a = atts.get(s.id) || {};
      const present = a.present ?? (i % 2 === 0 ? 88 : 91);
      return `<tr><td><b>${esc(s.fullName)}</b></td><td><span class="pill navy">${esc(s.admissionNumber)}</span></td>
        <td><input class="att-in" type="number" data-id="${esc(s.id)}" data-f="present" min="0" max="90" value="${present}"></td>
        <td><input class="att-in" type="number" data-id="${esc(s.id)}" data-f="absent" min="0" max="90" value="${a.absent ?? 0}" readonly style="background:var(--color-cloud);color:var(--color-muted)"></td></tr>`;
    }).join("");
    document.getElementById("attRows").querySelectorAll(".att-in").forEach((inp) => inp.addEventListener("input", () => {
      const row = inp.closest("tr");
      if (inp.dataset.f === "present") {
        const days = +document.getElementById("daysOpen").value || 90;
        row.querySelector('[data-f="absent"]').value = Math.max(0, days - (+inp.value || 0));
      }
      recalc();
    }));
    const recalc = () => {
      const days = +document.getElementById("daysOpen").value || 0;
      let pres = 0, abs = 0, n = 0;
      document.getElementById("attRows").querySelectorAll(".att-in[data-f=present]").forEach((x) => { pres += +x.value || 0; n++; });
      document.getElementById("attRows").querySelectorAll(".att-in[data-f=absent]").forEach((x) => { abs += +x.value || 0; });
      document.getElementById("aDays").textContent = days;
      document.getElementById("aPres").textContent = pres;
      document.getElementById("aAbs").textContent = abs;
      document.getElementById("aPct").textContent = (days && n ? (pres / (days * n) * 100) : 0).toFixed(1) + "%";
    };
    recalc();
  };
  attClass.addEventListener("change", renderAtt);
  await renderAtt();

  document.getElementById("saveAtt").addEventListener("click", async () => {
    const ck = attClass.value;
    const daysOpen = +document.getElementById("daysOpen").value || 0;
    const remark = document.getElementById("remark").value.trim();
    let n = 0;
    const rows = document.getElementById("attRows").querySelectorAll("tr");
    for (const tr of rows) {
      const id = tr.querySelector(".att-in[data-f=present]").dataset.id;
      const present = Math.max(0, Math.min(+tr.querySelector(".att-in[data-f=present]").value || 0, daysOpen));
      const absent = Math.max(0, daysOpen - present);
      await saveScoreMerged(id, ck, { attendance: { daysOpen, present, absent, formTeacherRemark: remark, formTeacher: currentStaff.fullName } });
      n++;
    }
    toast(`Attendance saved for ${n} students (${daysOpen} school days).`, "success", "Attendance Saved");
  });
}

/* ---------------- RESULTS (view published for my classes) ---------------- */
async function reportsView() {
  const host = document.getElementById("viewRoot");
  const keys = taughtClasses();
  host.innerHTML = title("Results", "Preview published report sheets for your classes.");
  host.innerHTML += `<div class="flex mb-3" style="gap:10px"><select id="repClass">${keys.map((ck) => `<option value="${ck}">${classDisplay(ck)}</option>`).join("")}</select></div>
    <div class="dash-card"><div class="dc-body"><div class="dtable-wrap"><table class="dtable"><thead><tr><th>Student</th><th>Adm No</th><th>Total</th><th>Avg</th><th>Grade</th><th>Position</th><th>Status</th><th></th></tr></thead><tbody id="repRows"></tbody></table></div></div></div>`;
  const repClass = document.getElementById("repClass");
  const render = async () => {
    const ck = repClass.value;
    const cls = students.filter((s) => s.classKey === ck).sort((a, b) => a.admissionNumber.localeCompare(b.admissionNumber));
    const vals = [];
    for (const s of cls) {
      try {
        const snap = await getDoc(doc(db, "results", sessionKey, ck, s.id));
        if (snap.exists()) vals.push({ student: s, res: snap.data() });
      } catch (e) { /* skip */ }
    }
    document.getElementById("repRows").innerHTML = vals.map(({ student, res }) => `
      <tr><td><b>${esc(student.fullName)}</b></td><td><span class="pill navy">${esc(student.admissionNumber)}</span></td>
      <td><b>${res.total}</b></td><td>${res.average}</td>
      <td><span class="pill ${res.grade === "A" ? "green" : res.grade === "B" ? "gold" : "navy"}">${res.grade}</span></td>
      <td>${res.position}</td>
      <td>${res.locked ? '<span class="chip navy">Locked</span>' : res.published ? '<span class="chip green">Published</span>' : '<span class="chip gray">Draft</span>'}</td>
      <td><button class="dbtn dbtn-soft" data-pdf="${res.studentId}"><i class="fa-solid fa-file-pdf"></i></button></td></tr>`).join("") ||
      '<tr><td colspan="8"><div class="empty-state"><p>No published results for this class yet.</p></div></td></tr>';
    document.getElementById("repRows").querySelectorAll("[data-pdf]").forEach((b) => b.addEventListener("click", () => {
      const { student, res } = vals.find((x) => x.student.id === b.dataset.pdf);
      import("../../lib/result-view.js").then(({ renderResultSheet, downloadResultPDF }) => {
        const m = openModal(renderResultSheet(res, window.__settings) + `<button class="btn btn-gold btn-block mt-3" id="dlPdf"><i class="fa-solid fa-file-pdf"></i> Download PDF</button>`, `${student.fullName} — Report Sheet`, "fa-file-pen");
        document.getElementById("dlPdf").addEventListener("click", () => downloadResultPDF(res));
      });
    }));
  };
  repClass.addEventListener("change", render);
  await render();
}

/* ---------------- ANNOUNCEMENTS ---------------- */
async function announcementsView() {
  const host = document.getElementById("viewRoot");
  host.innerHTML = title("Announcements", "Latest news from the administration.");
  host.innerHTML += `<div class="dash-card"><div class="dc-body" id="annList"></div></div>`;
  const list = await queryData(colRef("announcements"));
  document.getElementById("annList").innerHTML = (list.filter((a) => a.active !== false)).map((a) => `
    <div class="ann-item${a.pinned ? " pinned" : ""}">
      <div class="flex" style="gap:10px;align-items:flex-start"><i class="fa-solid ${a.pinned ? "fa-thumbtack" : "fa-bullhorn"}" style="color:var(--color-accent);font-size:1.15rem"></i>
      <div><b style="color:var(--color-primary-dark)">${esc(a.title)}</b><div style="color:var(--color-muted);font-size:.9rem">${a.body}</div></div></div></div>`).join("") || '<div class="empty-state"><p>No announcements yet.</p></div>';
}

/* ---------------- PROFILE ---------------- */
async function profileView() {
  const host = document.getElementById("viewRoot");
  host.innerHTML = title("My Profile", "Your staff record.");
  host.innerHTML += `<div class="dash-card"><div class="dc-body"><div class="flex" style="gap:16px;align-items:center;flex-wrap:wrap">
    <img class="profile-pic" src="${esc(currentStaff.passport || "assets/images/staff/staff-default.png")}" alt="">
    <div><h3 style="color:var(--color-primary-dark)">${esc(currentStaff.fullName)}</h3>
    <div style="color:var(--color-muted)">${esc(currentStaff.department || "")} · ${esc(currentStaff.role || "Teacher")}</div>
    <div style="color:var(--color-muted)">${esc(currentStaff.email || "")} ${esc(currentStaff.phone || "")}</div></div></div>
    <hr style="border:0;border-top:1px solid var(--color-border);margin:18px 0">
    <b style="color:var(--color-primary-dark)">My subject assignments</b>
    <div class="flex mt-2" style="gap:8px;flex-wrap:wrap">${staffAssignments().map((a) => {
      const sub = subjects.find((s) => s.id === a.subjectId);
      return `<span class="chip navy">${esc(sub?.name || a.subjectId)} — ${classDisplay(a.classId)}${a.isFormTeacher ? ' <i class="fa-solid fa-star" style="color:var(--color-accent)"></i>' : ""}</span>`;
    }).join("") || '<span class="chip gray">None</span>'}</div></div></div>`;
}

/* ---------------- SHELL + ROUTING ---------------- */
const views = { marksheets: marksheetView, attendance: attendanceView, reports: reportsView, announcements: announcementsView, profile: profileView };

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

guardPage("staff", async (user) => {
  document.getElementById("logoutBtn").addEventListener("click", () => logout());
  const menuBtn = document.getElementById("menuBtn");
  const backdrop = document.getElementById("sideBackdrop");
  const sideClose = document.getElementById("sideClose");
  menuBtn.onclick = () => { document.getElementById("dashSide").classList.contains("open") ? closeDrawer() : openDrawer(); };
  backdrop.onclick = () => closeDrawer();
  if (sideClose) sideClose.onclick = () => closeDrawer();

  const staff = await queryData(colRef("staff"));
  currentStaff = staff.find((s) => s.userId === user.uid) || staff.find((s) => s.email && s.email.toLowerCase() === user.email.toLowerCase()) || null;
  if (!currentStaff) {
    document.getElementById("authGate").classList.add("hidden");
    document.getElementById("appRoot").classList.remove("hidden");
    document.getElementById("viewRoot").innerHTML = `<div class="dash-card"><div class="dc-body"><div class="empty-state"><p>Your account is not linked to a staff record. Ask the administrator to set your <b>userId</b> in the Staff module.</p></div></div></div>`;
    return;
  }
  document.getElementById("userName").textContent = currentStaff.fullName;
  document.getElementById("userRole").textContent = currentStaff.formTeacher === "Yes" ? "Form Teacher" : (currentStaff.role || "Teacher");
  document.getElementById("userAvatar").src = currentStaff.passport || "assets/logo/favicon.svg";
  renderSidebar();

  const route = () => {
    closeDrawer();
    const key = (location.hash.replace("#", "") || "marksheets").trim();
    document.querySelectorAll("[data-module]").forEach((b) => b.classList.toggle("active", b.dataset.module === key));
    (views[key] || views.marksheets)();
  };
  window.addEventListener("hashchange", route);
  await loadContext();
  route();
});