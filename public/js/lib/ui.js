/* ==============================================================
 * UI HELPERS — toasts, modal, icons, esc, formatting
 * ============================================================== */

export function toast(message, type = "info", title = "") {
  let wrap = document.querySelector(".toast-wrap");
  if (!wrap) { wrap = document.createElement("div"); wrap.className = "toast-wrap"; document.body.appendChild(wrap); }
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  const icon = type === "success" ? "fa-circle-check" : type === "error" ? "fa-circle-xmark" : "fa-circle-info";
  t.innerHTML = `<i class="fa-solid ${icon}" style="font-size:1.15rem"></i><div><b>${title || type[0].toUpperCase() + type.slice(1)}</b><div style="font-size:.85rem;opacity:.85">${message}</div></div>`;
  wrap.appendChild(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 450); }, 4200);
}

export function openModal(html, title = "", icon = "fa-star") {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay show";
  overlay.innerHTML = `
    <div class="modal" style="position:relative">
      <button class="close-x" type="button" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      ${title ? `<div class="modal-head"><i class="fa-solid ${icon}"></i><h3>${title}</h3></div>` : ""}
      <div class="modal-body">${html}</div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => { overlay.classList.remove("show"); setTimeout(() => overlay.remove(), 300); };
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector(".close-x").addEventListener("click", close);
  return { overlay, close };
}

export const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };

/** Escape string for safe HTML interpolation. */
export function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function fmtDate(input) {
  if (!input) return "";
  const d = (input.toDate ? input.toDate() : new Date(input));
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Grade letter from mark using the school grading config. */
export function gradeOf(marks) {
  const g = (typeof window !== "undefined" && window.__settings && window.__settings.grading) || {
    A: { min: 70 }, B: { min: 60 }, C: { min: 50 }, D: { min: 45 }, E: { min: 40 }, F: { min: 0 }
  };
  const order = ["A", "B", "C", "D", "E", "F"];
  for (const k of order) if (marks >= g[k].min) return k;
  return "F";
}

export function gradeRemark(g) {
  const map = { A: "Excellent", B: "Very Good", C: "Good", D: "Fair", E: "Poor", F: "Fail" };
  return map[g] || "";
}