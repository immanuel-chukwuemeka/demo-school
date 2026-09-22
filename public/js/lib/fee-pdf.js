/* ==============================================================
 * FEE REQUIREMENTS PDF — jsPDF (loaded on demand from CDN)
 * ============================================================== */
import { FEE_FIELDS, feeTotal } from "../pages/requirements.js";
import { loadSettings } from "./site.js";

export async function generateFeePDF(level, className, data) {
  const { default: jspdf } = await import("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.es.min.js");
  const s = await loadSettings();
  const doc = new jspdf({ orientation: "portrait", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Logotype — draw a simplified shield
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
  doc.text(s.name, 100, 48);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(230, 81, 0);
  doc.text(s.motto, 100, 62);

  doc.setDrawColor(230, 81, 0);
  doc.setLineWidth(1.2);
  doc.line(40, 78, W - 40, 78);

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(13, 27, 42);
  doc.text(`${level} — ${className} Fee Schedule`, 40, 104);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 100, 115);
  doc.text(`Session: ${s.session}   |   Term: ${s.term}   |   Amounts are per term.`, 40, 120);

  let y = 150;
  doc.setFillColor(13, 27, 42);
  doc.rect(40, y, W - 80, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("FEE ITEM", 52, y + 17);
  doc.text("AMOUNT", W - 60, y + 17, { align: "right" });
  y += 26;

  FEE_FIELDS.forEach((f, i) => {
    if (i % 2 === 0) { doc.setFillColor(245, 247, 250); doc.rect(40, y, W - 80, 26, "F"); }
    doc.setTextColor(40, 48, 60);
    doc.setFont("helvetica", "normal");
    doc.text(f.label, 52, y + 17);
    doc.setFont("helvetica", "bold");
    doc.text("₦" + Number(data[f.key] || 0).toLocaleString(), W - 60, y + 17, { align: "right" });
    y += 26;
  });
  doc.setDrawColor(230, 81, 0);
  doc.setLineWidth(2);
  doc.line(40, y, W - 40, y);
  y += 8;
  doc.setFillColor(255, 241, 230);
  doc.rect(40, y, W - 80, 30, "F");
  doc.setTextColor(13, 27, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL", 52, y + 19);
  doc.text("₦" + feeTotal(data).toLocaleString(), W - 60, y + 19, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 130, 145);
  doc.text("Fees are reviewed yearly. The school reserves the right to revise schedules. Applicable per the current session.", 40, 680);
  doc.text(`${s.address}   |   ${s.phone}`, 40, 694);

  doc.save(`${className.replace(/\s/g, "")}-fees-${s.name.replace(/\s/g, "")}.pdf`);
}