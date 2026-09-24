/* ==============================================================
 * RESULT SHEET RENDERER + PDF — used by parent checker and
 * student/admin dashboards.
 * ============================================================== */
import { esc, gradeOf, gradeRemark, fmtDate, toast } from "./ui.js";
import { loadSettings } from "./site.js";
import { loadJsPDF } from "./pdf.js";

export function classGrade(marks, gradeKey) {
  return `<span class="${marks >= 70 ? "grade-A" : marks >= 60 ? "grade-B" : marks >= 50 ? "grade-C" : "grade-D"}">${gradeKey}</span>`;
}

export function renderResultSheet(r, s) {
  const subjRows = r.subjects.map((sub, i) => `
    <tr>
      <td>${i + 1}</td><td style="text-align:left;font-weight:600">${esc(sub.name)}</td>
      <td>${sub.ca1}</td><td>${sub.ca2}</td><td>${sub.exam}</td><td><b>${sub.total}</b></td>
      <td>${classGrade(sub.total, sub.grade)}</td>
      <td style="color:var(--color-muted)">${esc(sub.remark)}</td>
    </tr>`).join("");

  return `
  <div class="result-sheet">
    <div class="result-head">
      <img class="logo" src="assets/logo/logo-white.svg" alt="">
      <div class="rh-center">
        <h2 style="font-size:clamp(1.2rem,2.2vw,1.7rem)">${esc(s.name)}</h2>
        <div class="motto">“${esc(s.motto)}”</div>
        <div class="addr">${esc(s.address)}</div>
      </div>
      <img class="passport" src="${esc(r.passport || "assets/images/students/student-default.png")}" alt="student passport">
    </div>
    <div style="text-align:center;padding:14px;background:var(--color-accent-soft);border-bottom:1px solid var(--color-border)">
      <b style="color:var(--color-primary-dark);font-family:var(--font-display);letter-spacing:.1em">ACADEMIC REPORT SHEET — ${esc((r.term || "").toUpperCase())} TERM</b>
    </div>
    <div class="result-meta">
      <div class="rm"><b>Student Name</b><span>${esc(r.name)}</span></div>
      <div class="rm"><b>Admission No.</b><span>${esc(r.admission)}</span></div>
      <div class="rm"><b>Class</b><span>${esc(r.className)} ${esc(r.arm || "")}</span></div>
      <div class="rm"><b>Session</b><span>${esc(r.session)}</span></div>
      <div class="rm"><b>Gender</b><span>${esc(r.gender)}</span></div>
      <div class="rm"><b>House</b><span>${esc(r.house)}</span></div>
    </div>
    <div class="result-table-wrap">
      <div class="table-wrap"><table class="result-table">
        <thead><tr><th>#</th><th style="text-align:left">Subject</th><th>CA1</th><th>CA2</th><th>Exam</th><th>Total</th><th>Grade</th><th>Remark</th></tr></thead>
        <tbody>${subjRows}</tbody>
      </table></div>
    </div>
    <div class="result-summary">
      <div class="rs"><b>${r.total}</b><span>Total (${r.maxTotal || 700})</span></div>
      <div class="rs"><b>${r.average}</b><span>Average</span></div>
      <div class="rs"><b>${r.grade}</b><span>Grade</span></div>
      <div class="rs"><b>${r.position || "-"}</b><span>Position (${r.classSize})</span></div>
      <div class="rs"><b>${r.remark}</b><span>Overall Remark</span></div>
      <div class="rs"><b>${Math.max(0, (r.total / (r.maxTotal || 1)) * 100).toFixed(0)}%</b><span>Cumulative %</span></div>
    </div>
    <div class="result-comments">
      <div class="rc"><b><i class="fa-solid fa-user-check" style="color:var(--color-accent)"></i> Subject Teacher Comments</b><p>${esc(r.subjectComments || "Good performance, keep it up.")}</p></div>
      <div class="rc"><b><i class="fa-solid fa-chalkboard-user" style="color:var(--color-accent)"></i> Form Teacher Remark</b><p>${esc(r.formTeacherRemark || "A promising result. Encouraged to keep improving.")}</p></div>
      <div class="rc"><b><i class="fa-solid fa-user-tie" style="color:var(--color-accent)"></i> Principal Remark</b><p>${esc(r.principalRemark || "Well done. Aim higher.")}</p></div>
    </div>
    <div class="result-comments" style="padding-top:0">
      <div class="rc"><b><i class="fa-solid fa-user-check"></i> Attendance</b><p>Days Open: <b>${r.daysOpen || 0}</b> · Days Present: <b>${r.present || 0}</b> · Days Absent: <b>${r.absent || 0}</b> &nbsp;·&nbsp; Next Term Begins: ${fmtDate(r.nextTermDate)}</p></div>
    </div>
    <div class="result-sign">
      <div class="sg">Form Teacher<br>${esc(r.formTeacher || "")}</div>
      <div class="sg">Principal<br>${esc(s.principalName || "Mrs. Ngozi Adeyemi")}</div>
    </div>
    <div class="result-foot">This result is computer-generated and the PIN status was verified on ${fmtDate(new Date())}. For verification, contact ${esc(s.phone)}.</div>
  </div>`;
}

export async function downloadResultPDF(r) {
  let jspdf;
  try {
    jspdf = await loadJsPDF();
  } catch (err) {
    toast("Couldn't load the PDF engine. Check your connection and try again.", "error", "Download Failed");
    return;
  }
  const s = await loadSettings();
  const doc = new jspdf({ orientation: "portrait", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  doc.setFillColor(13, 27, 42);
  doc.rect(0, 0, W, 110, "F");
  doc.circle(64, 60, 22, "F");
  doc.circle(64, 60, 15, "F");
  doc.setFillColor(255, 107, 0);
  doc.circle(64, 60, 15, "F");
  doc.setTextColor(13, 27, 42);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("GA", 64, 64, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(s.name, 96, 52);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(255, 107, 0);
  doc.text(`"${s.motto}"`, 96, 66);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 210, 228);
  doc.setFontSize(8);
  doc.text(s.address, 96, 78);

  doc.setFillColor(255, 241, 230);
  doc.setDrawColor(230, 81, 0);
  doc.rect(40, 132, W - 80, 24, "F");
  doc.setTextColor(13, 27, 42);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`ACADEMIC REPORT SHEET - ${(r.term || "").toUpperCase()} TERM  (${r.session})`, W / 2, 147, { align: "center" });

  let y = 180;
  const info = [
    ["Student", r.name], ["Admission No.", r.admission], ["Class", `${r.className} ${r.arm || ""}`],
    ["Gender", r.gender], ["House", r.house], ["Position", `${r.position} of ${r.classSize}`]
  ];
  doc.setFontSize(9.5);
  info.forEach(([k, v], i) => {
    const row = i % 3;
    const col = Math.floor(i / 3);
    const x = 52 + col * 190;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 110, 125);
    doc.text(k.toUpperCase(), x, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(13, 27, 42);
    doc.text(String(v), x, y + 13);
  });

  y += 44;
  doc.setFillColor(13, 27, 42);
  doc.rect(40, y - 16, W - 80, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  ["#", "Subject", "CA1", "CA2", "Exam", "Total", "Grade"].forEach((h, i) => {
    const cols = [40, 130, W - 130, W - 110, W - 90, W - 112, W - 72];
    doc.text(h, cols[i], y);
  });
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 48, 60);
  r.subjects.forEach((sub, i) => {
    if (y > H - 140) { y = 50; }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(String(i + 1), 44, y);
    doc.setFont("helvetica", "normal");
    doc.text(sub.name, 130, y);
    doc.text(String(sub.ca1), W - 138, y);
    doc.text(String(sub.ca2), W - 120, y);
    doc.text(String(sub.exam), W - 100, y);
    doc.setFont("helvetica", "bold");
    doc.text(String(sub.total), W - 118, y);
    doc.text(sub.grade, W - 76, y);
    y += 20;
  });

  if (y > H - 180) { doc.addPage(); y = 50; }
  doc.setDrawColor(230, 81, 0);
  doc.setLineWidth(1.4);
  doc.line(40, y, W - 40, y);
  y += 18;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(13, 27, 42);
  doc.text(`TOTAL: ${r.total} / ${r.maxTotal || 700}    AVERAGE: ${r.average}    GRADE: ${r.grade}    POSITION: ${r.position} of ${r.classSize}`, 40, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.text(`Overall Remark: ${r.remark}`, 40, y);
  y += 14;
  doc.text(`Attendance  |  Days Open: ${r.daysOpen}   Present: ${r.present}   Absent: ${r.absent}`, 40, y);
  y += 26;
  const comments = [
    ["Subject Teacher", r.subjectComments], ["Form Teacher", r.formTeacherRemark], ["Principal", r.principalRemark]
  ];
  doc.setTextColor(80, 90, 105);
  comments.forEach(([lbl, val]) => {
    if (y > H - 100) { doc.addPage(); y = 50; }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(13, 27, 42);
    doc.text(lbl.toUpperCase() + ":", 40, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 90, 105);
    const lines = doc.splitTextToSize(String(val || ""), W - 90);
    doc.text(lines, 40, y + 12);
    y += 16 + lines.length * 11;
  });

  if (y > H - 130) { doc.addPage(); y = 50; }
  doc.setDrawColor(200, 210, 228);
  doc.setLineWidth(1);
  doc.line(60, y + 10, W / 2 - 40, y + 10);
  doc.line(W / 2 + 40, y + 10, W - 60, y + 10);
  doc.setFontSize(9);
  doc.setTextColor(13, 27, 42);
  doc.text("Form Teacher", W / 4, y + 30, { align: "center" });
  doc.text("Principal", (3 * W) / 4, y + 30, { align: "center" });

  doc.setTextColor(120, 130, 145);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("This result is computer-generated and verified against the parent scratch-card portal.", W / 2, H - 30, { align: "center" });
  doc.save(`${r.admission}-${(r.term || "term").toLowerCase()}-${s.shortName || "GA"}-result.pdf`);
}