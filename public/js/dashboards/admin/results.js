/* ==============================================================
 * ADMIN — Results. Enter scores per class, publish/unpublish to the
 * `results/{sessionKey}/{classId}/{studentId}` collection that the
 * parent checker + student portal read, lock sheets, download PDFs.
 * ============================================================== */
import { colRef, queryData, doc, getData, setDoc, updateDoc, getDocs } from "../../lib/db.js";
import { db } from "../../lib/firebase.js";
import { esc, toast, openModal, gradeOf, gradeRemark } from "../../lib/ui.js";
import { viewTitle } from "./shell.js";
import { CLASS_GROUPS, classKeyOf } from "../../pages/requirements.js";

const sessionTerm = () => ({ key: window.__settings?.sessionKey || "2026-2027_first", session: window.__settings?.session || "2026/2027", term: window.__settings?.term || "First" });

function computeStanding(totalsById) {
  const totals = Object.values(totalsById).sort((a, b) => b - a);
  return (t) => totals.indexOf(t) + 1;
}

async function buildResult(student, scoreDoc, subjects, classSize, totalsById) {
  const st = sessionTerm();
  const rows = Object.keys(scoreDoc.subjects || {}).map((sid) => {
    const sub = subjects.find((x) => x.id === sid);
    const sc = scoreDoc.subjects[sid];
    const total = Math.round((+sc.ca1 || 0) + (+sc.ca2 || 0) + (+sc.exam || 0));
    const g = gradeOf(total);
    return { name: sub?.name || sid, ca1: +sc.ca1 || 0, ca2: +sc.ca2 || 0, exam: +sc.exam || 0, total, grade: g, remark: sc.remark || gradeRemark(g) };
  });
  if (!rows.length) return null;
  const total = rows.reduce((a, r) => a + r.total, 0);
  const maxTotal = rows.length * 100;
  const average = (total / rows.length).toFixed(2);
  const grade = gradeOf(average);
  const classStanding = computeStanding(totalsById);
  const attendance = scoreDoc.attendance || {};
  const subjectComments = rows.map((r) => `${r.name}: ${r.remark}`).join(". ");
  return {
    studentId: student.id,
    name: student.fullName, admission: student.admissionNumber, className: student.className,
    arm: student.arm || "", classSize, gender: student.gender || "Male",
    house: student.house || "", passport: student.passport || "", formTeacher: attendance.formTeacher || "",
    session: st.session, sessionKey: st.key, term: st.term, position: classStanding(total),
    subjects: rows, total, maxTotal, average, grade, remark: gradeRemark(grade),
    subjectComments, formTeacherRemark: attendance.formTeacherRemark || "A promising result. Encouraged to keep improving.",
    principalRemark: "Well done. Aim higher.",
    present: +attendance.present || 0, absent: +attendance.absent || 0, daysOpen: +attendance.daysOpen || 0,
    nextTermDate: window.__settings?.nextTermDate || "", published: true, locked: false, updatedAt: new Date()
  };
}

export default async function results() {
  const host = document.getElementById("viewRoot");
  const allClasses = [];
  Object.entries(CLASS_GROUPS).forEach(([level, g]) => g.levels.forEach((cn) => {
    const levelName = (level === "secondary" && /^S/.test(cn)) ? "Secondary" : ({ creche: "Creche", nursery: "Nursery", primary: "Primary" })[level] || "Secondary";
    allClasses.push({ level: levelName, className: cn, classKey: classKeyOf(level, cn) });
  }));
  const subjects = await queryData(colRef("subjects"));

  host.innerHTML = `${viewTitle("Results", "Award scores from CA1 + CA2 + Exam, publish report sheets, then lock.", `
      <button class="dbtn dbtn-navy" id="pubAll"><i class="fa-solid fa-check-to-slot"></i> Publish All</button>
      <button class="dbtn dbtn-soft" id="broadsheet"><i class="fa-solid fa-table"></i> Broadsheet PDF</button>`)}
    <div class="stats-row" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))" id="resStats"></div>
    <div class="dash-card"><div class="dc-body">
      <div class="toolbar">
        <select id="resClass">${allClasses.map((c) => `<option value="${c.classKey}">${esc(c.className)}</option>`).join("")}</select>
        <span class="pill gold" id="resStatus"></span>
      </div>
      <div class="dtable-wrap"><table class="dtable">
        <thead><tr><th>Student</th><th>Adm No</th><th>Subjects</th><th>Total</th><th>Avg</th><th>Grade</th><th>Position</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody id="resRows"></tbody></table></div>
    </div></div>`;

  const rows = document.getElementById("resRows");
  const st = sessionTerm();
  let currentClass = allClasses[0].classKey;

  const load = async () => {
    const students = await queryData(colRef("students"));
    const clsStudents = students.filter((s) => s.classKey === currentClass);
    const docs = await getDocs(colRef("scores"));
    const scoresById = {};
    const resultsById = {};
    const totalsById = {};
    const prefix = st.key + "_" + currentClass + "_";
    docs.forEach((d) => {
      const data = d.data();
      if (data.sessionKey === st.key && data.classId === currentClass) {
        const sid = d.id.substring(prefix.length);
        scoresById[sid] = d;
        if (data.subjects) {
          const subjs = Object.keys(data.subjects);
          totalsById[sid] = subjs.reduce((a, sidx) => a + (+data.subjects[sidx].ca1 || 0) + (+data.subjects[sidx].ca2 || 0) + (+data.subjects[sidx].exam || 0), 0);
        }
      }
    });
    for (const s of clsStudents) {
      try { const snap = await getData("results/" + st.key + "/" + currentClass + "/" + s.id); if (snap) resultsById[s.id] = snap; } catch (e) { /* no doc */ }
    }
    return { clsStudents, scoresById, resultsById, totalsById };
  };

  const render = async () => {
    const { clsStudents, scoresById, resultsById, totalsById } = await load();
    const publishedCount = clsStudents.filter((s) => resultsById[s.id]?.published).length;
    const lockedCount = clsStudents.filter((s) => resultsById[s.id]?.locked).length;
    document.getElementById("resStatus").textContent = `${clsStudents.length} students · ${publishedCount} published · ${lockedCount} locked`;
    document.getElementById("resStats").innerHTML = `
      <div class="stat"><i class="fa-solid fa-users" style="background:rgba(13,27,42,.1);color:var(--color-primary-dark)"></i><div><b>${clsStudents.length}</b><span>Students in class</span></div></div>
      <div class="stat"><i class="fa-solid fa-check-double" style="background:rgba(13,116,62,.1);color:var(--color-success)"></i><div><b>${publishedCount}</b><span>Published sheets</span></div></div>
      <div class="stat"><i class="fa-solid fa-lock" style="background:rgba(255,107,0,.12);color:var(--color-accent)"></i><div><b>${lockedCount}</b><span>Locked sheets</span></div></div>`;

    rows.innerHTML = clsStudents.map((s) => {
      const score = scoresById[s.id];
      const res = resultsById[s.id];
      let total = "-", avg = "-", grade = "-", count = 0, pos = "-";
      if (score?.data().subjects) {
        const subjs = Object.keys(score.data().subjects);
        count = subjs.length;
        total = subjs.reduce((a, sid) => a + (+score.data().subjects[sid].ca1 || 0) + (+score.data().subjects[sid].ca2 || 0) + (+score.data().subjects[sid].exam || 0), 0);
        avg = count ? (total / count).toFixed(1) : "-";
        grade = count ? gradeOf(total / count) : "-";
      }
      if (res) { total = res.total; avg = res.average; grade = res.grade; pos = res.position; count = res.subjects.length; }
      const status = res?.locked ? '<span class="chip navy"><i class="fa-solid fa-lock"></i> Locked</span>' : (res?.published ? '<span class="chip green"><i class="fa-solid fa-check"></i> Published</span>' : '<span class="chip gray">Draft</span>');
      return `<tr>
        <td><div class="flex"><img class="avatar" src="${esc(s.passport || "assets/images/students/student-default.png")}" alt=""><div><b>${esc(s.fullName)}</b><div style="color:var(--color-muted);font-size:.78rem">${esc(s.className)} ${esc(s.arm || "")}</div></div></div></td>
        <td><b style="color:var(--color-primary-dark)">${esc(s.admissionNumber)}</b></td>
        <td><span class="pill navy">${count} subjects</span></td>
        <td><b>${total}</b></td><td>${avg}</td><td>${grade === "-" ? "-" : `<span class="pill ${grade === "A" ? "green" : grade === "B" ? "gold" : grade === "C" ? "navy" : "gray"}">${grade}</span>`}</td>
        <td>${pos === "-" ? "-" : `<b style="color:var(--color-primary-dark)">${pos}</b>`}</td>
        <td>${status}</td>
        <td><div class="flex" style="gap:6px">
          <button class="dbtn dbtn-soft" data-scores="${esc(s.id)}" title="Enter scores"><i class="fa-solid fa-pen-to-square"></i></button>
          ${!res || !res.published ? `<button class="dbtn dbtn-navy" data-pub="${esc(s.id)}" title="Publish"><i class="fa-solid fa-check-to-slot"></i></button>`
          : `<button class="dbtn dbtn-soft" data-unpub="${esc(s.id)}" title="Unpublish"><i class="fa-solid fa-xmark"></i></button>`}
          <button class="dbtn dbtn-soft" data-lock="${esc(s.id)}" title="${res?.locked ? "Unlock" : "Lock"}"><i class="fa-solid ${res?.locked ? "fa-unlock" : "fa-lock"}"></i></button>
          <button class="dbtn dbtn-soft" data-pdf="${esc(s.id)}" title="Result PDF"><i class="fa-solid fa-file-pdf"></i></button>
        </div></td></tr>`;
    }).join("") || '<tr><td colspan="9"><div class="empty-state"><p>No students in this class.</p></div></td></tr>';

    const publishOne = async (s) => {
      const scoreDoc = scoresById[s.id]?.data();
      if (!scoreDoc || !scoreDoc.subjects || !Object.keys(scoreDoc.subjects).length) { toast("Enter scores first for " + s.fullName + ".", "error", "No Scores"); return; }
      const ref = doc(db, "results", st.key, currentClass, s.id);
      await setDoc(ref, await buildResult(s, scoreDoc, subjects, clsStudents.length, totalsById));
      toast("Published result for " + s.fullName + ".", "success", "Published");
      render();
    };

    rows.querySelectorAll("[data-scores]").forEach((b) => b.addEventListener("click", async () => {
      const student = clsStudents.find((x) => x.id === b.dataset.scores);
      const sc = (scoresById[student.id]?.data() || { subjects: {} });
      const m = openModal(
        `<p class="muted" style="margin-bottom:12px">${esc(student.fullName)} · ${esc(student.className)} ${esc(student.arm || "")} · ${st.session} ${st.term} Term</p>
        <div class="form-field"><label>Days Open</label><input id="a_days" type="number" value="${sc.attendance?.daysOpen || 90}"></div>
        <div class="form-field"><label>Days Present</label><input id="a_present" type="number" value="${sc.attendance?.present || 0}"></div>
        <div class="form-field"><label>Days Absent</label><input id="a_absent" type="number" value="${sc.attendance?.absent || 0}"></div>
        <div class="form-field"><label>Form Teacher Remark</label><input id="a_remark" value="${esc(sc.attendance?.formTeacherRemark || "A promising result. Encouraged to keep improving.")}"></div>
        <div class="dtable-wrap mt-3"><table class="dtable"><thead><tr><th>Subject</th><th>CA1</th><th>CA2</th><th>Exam</th></tr></thead><tbody id="scoreRows"></tbody></table></div>
        <button class="btn btn-gold btn-block mt-3" id="saveScores">Save Scores</button>`, "Enter Scores", "fa-pen-to-square");
      const tbody = m.overlay.querySelector("#scoreRows");
      tbody.innerHTML = subjects.map((sub) => {
        const cur = sc.subjects[sub.id] || {};
        return `<tr><td><b>${esc(sub.name)}</b></td><td><input type="number" data-sid="${sub.id}" data-c="ca1" min="0" max="20" value="${cur.ca1 || ""}"></td>
        <td><input type="number" data-sid="${sub.id}" data-c="ca2" min="0" max="20" value="${cur.ca2 || ""}"></td>
        <td><input type="number" data-sid="${sub.id}" data-c="exam" min="0" max="60" value="${cur.exam || ""}"></td></tr>`;
      }).join("");
      document.getElementById("saveScores").addEventListener("click", async () => {
        const att = { daysOpen: +document.getElementById("a_days").value || 0, present: +document.getElementById("a_present").value || 0, absent: +document.getElementById("a_absent").value || 0, formTeacherRemark: document.getElementById("a_remark").value.trim(), formTeacher: window.__settings?.principalName || "" };
        const subs = {};
        tbody.querySelectorAll("input[data-sid]").forEach((inp) => {
          const sid = inp.dataset.sid; subs[sid] = subs[sid] || {}; subs[sid][inp.dataset.c] = +inp.value || 0;
        });
        const ref = doc(db, "scores", st.key + "_" + currentClass + "_" + student.id);
        await setDoc(ref, { sessionKey: st.key, classId: currentClass, term: st.term, attendance: att, subjects: subs });
        toast("Scores saved for " + student.fullName + ".", "success", "Saved");
        m.close(); render();
      });
    }));
    rows.querySelectorAll("[data-pub]").forEach((b) => b.addEventListener("click", () => publishOne(clsStudents.find((x) => x.id === b.dataset.pub))));
    rows.querySelectorAll("[data-unpub]").forEach((b) => b.addEventListener("click", async () => {
      await updateDoc(doc(db, "results", st.key, currentClass, b.dataset.unpub), { published: false });
      toast("Result unpublished.", "success"); render();
    }));
    rows.querySelectorAll("[data-lock]").forEach((b) => b.addEventListener("click", async () => {
      const rr = resultsById[b.dataset.lock];
      const ref = doc(db, "results", st.key, currentClass, b.dataset.lock);
      if (rr?.locked) { await updateDoc(ref, { locked: false }); toast("Sheet unlocked.", "info"); }
      else { await updateDoc(ref, { locked: true }); toast("Sheet locked against edits.", "success"); }
      render();
    }));
    rows.querySelectorAll("[data-pdf]").forEach((b) => b.addEventListener("click", async () => {
      const res = resultsById[b.dataset.pdf];
      if (!res) { toast("Publish the result first.", "error"); return; }
      const { downloadResultPDF } = await import("../../lib/result-view.js");
      downloadResultPDF(res);
    }));
  };

  document.getElementById("pubAll").addEventListener("click", async () => {
    const { clsStudents } = await load();
    let ok = 0, skip = 0;
    for (const s of clsStudents) {
      const scoreDoc = scoresById[s.id];
      if (!scoreDoc?.data()?.subjects || !Object.keys(scoreDoc.data().subjects).length) { skip++; continue; }
      await setDoc(doc(db, "results", st.key, currentClass, s.id), await buildResult(s, scoreDoc.data(), subjects, clsStudents.length, totalsById));
      ok++;
    }
    toast(`Published ${ok} results (${skip} skipped — no scores).`, ok ? "success" : "info", "Bulk Publish");
    render();
  });

  document.getElementById("broadsheet").addEventListener("click", async () => {
    const { clsStudents, scoresById } = await load();
    const withScores = clsStudents.map((s) => ({ student: s, score: scoresById[s.id]?.data() })).filter((x) => x.score?.subjects && Object.keys(x.score.subjects).length);
    if (!withScores.length) { toast("No scores to compile.", "error"); return; }
    let jspdf;
    try { const { loadJsPDF } = await import("../../lib/pdf.js"); jspdf = await loadJsPDF(); }
    catch (e) { toast("Couldn't load the PDF engine. Check your connection and try again.", "error", "Download Failed"); return; }
    const doc = new jspdf({ orientation: "landscape", unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const subjNames = subjects.filter((s) => withScores[0].score.subjects[s.id]).map((s) => s.name);
    doc.setFillColor(13, 27, 42); doc.rect(0, 0, W, 46, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(13); doc.setFont("helvetica", "bold");
    const clsName = allClasses.find((c) => c.classKey === currentClass)?.className;
    doc.text(`BROADSHEET — ${clsName}  |  ${st.session} ${st.term} TERM`, 40, 28);
    const wSubj = Math.min(108, (W - 300) / subjNames.length);
    const xCols = { no: 40, adm: 78, name: 150, gap: 105 };
    const tY = 70;
    doc.setFillColor(255, 107, 0); doc.rect(0, tY - 14, W, 22, "F");
    doc.setTextColor(13, 27, 42); doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text("#", xCols.no, tY);
    doc.text("Adm No", xCols.adm, tY);
    doc.text("Student Name", xCols.name, tY);
    subjNames.forEach((sn, i) => doc.text(sn.slice(0, 14), 255 + i * wSubj, tY));
    doc.text("Total", 255 + subjNames.length * wSubj + 10, tY);
    doc.text("Avg", 255 + subjNames.length * wSubj + 50, tY);
    doc.text("Grade", 255 + subjNames.length * wSubj + 92, tY);
    doc.text("Pos", 255 + subjNames.length * wSubj + 128, tY);
    const standings = computeStanding(Object.fromEntries(withScores.map((x) => [x.student.id, Object.keys(x.score.subjects).reduce((a, sid) => a + (+x.score.subjects[sid].ca1 || 0) + (+x.score.subjects[sid].ca2 || 0) + (+x.score.subjects[sid].exam || 0), 0)])));
    const studentTotal = (x) => Object.keys(x.score.subjects).reduce((s, sid) => s + (+x.score.subjects[sid].ca1 || 0) + (+x.score.subjects[sid].ca2 || 0) + (+x.score.subjects[sid].exam || 0), 0);
    withScores.sort((a, b) => studentTotal(b) - studentTotal(a));
    let y = tY + 16;
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
    withScores.forEach((x, i) => {
      if (y > 520) { doc.addPage(); y = 40; }
      const total = studentTotal(x);
      const avg = total / subjNames.length;
      doc.setTextColor(20, 28, 40);
      doc.text(String(i + 1), xCols.no, y);
      doc.text(x.student.admissionNumber, xCols.adm, y);
      doc.text(x.student.fullName, xCols.name, y);
      subjNames.forEach((sn, ci) => {
        const sid = subjects.find((s) => s.name === sn)?.id;
        doc.text(String((+x.score.subjects[sid]?.ca1 || 0) + (+x.score.subjects[sid]?.ca2 || 0) + (+x.score.subjects[sid]?.exam || 0)), 255 + (ci * wSubj) + wSubj / 2, y, { align: "center" });
      });
      doc.setFont("helvetica", "bold");
      doc.text(String(total), 255 + subjNames.length * wSubj + 10, y);
      doc.setFont("helvetica", "normal");
      doc.text(avg.toFixed(1), 255 + subjNames.length * wSubj + 50, y);
      doc.text(gradeOf(avg), 255 + subjNames.length * wSubj + 92, y);
      doc.text(`${standings(total)}/${withScores.length}`, 255 + subjNames.length * wSubj + 128, y);
      y += 14;
    });
    doc.setTextColor(120, 130, 145); doc.setFontSize(7);
    doc.text(`Generated ${new Date().toLocaleString()} · Greenwood Academy Result Suite`, 40, y + 8);
    doc.save(`${clsName}-broadSheet-${st.term.toLowerCase()}.pdf`);
  });

  document.getElementById("resClass").addEventListener("change", (e) => { currentClass = e.target.value; render(); });
  await render();
}