/* ==============================================================
 * PROSPECTUS PDF — generated client-side from Firestore data.
 * ============================================================== */
import { loadSettings } from "./site.js";

export async function generateProspectusPDF(p) {
  const { default: jspdf } = await import("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.es.min.js");
  const s = await loadSettings();
  const doc = new jspdf({ orientation: "portrait", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 50;

  doc.setFillColor(13, 27, 42);
  doc.circle(60, 60, 30, "F");
  doc.setFillColor(255, 107, 0);
  doc.circle(60, 60, 20, "F");
  doc.setTextColor(13, 27, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("GA", 60, 64, { align: "center" });

  doc.setTextColor(13, 27, 42);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(s.name, 100, 46);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(230, 81, 0);
  doc.text(s.motto, 100, 60);
  doc.setDrawColor(230, 81, 0);
  doc.setLineWidth(1.2);
  doc.line(40, 76, W - 40, 76);

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(13, 27, 42);
  doc.text(`${p.className} Prospectus`, 40, 102);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 110, 125);
  doc.text(`Session: ${s.session}  |  Last updated: ${p.lastUpdated ? new Date(p.lastUpdated.toDate?.() || p.lastUpdated).toLocaleDateString() : "n/a"}`, 40, 118);
  y = 140;

  const sections = [
    ["textbooks", "Required Textbooks"], ["exerciseBooks", "Exercise Books"], ["uniforms", "Uniforms"],
    ["stationery", "Stationery"], ["materials", "School Materials"], ["resumptionItems", "Resumption Items"],
    ["rules", "Rules"], ["recommended", "Recommended Supplies"]
  ];

  for (const [key, label] of sections) {
    const items = p[key] || [];
    if (!items.length) continue;
    doc.setFillColor(243, 245, 249);
    doc.rect(40, y, 24, 20, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(13, 27, 42);
    doc.text(label, 50, y + 13);
    y += 28;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(60, 70, 85);
    for (const it of items) {
      doc.text("•  " + it, 55, y);
      y += 15;
      if (y > 700) { doc.addPage(); y = 50; }
    }
    y += 10;
  }

  doc.setDrawColor(230, 81, 0);
  doc.setLineWidth(1);
  doc.line(40, 770, W - 40, 770);
  doc.setFontSize(8.5);
  doc.setTextColor(120, 130, 145);
  doc.setFont("helvetica", "normal");
  doc.text(`${s.address}  |  ${s.phone}  |  ${s.email}`, 40, 786);
  doc.save(`${p.classKey}-prospectus-${s.name.replace(/\s/g, "")}.pdf`);
}