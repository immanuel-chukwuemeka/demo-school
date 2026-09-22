/* ==============================================================
 * PUBLIC PROSPECTUS PAGE — lists per-class prospectus from
 * Firestore, renders 'View Online' modal + jsPDF download.
 * ============================================================== */
import { colRef, queryData } from "../lib/db.js";
import { esc, toast, fmtDate, openModal } from "../lib/ui.js";
import { loadSettings } from "../lib/site.js";
import { initReveal } from "../lib/anim.js";

const SECTIONS = [
  { key: "textbooks", icon: "fa-book-open", label: "Required Textbooks" },
  { key: "exerciseBooks", icon: "fa-book", label: "Exercise Books" },
  { key: "uniforms", icon: "fa-tshirt", label: "Uniforms" },
  { key: "stationery", icon: "fa-pen-ruler", label: "Stationery" },
  { key: "materials", icon: "fa-box-open", label: "School Materials" },
  { key: "resumptionItems", icon: "fa-suitcase", label: "Resumption Items" },
  { key: "rules", icon: "fa-scale-balanced", label: "Rules" },
  { key: "recommended", icon: "fa-star", label: "Recommended Supplies" }
];

function listUL(items) {
  if (!items || !items.length) return "";
  return `<ul class="feature-list">${items.map((i) => `<li><i class="fa-solid fa-diamond"></i><div>${esc(i)}</div></li>`).join("")}</ul>`;
}

export function prospectusModal(p) {
  const body = SECTIONS.filter((s) => p[s.key] && p[s.key].length).map((s) => `
    <div style="margin-bottom:18px">
      <h4 style="color:var(--color-primary-dark);display:flex;align-items:center;gap:10px;margin-bottom:8px"><i class="fa-solid ${s.icon}" style="color:var(--color-accent)"></i> ${s.label}</h4>
      ${listUL(p[s.key])}
    </div>`).join("");
  openModal(`
    <div class="text-center mb-3" style="border-bottom:1px solid var(--color-border);padding-bottom:14px">
      <h4 style="font-size:1.3rem;color:var(--color-primary-dark)">${esc(p.className)} Prospectus</h4>
      <p style="color:var(--color-muted);font-size:.88rem">${esc(p.description || "")}</p>
    </div>
    ${body}
    <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn btn-navy" style="flex:1" onclick="gaDownloadProspectus('${esc(p.classKey)}')"><i class="fa-solid fa-file-pdf"></i> Download PDF</button>
    </div>`, `${esc(p.className)} at ${window.__settings ? window.__settings.name : "Greenwood Academy"}`, "fa-book-open");
}

window.gaDownloadProspectus = async (classKey) => {
  const { generateProspectusPDF } = await import("../lib/prospectus-pdf.js");
  const list = await queryData(colRef("prospectus"));
  const p = list.find((x) => x.classKey === classKey);
  if (p) generateProspectusPDF(p);
};

async function renderTabs(prospects) {
  const host = document.getElementById("prospectusList");
  const levels = ["creche", "nursery", "primary", "secondary"];
  const label = { creche: "Creche", nursery: "Nursery", primary: "Primary", secondary: "Secondary" };
  host.innerHTML = `
    <div class="tabs" id="prospTabs">${levels.map((l) => `<button class="tab-btn ${l === "creche" ? "active" : ""}" data-lvl="${l}">${label[l]}</button>`).join("")}</div>
    ${levels.map((l) => `
      <div class="tab-pane ${l === "creche" ? "active" : ""}" data-pane="${l}">
        <div class="grid grid-2 stagger">
          ${prospects.filter((p) => p.level === l).map((p) => `
            <article class="card card-hover reveal" style="cursor:pointer">
              <div class="flex" style="justify-content:space-between;align-items:flex-start;gap:12px">
                <div>
                  <h3 style="font-size:1.15rem;color:var(--color-primary-dark)">${esc(p.className)} Prospectus</h3>
                  <p style="color:var(--color-muted);font-size:.88rem;margin-top:6px">${esc(p.description || "")}</p>
                </div>
                <span class="pill gold"><i class="fa-regular fa-circle-check"></i> Updated ${fmtDate(p.lastUpdated)}</span>
              </div>
              <div class="flex mt-3" style="flex-wrap:wrap">
                <button class="btn btn-navy btn-sm" data-view="${esc(p.classKey)}"><i class="fa-solid fa-eye"></i> View Online</button>
                <button class="btn btn-soft btn-sm" data-pdf="${esc(p.classKey)}" style="background:var(--color-cloud);border:1.5px solid var(--color-border);color:var(--color-primary-dark)"><i class="fa-solid fa-file-pdf"></i> Download PDF</button>
              </div>
            </article>`).join("") || '<div class="empty-state" style="grid-column:1/-1"><i class="fa-regular fa-folder-open"></i><p>No prospectus published yet.</p></div>'}
        </div>
      </div>`).join("")}`;
  initReveal(host);
  host.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => prospectusModal(prospects.find((p) => p.classKey === b.dataset.view))));
  host.querySelectorAll("[data-pdf]").forEach((b) => b.addEventListener("click", () => window.gaDownloadProspectus(b.dataset.pdf)));
  host.querySelectorAll(".tab-btn").forEach((b) => b.addEventListener("click", () => {
    host.querySelectorAll(".tab-btn").forEach((x) => x.classList.remove("active"));
    host.querySelectorAll(".tab-pane").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    host.querySelector(`[data-pane="${b.dataset.lvl}"]`).classList.add("active");
  }));
}

(async () => {
  const host = document.getElementById("prospectusList");
  const settings = await loadSettings();
  window.__settings = settings;
  try {
    const list = await queryData(colRef("prospectus"));
    const indexed = {};
    list.forEach((p) => (indexed[p.classKey] = p));
    await renderTabs(list.sort((a, b) => a.className.localeCompare(b.className)));
  } catch {
    host.innerHTML = '<div class="empty-state"><i class="fa-regular fa-folder-open"></i><p>Prospectus unavailable. Please try again soon.</p></div>';
  }
})();