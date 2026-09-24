/* ==============================================================
 * jsPDF LOADER — lazy-loads jsPDF for PDF generation.
 * The ESM build on CDN carries bare specifiers ("@babel/runtime",
 * "fflate") that browsers cannot resolve, so we load the classic
 * UMD build via a <script> tag and read window.jspdf.jsPDF.
 * ============================================================== */
const JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
let pdfPromise = null;

export function loadJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (!pdfPromise) {
    pdfPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = JSPDF_URL;
      s.async = true;
      s.onload = () => resolve(window.jspdf.jsPDF);
      s.onerror = () => { pdfPromise = null; reject(new Error("PDF_LIB_LOAD_FAILED")); };
      document.head.appendChild(s);
    });
  }
  return pdfPromise;
}