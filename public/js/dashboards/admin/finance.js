/* ==============================================================
 * ADMIN — Finance & Docs: Fees, Requirements, Prospectus.
 * Single source of truth: `requirements/{classKey}`; `fees` mirrors.
 * ============================================================== */
import { colRef, queryData, doc, addDoc, updateDoc, setDoc, getDoc } from "../../lib/db.js";
import { db } from "../../lib/firebase.js";
import { FEE_FIELDS, feeTotal, CLASS_GROUPS, classKeyOf } from "../../pages/requirements.js";
import { esc, toast, openModal } from "../../lib/ui.js";
import { viewTitle } from "./shell.js";
import { naira } from "../../lib/site.js";

const ALL_CLASSES = [];
Object.entries(CLASS_GROUPS).forEach(([level, g]) => {
  g.levels.forEach((cn) => {
    const levelName = (level === "secondary" && /^S/.test(cn)) ? "Secondary" : ({ creche: "Creche", nursery: "Nursery", primary: "Primary" })[level] || "Secondary";
    ALL_CLASSES.push({ level: levelName, className: cn, classKey: classKeyOf(level, cn) });
  });
});

const DEFAULT_AMOUNTS = {
  creche1: 420000, creche2: 440000, nursery1: 480000, nursery2: 495000,
  p1: 520000, p2: 540000, p3: 555000, p4: 570000, p5: 580000, p6: 595000,
  jss1: 650000, jss2: 670000, jss3: 685000, ss1: 720000, ss2: 740000, ss3: 760000
};

/* ---------------- FEES (amounts per class) ---------------- */
export async function fees() {
  const host = document.getElementById("viewRoot");
  host.innerHTML = `${viewTitle("Fees", "Edit every fee item per class. Total updates automatically.", `
      <button class="dbtn dbtn-navy" id="saveAllFees"><i class="fa-solid fa-floppy-disk"></i> Save All Changes</button>`)}
    <div class="dash-card"><div class="dc-body">
      <div class="table-wrap"><table class="dtable">
        <thead><tr><th>Class</th>${FEE_FIELDS.map((f) => `<th style="text-align:right">${esc(f.label)}</th>`).join("")}<th style="text-align:right">Total</th></tr></thead>
        <tbody id="feeRows"></tbody></table></div>
    </div></div>`;

  const rows = document.getElementById("feeRows");
  const cache = {};
  const updateTotal = (row) => {
    const sum = FEE_FIELDS.reduce((acc, f) => acc + Math.max(0, +row.querySelector(`[data-k="${f.key}"]`).value || 0), 0);
    row.querySelector(".fee-total").textContent = naira(sum);
    return sum;
  };

  const render = async () => {
    const existing = await queryData(colRef("requirements"));
    existing.forEach((x) => (cache[x.classKey] = x));
    rows.innerHTML = ALL_CLASSES.map((c) => {
      const data = cache[c.classKey] || {};
      return `<tr data-key="${c.classKey}">
        <td><b style="color:var(--color-primary-dark)">${esc(c.className)}</b><div style="color:var(--color-muted);font-size:.76rem">${esc(c.level)}</div></td>
        ${FEE_FIELDS.map((f) => `<td><input type="number" min="0" data-k="${f.key}" value="${data[f.key] || DEFAULT_AMOUNTS[c.classKey] ? Math.round((DEFAULT_AMOUNTS[c.classKey] || 0) / FEE_FIELDS.length) : 0}"></td>`).join("")}
        <td><b class="fee-total" style="color:var(--color-primary-dark);white-space:nowrap">${naira(feeTotal(data))}</b></td>
      </tr>`;
    }).join("");
    rows.querySelectorAll("tr[data-key]").forEach((row) => {
      row.querySelectorAll("input").forEach((inp) => inp.addEventListener("input", () => updateTotal(row)));
      if (!(cache[row.dataset.key] || {})) {
        // prefill sensible distribution for unseeded classes
        row.querySelectorAll("input").forEach((inp) => {
          const total = DEFAULT_AMOUNTS[row.dataset.key] || 500000;
          inp.value = Math.round(total / FEE_FIELDS.length);
        });
        updateTotal(row);
      }
    });
  };

  document.getElementById("saveAllFees").addEventListener("click", async () => {
    let count = 0;
    for (const row of rows.querySelectorAll("tr[data-key]")) {
      const classKey = row.dataset.key;
      const className = row.querySelector("td b").textContent;
      const data = { levelName: className, items: null };
      const amounts = {};
      FEE_FIELDS.forEach((f) => (amounts[f.key] = Math.max(0, +row.querySelector(`[data-k="${f.key}"]`).value || 0)));
      const docData = { ...amounts, className, classKey, total: FEE_FIELDS.reduce((a, f) => a + amounts[f.key], 0), session: window.__settings ? window.__settings.session : "" };
      await setDoc(doc(db, "requirements", classKey), docData);
      await setDoc(doc(db, "fees", classKey), { ...docData, fiatOrder: FEE_FIELDS.map((f) => f.key) });
      count++;
    }
    toast(`Saved fee schedules for ${count} classes.`, "success", "Fees Saved");
  });

  await render();
}

/* ---------------- REQUIREMENTS ---------------- */
export async function requirements() {
  const host = document.getElementById("viewRoot");
  host.innerHTML = `${viewTitle("Requirements", "Admission requirement per class — same fee data surfaced publicly.", `
      <button class="dbtn dbtn-navy" id="syncReq"><i class="fa-solid fa-arrows-rotate"></i> Sync from Fees</button>`)}
    <div class="dash-card"><div class="dc-body">
      <div class="dtable-wrap"><table class="dtable">
        <thead><tr><th>Class</th><th>Level</th><th>Fee Items</th><th>Total</th><th>Actions</th></tr></thead>
        <tbody id="reqRows"></tbody></table></div>
    </div></div>`;

  const render = async () => {
    const list = await queryData(colRef("requirements"));
    document.getElementById("reqRows").innerHTML = list.map((r) => `
      <tr><td><b style="color:var(--color-primary-dark)">${esc(r.className)}</b></td><td><span class="chip gold">${esc(r.levelName || "")}</span></td>
      <td style="color:var(--color-muted)">${esc(FEE_FIELDS.filter((f) => r[f.key]).map((f) => f.label).join(", "))}</td>
      <td><b style="color:var(--color-primary-dark)">${naira(r.total)}</b></td>
      <td><button class="dbtn dbtn-soft" data-view="${esc(r.classKey)}"><i class="fa-solid fa-eye"></i></button></td></tr>`).join("") || '<tr><td colspan="5"><div class="empty-state"><p>No requirement records. Open Fees and save to generate them.</p></div></td></tr>';

    document.getElementById("reqRows").querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => {
      const r = list.find((x) => x.classKey === b.dataset.view);
      if (!r) return;
      openModal(`<div class="table-wrap"><table class="pub-table">${FEE_FIELDS.map((f) => `<tr><td>${f.label}</td><td style="text-align:right"><b>${naira(r[f.key] || 0)}</b></td></tr>`).join("")}<tr class="total"><td><b>Total</b></td><td style="text-align:right"><b>${naira(r.total)}</b></td></tr></table></div>`, `${r.className} Requirement`, "fa-receipt");
    }));
  };

  document.getElementById("syncReq").addEventListener("click", async () => {
    const feesList = await queryData(colRef("fees"));
    if (!feesList.length) { toast("No fee records to sync. Open the Fees module and Save All first.", "info"); }
    feesList.forEach((f) => setDoc(doc(db, "requirements", f.classKey), f));
    toast("Requirements synced from Fees.", "success", "Synced");
    render();
  });
  await render();
}

/* ---------------- PROSPECTUS ---------------- */
export async function prospectus() {
  const host = document.getElementById("viewRoot");
  host.innerHTML = `${viewTitle("Prospectus", "Upload or edit each class prospectus — displayed with downloadable PDFs.", `
      <button class="dbtn dbtn-navy" id="newProsp"><i class="fa-solid fa-plus"></i> Create / Edit Prospectus</button>`)}
    <div class="dash-card"><div class="dc-body">
      <div class="dtable-wrap"><table class="dtable">
        <thead><tr><th>Class</th><th>Level</th><th>Description</th><th>Last Updated</th><th>Sections</th><th>Actions</th></tr></thead>
        <tbody id="prosRows"></tbody></table></div>
    </div></div>`;

  const S = [["textbooks", "Textbooks"], ["exerciseBooks", "Exercise Books"], ["uniforms", "Uniforms"], ["stationery", "Stationery"], ["materials", "Materials"], ["resumptionItems", "Resumption Items"], ["rules", "Rules"], ["recommended", "Recommended"]];

  const render = async () => {
    const list = await queryData(colRef("prospectus"));
    document.getElementById("prosRows").innerHTML = list.map((p) => `
      <tr><td><b style="color:var(--color-primary-dark)">${esc(p.className)}</b></td><td><span class="chip gold">${esc(p.level)}</span></td>
      <td style="white-space:normal;max-width:300px;color:var(--color-muted)">${esc(p.description || "").slice(0, 90)}…</td>
      <td style="color:var(--color-muted)">${p.lastUpdated ? new Date(p.lastUpdated.toDate?.() || p.lastUpdated).toLocaleDateString("en-GB") : "—"}</td>
      <td><span class="pill navy">${S.filter(([k]) => p[k] && p[k].length).length} sections</span></td>
      <td><button class="dbtn dbtn-soft" data-edit="${esc(p.classKey)}"><i class="fa-solid fa-pen"></i> Edit</button></td></tr>`).join("") || '<tr><td colspan="6"><div class="empty-state"><p>No prospectus yet.</p></div></td></tr>';
  };

  const openEditor = async (existing) => {
    const classList = await queryData(colRef("classes"));
    const opts = classList.map((c) => `<option ${existing && c.classKey === existing.classKey ? "selected" : ""} value="${c.classKey}">${esc(c.className)}</option>`).join("");
    const m = openModal(`
      <div class="form-grid">
        <div class="form-field" style="grid-column:1/-1"><label>Class</label><select id="pClass">${opts}</select></div>
        <div class="form-field" style="grid-column:1/-1"><label>Description</label><input id="pDesc" value="${esc(existing?.description || "")}"></div>
        ${S.map(([k, label]) => `<div class="form-field" style="grid-column:1/-1"><label>${label} (one per line)</label><textarea id="p_${k}" rows="3" placeholder="Item per line">${(existing?.[k] || []).join("\n")}</textarea></div>`).join("")}
      </div>
      <button class="btn btn-gold btn-block mt-3" id="saveProsp">Save Prospectus</button>`, `${existing ? "Edit" : "Create"} Prospectus`, "fa-folder-open");
    document.getElementById("saveProsp").addEventListener("click", async () => {
      const key = document.getElementById("pClass").value;
      const body = { classKey: key, className: (classList.find((c) => c.classKey === key) || { className: key }).className, level: (classList.find((c) => c.classKey === key) || { level: "" }).level, description: document.getElementById("pDesc").value.trim(), lastUpdated: new Date() };
      S.forEach(([k]) => (body[k] = document.getElementById("p_" + k).value.split("\n").map((s) => s.trim()).filter(Boolean)));
      await setDoc(doc(db, "prospectus", key), body);
      toast("Prospectus saved.", "success", "Saved");
      m.close(); render();
    });
  };

  document.getElementById("newProsp").addEventListener("click", () => openEditor(null));
  document.getElementById("prosRows").addEventListener("click", async (e) => {
    const eb = e.target.closest("[data-edit]");
    if (!eb) return;
    const list = await queryData(colRef("prospectus"));
    openEditor(list.find((x) => x.classKey === eb.dataset.edit));
  });
  await render();
}