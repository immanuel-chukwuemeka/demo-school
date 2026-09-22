/* ==============================================================
 * REQUIREMENT CHECKER WIDGET
 * Shows per-class fee breakdown with auto total, PDF + print.
 * Data source: Firestore `requirements/{classKey}`
 * ============================================================== */
import { getData } from "../lib/db.js";
import { naira } from "../lib/site.js";
import { esc, toast } from "../lib/ui.js";

export const FEE_FIELDS = [
  { key: "tuition", label: "Tuition" },
  { key: "uniform", label: "Uniform" },
  { key: "books", label: "Books" },
  { key: "pta", label: "PTA" },
  { key: "development", label: "Development Levy" },
  { key: "toiletries", label: "Toiletries" },
  { key: "sports", label: "Sports" },
  { key: "ict", label: "ICT" },
  { key: "transport", label: "Transport" },
  { key: "other", label: "Other Fees" }
];

export const CLASS_GROUPS = {
  creche: { label: "Creche", levels: ["Creche 1", "Creche 2"] },
  nursery: { label: "Nursery", levels: ["Nursery 1", "Nursery 2"] },
  primary: { label: "Primary", levels: ["Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"] },
  secondary: { label: "Secondary", levels: ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"] }
};

export function classKeyOf(level, name) {
  const map = { "Creche 1": "creche1", "Creche 2": "creche2", "Nursery 1": "nursery1", "Nursery 2": "nursery2" };
  if (map[name]) return map[name];
  if (level === "primary") return "p" + name.replace(/\D/g, "");
  if (level === "secondary") return name.toLowerCase().replace(/\s/g, "");
  return name.toLowerCase().replace(/\s/g, "");
}

/** Populate a class <select> based on the chosen level. */
export function bindLevelClass(levelSel, classSel) {
  levelSel.addEventListener("change", () => populateClasses(levelSel, classSel));
  populateClasses(levelSel, classSel);
}

export function populateClasses(levelSel, classSel) {
  const level = levelSel.value;
  const group = CLASS_GROUPS[level];
  if (!group) return (classSel.innerHTML = "");
  classSel.innerHTML = group.levels.map((c) => `<option value="${c}">${c}</option>`).join("");
}

export function feeTotal(data) {
  return FEE_FIELDS.reduce((sum, f) => sum + Number((data && data[f.key]) || 0), 0);
}

export function renderFeeTable(data) {
  const rows = FEE_FIELDS.map((f) =>
    `<tr><td>${f.label}</td><td>${naira(data[f.key] || 0)}</td></tr>`
  ).join("");
  return `
    <div class="table-wrap"><table class="pub-table"><thead><tr><th>Item</th><th>Amount</th></tr></thead>
    <tbody>${rows}<tr class="total-row"><td><b>Total</b></td><td><b>${naira(feeTotal(data))}</b></td></tr></tbody></table></div>`;
}

export async function loadRequirements(classKey) {
  return await getData("requirements", classKey);
}

/** Wire the hero/home page checker. */
export function initRequirementWidget(widgetEl = document.querySelector("[data-requirement-widget]")) {
  if (!widgetEl) return;
  const levelSel = widgetEl.querySelector('[data-field="level"]');
  const classSel = widgetEl.querySelector('[data-field="class"]');
  const viewBtn = widgetEl.querySelector('[data-action="view"]');
  const resultBox = widgetEl.querySelector(".fee-result");

  bindLevelClass(levelSel, classSel);

  const show = async () => {
    const level = levelSel.value;
    const className = classSel.value;
    const classKey = classKeyOf(level, className);
    viewBtn.disabled = true;
    viewBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading…';
    const data = await loadRequirements(classKey);
    viewBtn.disabled = false;
    viewBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> View Requirements';
    if (!data) { toast("Requirements not published for this class yet. Check back soon.", "error", "Not Found"); return; }
    resultBox.innerHTML = `
      <div class="flex flex-wrap" style="justify-content:space-between;align-items:center;margin-bottom:12px">
        <b style="color:var(--color-primary-dark)">${esc(level)} · ${esc(className)} — Fee Breakdown</b>
        <span class="pill gold"><i class="fa-regular fa-calendar"></i> ${esc(data.session || "Per Term")}</span>
      </div>
      ${renderFeeTable(data)}
      <div class="fee-actions">
        <button class="btn btn-navy btn-sm" data-pdf><i class="fa-solid fa-file-pdf"></i> Download PDF</button>
        <button class="btn btn-soft btn-sm" data-print><i class="fa-solid fa-print"></i> Print</button>
        <a class="btn btn-gold btn-sm" href="admissions.html?ce=${encodeURIComponent(className)}"><i class="fa-solid fa-paper-plane"></i> Apply Now</a>
      </div>`;
    resultBox.classList.add("show");
    const total = feeTotal(data);
    resultBox.querySelector("[data-print]").addEventListener("click", () => window.print());
    resultBox.querySelector("[data-pdf]").addEventListener("click", async () => {
      const { generateFeePDF } = await import("./fee-pdf.js");
      generateFeePDF(level, className, data);
    });
  };

  viewBtn.addEventListener("click", show);
  classSel.addEventListener("change", () => resultBox.classList.remove("show"));
  return show;
}