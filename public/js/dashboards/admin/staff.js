/* ==============================================================
 * ADMIN — Staff management with many-to-many teacher assignments.
 * ============================================================== */
import { colRef, queryData, doc, addDoc, updateDoc, deleteDoc, getDocs, setDoc } from "../../lib/db.js";
import { esc, toast, openModal } from "../../lib/ui.js";
import { viewTitle } from "./shell.js";

async function loadAll() {
  const [staff, classes, subjects, assignments] = await Promise.all([
    queryData(colRef("staff")), queryData(colRef("classes")),
    queryData(colRef("subjects")), queryData(colRef("teacherAssignments"))
  ]);
  return { staff, classes, subjects, assignments };
}

function staffForm(st = {}, classes, subjects, assignments = []) {
  const mine = assignments.filter((a) => a.teacherId === st.id);
  return `
    <div class="form-grid">
      <div class="form-field"><label>Full Name</label><input id="f_name" required value="${esc(st.fullName || "")}"></div>
      <div class="form-field"><label>Staff ID</label><input id="f_staffId" value="${esc(st.staffId || "")}"></div>
      <div class="form-field"><label>Email</label><input id="f_email" type="email" value="${esc(st.email || "")}"></div>
      <div class="form-field"><label>Phone</label><input id="f_phone" value="${esc(st.phone || "")}"></div>
      <div class="form-field"><label>Type</label><select id="f_type"><option ${st.type === "Teaching" ? "selected" : ""}>Teaching</option><option ${st.type === "Non-Teaching" ? "selected" : ""}>Non-Teaching</option></select></div>
      <div class="form-field"><label>Department</label><input id="f_dept" list="deptList" value="${esc(st.department || "")}"></div>
      <div class="form-field"><label>Role / Title</label><input id="f_role" value="${esc(st.role || "Teacher")}"></div>
      <div class="form-field"><label>Form Teacher</label><select id="f_form"><option ${st.formTeacher === "Yes" ? "selected" : ""}>Yes</option><option ${st.formTeacher === "No" ? "selected" : ""}>No</option></select></div>
      <div class="form-field" style="grid-column:1/-1"><label>Passport</label><div class="flex"><input id="f_passport" value="${esc(st.passport || "")}" placeholder="assets/images/staff/staff-01.jpg"><label class="dbtn dbtn-soft" style="cursor:pointer"><i class="fa-solid fa-upload"></i> Upload<input type="file" id="f_passportFile" accept="image/*" style="display:none"></label></div></div>
      <datalist id="deptList"><option>Science</option><option>Arts & Humanities</option><option>Commercial</option><option>Early Years</option><option>Languages</option><option>ICT</option><option>Administration</option><option>Finance</option><option>Non-Teaching</option></datalist>
    </div>
    <div class="mt-3" style="border:1px solid var(--color-border);border-radius:var(--radius);padding:16px">
      <b style="color:var(--color-primary-dark)"><i class="fa-solid fa-link"></i> Teacher Assignments <span style="font-weight:400;color:var(--color-muted);font-size:.78rem">(one per subject+class; supports multi-class / whole-school)</span></b>
      <div id="assignList" class="mt-3" style="display:flex;flex-direction:column;gap:8px">
        ${mine.map((a) => `
          <div class="flex" data-assign="${esc(a.id)}">
            <select class="as-class" style="flex:1;padding:9px;border-radius:10px;border:1.5px solid var(--color-border)">${classes.map((c) => `<option ${c.classKey === a.classId ? "selected" : ""} value="${c.classKey}">${esc(c.className)}</option>`).join("")}</select>
            <select class="as-subj" style="flex:1;padding:9px;border-radius:10px;border:1.5px solid var(--color-border)">${subjects.map((s) => `<option ${s.id === a.subjectId ? "selected" : ""} value="${s.id}">${esc(s.name)}</option>`).join("")}</select>
            <label class="flex" style="font-size:.82rem;white-space:nowrap"><input type="checkbox" class="as-form" ${a.isFormTeacher ? "checked" : ""}> Form</label>
            <button class="dbtn dbtn-danger as-del" type="button"><i class="fa-solid fa-trash"></i></button>
          </div>`).join("")}
      </div>
      <button class="dbtn dbtn-soft mt-3" id="addAssign" type="button" style="border-style:dashed"><i class="fa-solid fa-plus"></i> Add Assignment</button>
    </div>
    <datalist id="clsOptions"></datalist>`;
}

export default async function staff() {
  const host = document.getElementById("viewRoot");
  const { staff, classes, subjects, assignments } = await loadAll();
  host.innerHTML = `${viewTitle("Staff", "30 staff members — teaching & non-teaching, with flexible class assignments.", `
      <button class="dbtn dbtn-navy" id="addStaff"><i class="fa-solid fa-user-plus"></i> Add Staff</button>`)}
    <div class="dash-card"><div class="dc-body">
      <div class="toolbar">
        <div class="search-input"><i class="fa-solid fa-magnifying-glass"></i><input type="text" id="staffSearch" placeholder="Search staff…"></div>
        <select id="staffType"><option value="">All Types</option><option>Teaching</option><option>Non-Teaching</option></select>
        <span class="pill gold" id="staffCount"></span>
      </div>
      <div class="dtable-wrap"><table class="dtable">
        <thead><tr><th>Staff</th><th>Staff ID</th><th>Department</th><th>Role</th><th>Form Teacher</th><th>Assignments</th><th>Actions</th></tr></thead>
        <tbody id="staffRows"></tbody></table></div>
    </div></div>`;

  let list = staff;
  const rows = document.getElementById("staffRows");

  const render = (filtered = list) => {
    document.getElementById("staffCount").textContent = `${filtered.length} staff`;
    rows.innerHTML = filtered.map((st) => {
      const count = assignments.filter((a) => a.teacherId === st.id).length;
      return `<tr>
        <td><div class="flex"><img class="avatar" src="${esc(st.passport || "assets/images/staff/staff-default.png")}" alt=""><div><b>${esc(st.fullName)}</b><div style="color:var(--color-muted);font-size:.78rem">${esc(st.email || "")}</div></div></div></td>
        <td><b style="color:var(--color-primary-dark)">${esc(st.staffId || "—")}</b></td>
        <td>${esc(st.department || "—")}</td><td>${esc(st.role || "—")}</td>
        <td><span class="chip ${st.formTeacher === "Yes" ? "gold" : "navy"}">${esc(st.formTeacher || "No")}</span></td>
        <td><span class="chip green">${count} subject-class</span></td>
        <td><div class="flex">
          <button class="dbtn dbtn-soft" data-edit="${esc(st.id)}"><i class="fa-solid fa-pen"></i></button>
          <button class="dbtn dbtn-danger" data-del="${esc(st.id)}"><i class="fa-solid fa-trash"></i></button>
        </div></td></tr>`;
    }).join("") || '<tr><td colspan="7"><div class="empty-state"><p>No staff found.</p></div></td></tr>';
  };

  document.getElementById("staffSearch").addEventListener("input", () => {
    const q = document.getElementById("staffSearch").value.toLowerCase();
    render(list.filter((s) => s.fullName.toLowerCase().includes(q) || (s.staffId || "").toLowerCase().includes(q)));
  });
  document.getElementById("staffType").addEventListener("change", () => {
    const t = document.getElementById("staffType").value;
    render(t ? list.filter((s) => s.type === t) : list);
  });

  const openStaffModal = (st, editing) => {
    const m = openModal(staffForm(st, classes, subjects, assignments.filter((a) => a.teacherId === st.id)), editing ? "Edit Staff" : "Add Staff", "fa-user-tie");
    const assignBox = m.overlay.querySelector("#assignList");
    const addAssign = () => {
      const row = document.createElement("div");
      row.className = "flex";
      row.innerHTML = `
        <select style="flex:1;padding:9px;border-radius:10px;border:1.5px solid var(--color-border)">${classes.map((c) => `<option value="${c.classKey}">${esc(c.className)}</option>`).join("")}</select>
        <select style="flex:1;padding:9px;border-radius:10px;border:1.5px solid var(--color-border)">${subjects.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select>
        <label class="flex" style="font-size:.82rem;white-space:nowrap"><input type="checkbox" class="as-form" checked> Form</label>
        <button class="dbtn dbtn-danger rm-assign" type="button"><i class="fa-solid fa-minus"></i></button>`;
      assignBox.appendChild(row);
      row.querySelector(".rm-assign").addEventListener("click", () => row.remove());
    };
    m.overlay.querySelector("#addAssign").addEventListener("click", addAssign);
    assignBox.querySelectorAll(".as-del").forEach((b) => {
      const row = b.closest("[data-assign]");
      const aid = row.dataset.assign;
      row.querySelector(".as-del").addEventListener("click", async () => {
        await deleteDoc(doc(colRef("teacherAssignments"), aid));
        row.remove();
        toast("Assignment removed.", "success");
      });
    });
    document.getElementById("f_passportFile").addEventListener("change", (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader(); r.onload = () => (document.getElementById("f_passport").value = r.result); r.readAsDataURL(f);
    });

    m.overlay.querySelector(".modal-body").insertAdjacentHTML("beforeend", `<button class="btn btn-gold btn-block mt-3" id="saveStaff">${editing ? "Save Changes" : "Save Staff"}</button>`);
    document.getElementById("saveStaff").addEventListener("click", async () => {
      const name = document.getElementById("f_name").value.trim();
      if (!name) { toast("Name is required", "error"); return; }
      const payload = { fullName: name, staffId: document.getElementById("f_staffId").value.trim(), email: document.getElementById("f_email").value.trim(), phone: document.getElementById("f_phone").value.trim(), type: document.getElementById("f_type").value, department: document.getElementById("f_dept").value, role: document.getElementById("f_role").value, formTeacher: document.getElementById("f_form").value, passport: document.getElementById("f_passport").value, sessionTerm: window.__settings ? `${window.__settings.session} | ${window.__settings.term}` : "" };
      const newAssignments = [];
      m.overlay.querySelectorAll("#assignList > .flex[data-assign]").forEach((row) => {
        newAssignments.push({ id: row.dataset.assign || null, classId: row.querySelector(".as-class").value, subjectId: row.querySelector(".as-subj").value, isFormTeacher: row.querySelector(".as-form").checked });
      });
      m.overlay.querySelectorAll("#assignList > .flex:not([data-assign])").forEach((row) => {
        newAssignments.push({ id: null, classId: row.querySelector("select").value, subjectId: row.querySelectorAll("select")[1].value, isFormTeacher: row.querySelector(".as-form").checked });
      });

      let staffId = editing ? st.id : null;
      if (staffId) { await updateDoc(doc(colRef("staff"), staffId), payload); }
      else { const ref = await addDoc(colRef("staff"), payload); staffId = ref.id; }

      for (const a of newAssignments) {
        const body = { teacherId: staffId, subjectId: a.subjectId, classId: a.classId, isFormTeacher: a.isFormTeacher };
        if (a.id) await updateDoc(doc(colRef("teacherAssignments"), a.id), body);
        else await addDoc(colRef("teacherAssignments"), body);
      }
      toast("Staff record saved.", "success", "Saved");
      m.close();
      location.hash = "#staff";
      location.reload();
    });
  };

  document.getElementById("addStaff").addEventListener("click", () => openStaffModal({}, false));
  rows.addEventListener("click", (e) => {
    const eb = e.target.closest("[data-edit]");
    const db = e.target.closest("[data-del]");
    if (eb) { const st = list.find((s) => s.id === eb.dataset.edit); openStaffModal(st, true); }
    if (db) {
      const st = list.find((s) => s.id === db.dataset.del);
      const m = openModal(`<p>Delete <b>${esc(st.fullName)}</b> and their assignments?</p><button class="btn btn-block mt-3" id="cDel" style="background:var(--color-danger);color:#fff">Delete</button>`, "Delete Staff", "fa-trash");
      document.getElementById("cDel").addEventListener("click", async () => {
        await deleteDoc(doc(colRef("staff"), st.id));
        assignments.filter((a) => a.teacherId === st.id).forEach(async (a) => deleteDoc(doc(colRef("teacherAssignments"), a.id)));
        toast("Staff deleted.", "success");
        m.close(); location.reload();
      });
    }
  });

  render();
}