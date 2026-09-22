/* ==============================================================
 * ADMIN — Classes, Subjects, Departments (creche → SSS3, arms A–C).
 * ============================================================== */
import { colRef, queryData, doc, addDoc, updateDoc, deleteDoc } from "../../lib/db.js";
import { esc, toast, openModal } from "../../lib/ui.js";
import { viewTitle } from "./shell.js";

const LEVELS = ["Creche", "Nursery", "Primary", "Secondary"];
const CLASS_NAMES = ["Creche 1", "Creche 2", "Nursery 1", "Nursery 2", "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6", "JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"];

/* ---------------- CLASSES ---------------- */
export default function classes() {
  const host = document.getElementById("viewRoot");
  host.innerHTML = `${viewTitle("Classes", "Create, edit and delete classes with arms A–C.", `
      <button class="dbtn dbtn-navy" id="addClass"><i class="fa-solid fa-plus"></i> New Class</button>`)}
    <div class="dash-card"><div class="dc-body">
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px" id="classGrid"></div>
    </div></div>`;

  const render = async () => {
    const list = await queryData(colRef("classes"));
    document.getElementById("classGrid").innerHTML = list.map((c) => `
      <div class="card card-hover" style="padding:18px">
        <div class="flex" style="justify-content:space-between"><b style="color:var(--color-primary-dark)">${esc(c.className)}</b><span class="chip gold">${esc(c.level)}</span></div>
        <div style="color:var(--color-muted);font-size:.85rem;margin-top:8px">Class Key: <code>${esc(c.classKey)}</code></div>
        <div class="flex mt-3" style="gap:8px">
          ${(c.arms || ["A", "B", "C"]).map((a) => `<span class="pill navy">Arm ${esc(a)}</span>`).join("") || ""}
        </div>
        <div class="flex mt-3">
          <button class="dbtn dbtn-soft" data-edit="${esc(c.id)}"><i class="fa-solid fa-pen"></i></button>
          <button class="dbtn dbtn-danger" data-del="${esc(c.id)}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`).join("") || '<div class="empty-state"><p>No classes yet.</p></div>';
  };

  const form = (c = {}) => `
    <div class="form-grid">
      <div class="form-field"><label>Level</label><select id="cLevel">${LEVELS.map((l) => `<option ${c.level === l ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="form-field"><label>Class Name</label><input id="cName" list="classNameList" required value="${esc(c.className || "")}"></div>
      <div class="form-field" style="grid-column:1/-1"><label>Arms (comma separated)</label><input id="cArms" value="${esc((c.arms || ["A", "B", "C"]).join(", "))}"></div>
      <div class="form-field" style="grid-column:1/-1"><label>Class Key</label><input id="cKey" value="${esc(c.classKey || "")}" placeholder="auto from name"></div>
    </div>
    <datalist id="classNameList">${CLASS_NAMES.map((n) => `<option value="${n}">`).join("")}</datalist>`;

  document.getElementById("addClass").addEventListener("click", () => {
    const m = openModal(form(), "New Class", "fa-school");
    m.overlay.querySelector("#cName").addEventListener("input", (e) => {
      const v = e.target.value;
      if (v) document.getElementById("cKey").value = v.toLowerCase().replace(/\s/g, "");
    });
    m.overlay.querySelector(".modal-body").insertAdjacentHTML("beforeend", `<button class="btn btn-gold btn-block mt-3" id="saveClass">Save Class</button>`);
    document.getElementById("saveClass").addEventListener("click", async () => {
      const name = document.getElementById("cName").value.trim();
      if (!name) { toast("Class name required", "error"); return; }
      await addDoc(colRef("classes"), {
        className: name, level: document.getElementById("cLevel").value,
        classKey: document.getElementById("cKey").value || name.toLowerCase().replace(/\s/g, ""),
        arms: document.getElementById("cArms").value.split(",").map((s) => s.trim()).filter(Boolean)
      });
      toast("Class created.", "success", "Saved"); m.close(); render();
    });
  });

  document.getElementById("classGrid").addEventListener("click", (e) => {
    const eb = e.target.closest("[data-edit]");

    const db = e.target.closest("[data-del]");
    if (db) {
      const m = openModal(`<p>Delete this class? Students remain but the class record is removed.</p><button class="btn btn-block mt-3" style="background:var(--color-danger);color:#fff" id="cdl">Delete Class</button>`, "Delete Class", "fa-trash");
      document.getElementById("cdl").addEventListener("click", async () => { await deleteDoc(doc(colRef("classes"), db.dataset.del)); toast("Class deleted.", "success"); m.close(); render(); });
    }
    if (eb) {
      queryData(colRef("classes")).then((list) => {
        const c = list.find((x) => x.id === eb.dataset.edit);
        const m = openModal(form(c), "Edit Class", "fa-pen");
        m.overlay.querySelector(".modal-body").insertAdjacentHTML("beforeend", `<button class="btn btn-gold btn-block mt-3" id="saveClass">Save Changes</button>`);
        document.getElementById("saveClass").addEventListener("click", async () => {
          await updateDoc(doc(colRef("classes"), c.id), {
            className: document.getElementById("cName").value.trim(),
            level: document.getElementById("cLevel").value,
            classKey: document.getElementById("cKey").value || c.classKey,
            arms: document.getElementById("cArms").value.split(",").map((s) => s.trim()).filter(Boolean)
          });
          toast("Class updated.", "success", "Saved"); m.close(); render();
        });
      });
    }
  });
  render();
}

/* ---------------- SUBJECTS ---------------- */
export function subjects() {
  const host = document.getElementById("viewRoot");
  host.innerHTML = `${viewTitle("Subjects", "Subjects belong mainly to Secondary; assign them to classes as needed.", `
      <button class="dbtn dbtn-navy" id="addSubj"><i class="fa-solid fa-plus"></i> New Subject</button>`)}
    <div class="dash-card"><div class="dc-body">
      <div class="dtable-wrap"><table class="dtable"><thead><tr><th>Subject</th><th>Code</th><th>Level</th><th>Description</th><th>Actions</th></tr></thead><tbody id="subjRows"></tbody></table></div>
    </div></div>`;

  const render = async () => {
    const list = await queryData(colRef("subjects"));
    document.getElementById("subjRows").innerHTML = list.map((s) => `
      <tr><td><b style="color:var(--color-primary-dark)">${esc(s.name)}</b></td><td>${esc(s.code || "—")}</td><td><span class="chip gold">${esc(s.level || "Secondary")}</span></td>
      <td style="white-space:normal;max-width:360px;color:var(--color-muted)">${esc(s.description || "")}</td>
      <td><div class="flex"><button class="dbtn dbtn-soft" data-edit="${esc(s.id)}"><i class="fa-solid fa-pen"></i></button>
      <button class="dbtn dbtn-danger" data-del="${esc(s.id)}"><i class="fa-solid fa-trash"></i></button></div></td></tr>`).join("") || '<tr><td colspan="5"><div class="empty-state"><p>No subjects yet.</p></div></td></tr>';
  };

  const form = (s = {}) => `
    <div class="form-grid">
      <div class="form-field"><label>Subject Name</label><input id="sName" required value="${esc(s.name || "")}"></div>
      <div class="form-field"><label>Subject Code</label><input id="sCode" value="${esc(s.code || "")}"></div>
      <div class="form-field"><label>Primarily Offered In</label><select id="sLevel"><option ${s.level === "Secondary" ? "selected" : ""}>Secondary</option><option ${s.level === "Primary" ? "selected" : ""}>Primary</option><option ${s.level === "All" ? "selected" : ""}>All Levels</option></select></div>
      <div class="form-field"><label>Max CA1 / CA2</label><input id="sCaMax" type="number" value="${s.caMax || 20}"></div>
      <div class="form-field"><label>Max Exam</label><input id="sExamMax" type="number" value="${s.examMax || 60}"></div>
      <div class="form-field" style="grid-column:1/-1"><label>Description</label><input id="sDesc" value="${esc(s.description || "")}"></div>
    </div>`;

  document.getElementById("addSubj").addEventListener("click", () => {
    const m = openModal(form(), "New Subject", "fa-book-open");
    m.overlay.querySelector(".modal-body").insertAdjacentHTML("beforeend", `<button class="btn btn-gold btn-block mt-3" id="saveSubj">Save Subject</button>`);
    document.getElementById("saveSubj").addEventListener("click", async () => {
      const name = document.getElementById("sName").value.trim();
      if (!name) { toast("Subject name required", "error"); return; }
      await addDoc(colRef("subjects"), { name, code: document.getElementById("sCode").value.trim().toUpperCase(), level: document.getElementById("sLevel").value, caMax: +document.getElementById("sCaMax").value, examMax: +document.getElementById("sExamMax").value, description: document.getElementById("sDesc").value.trim() });
      toast("Subject created.", "success", "Saved"); m.close(); render();
    });
  });

  document.getElementById("subjRows").addEventListener("click", async (e) => {
    const eb = e.target.closest("[data-edit]");
    const db = e.target.closest("[data-del]");
    const list = await queryData(colRef("subjects"));
    if (eb) {
      const s = list.find((x) => x.id === eb.dataset.edit);
      const m = openModal(form(s), "Edit Subject", "fa-pen");
      m.overlay.querySelector(".modal-body").insertAdjacentHTML("beforeend", `<button class="btn btn-gold btn-block mt-3" id="saveSubj">Save</button>`);
      document.getElementById("saveSubj").addEventListener("click", async () => {
        await updateDoc(doc(colRef("subjects"), s.id), { name: document.getElementById("sName").value.trim(), code: document.getElementById("sCode").value.trim().toUpperCase(), level: document.getElementById("sLevel").value, caMax: +document.getElementById("sCaMax").value, examMax: +document.getElementById("sExamMax").value, description: document.getElementById("sDesc").value.trim() });
        toast("Subject updated.", "success"); m.close(); render();
      });
    }
    if (db) { await deleteDoc(doc(colRef("subjects"), db.dataset.del)); toast("Subject deleted.", "success"); render(); }
  });
  render();
}

/* ---------------- DEPARTMENTS ---------------- */
export function departments() {
  const host = document.getElementById("viewRoot");
  host.innerHTML = `${viewTitle("Departments", "Academic and administrative departments.", `
      <button class="dbtn dbtn-navy" id="addDept"><i class="fa-solid fa-plus"></i> New Department</button>`)}
    <div class="dash-card"><div class="dc-body">
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px" id="deptGrid"></div>
    </div></div>`;

  const render = async () => {
    const depts = await queryData(colRef("departments"));
    const staff = await queryData(colRef("staff"));
    document.getElementById("deptGrid").innerHTML = depts.map((d) => `
      <div class="card card-hover" style="padding:18px">
        <div class="icon-chip" style="width:46px;height:46px;font-size:1.1rem"><i class="fa-solid fa-building-columns"></i></div>
        <b style="color:var(--color-primary-dark)">${esc(d.name)}</b>
        <div style="color:var(--color-muted);font-size:.85rem">${staff.filter((s) => s.department === d.name).length} staff members</div>
        <div class="flex mt-3">
          <button class="dbtn dbtn-soft" data-edit="${esc(d.id)}"><i class="fa-solid fa-pen"></i></button>
          <button class="dbtn dbtn-danger" data-del="${esc(d.id)}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`).join("") || '<div class="empty-state"><p>No departments yet.</p></div>';
  };

  document.getElementById("addDept").addEventListener("click", () => {
    const m = openModal(`<div class="form-field"><label>Department Name</label><input id="dName" required></div>
      <div class="form-field mt-3"><label>Head</label><input id="dHead"></div>
      <button class="btn btn-gold btn-block mt-3" id="saveDept">Save Department</button>`, "New Department", "fa-building-columns");
    document.getElementById("saveDept").addEventListener("click", async () => {
      const name = document.getElementById("dName").value.trim();
      if (!name) { toast("Name required", "error"); return; }
      await addDoc(colRef("departments"), { name, head: document.getElementById("dHead").value.trim() });
      toast("Department created.", "success"); m.close(); render();
    });
  });

  document.getElementById("deptGrid").addEventListener("click", async (e) => {
    const eb = e.target.closest("[data-edit]");
    const db = e.target.closest("[data-del]");
    const depts = await queryData(colRef("departments"));
    if (eb) {
      const d = depts.find((x) => x.id === eb.dataset.edit);
      const m = openModal(`<div class="form-field"><label>Department Name</label><input id="dName" value="${esc(d.name)}" required></div>
        <div class="form-field mt-3"><label>Head</label><input id="dHead" value="${esc(d.head || "")}"></div>
        <button class="btn btn-gold btn-block mt-3" id="saveDeptE">Save Changes</button>`, "Edit Department", "fa-pen");
      document.getElementById("saveDeptE").addEventListener("click", async () => {
        await updateDoc(doc(colRef("departments"), d.id), { name: document.getElementById("dName").value.trim(), head: document.getElementById("dHead").value.trim() });
        toast("Department updated.", "success"); m.close(); render();
      });
    }
    if (db) { await deleteDoc(doc(colRef("departments"), db.dataset.del)); toast("Department deleted.", "success"); render(); }
  });
  render();
}