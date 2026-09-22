/* ==============================================================
 * ADMIN — Student management (add/edit/delete/promote/search/filter).
 * ============================================================== */
import { colRef, queryData, getDocs, setDoc, doc, addDoc, updateDoc, deleteDoc, deleteField } from "../../lib/db.js";
import { esc, toast, openModal, fmtDate } from "../../lib/ui.js";
import { viewTitle, MODULES } from "./shell.js";
import { classKeyOf } from "../../pages/requirements.js";

const LEVELS = ["Creche", "Nursery", "Primary", "Secondary"];

async function loadStudents() {
  return (await queryData(colRef("students"))).sort((a, b) => a.fullName.localeCompare(b.fullName));
}

function studentForm(st = {}) {
  return `
    <div class="form-grid">
      <div class="form-field"><label>Full Name</label><input id="f_name" required value="${esc(st.fullName || "")}" placeholder="e.g. Adeola Olamide Johnson"></div>
      <div class="form-field"><label>Admission Number</label><input id="f_adm" required value="${esc(st.admissionNumber || "")}" placeholder="e.g. GA/2026/0001"></div>
      <div class="form-field"><label>Gender</label><select id="f_gender"><option ${st.gender === "Male" ? "selected" : ""}>Male</option><option ${st.gender === "Female" ? "selected" : ""}>Female</option></select></div>
      <div class="form-field"><label>Date of Birth</label><input id="f_dob" type="date" value="${st.dob || "2012-01-01"}"></div>
      <div class="form-field"><label>Parent / Guardian</label><input id="f_parent" value="${esc(st.parent || "")}" placeholder="Parent full name"></div>
      <div class="form-field"><label>Parent Phone</label><input id="f_phone" value="${esc(st.phone || "")}" placeholder="+234 800 000 0000"></div>
      <div class="form-field" style="grid-column:1/-1"><label>Home Address</label><input id="f_address" value="${esc(st.address || "")}" placeholder="Home address"></div>
      <div class="form-field"><label>Level</label><select id="f_level">${LEVELS.map((l) => `<option ${st.level === l ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="form-field"><label>Class</label><input id="f_class" list="classList" value="${esc(st.className || "")}" placeholder="e.g. JSS1"></div>
      <div class="form-field"><label>Arm</label><select id="f_arm"><option ${!st.arm ? "selected" : ""} value="">—</option><option ${st.arm === "A" ? "selected" : ""}>A</option><option ${st.arm === "B" ? "selected" : ""}>B</option><option ${st.arm === "C" ? "selected" : ""}>C</option></select></div>
      <div class="form-field"><label>House</label><select id="f_house"><option ${st.house === "Blue House" ? "selected" : ""}>Blue House</option><option ${st.house === "Red House" ? "selected" : ""}>Red House</option><option ${st.house === "Green House" ? "selected" : ""}>Green House</option><option ${st.house === "Yellow House" ? "selected" : ""}>Yellow House</option></select></div>
      <div class="form-field" style="grid-column:1/-1"><label>Passport (path or URL)</label>
        <div class="flex"><input id="f_passport" value="${esc(st.passport || "")}" placeholder="assets/images/students/student-01.jpg"><label class="dbtn dbtn-soft" style="cursor:pointer"><i class="fa-solid fa-upload"></i> Upload<input type="file" id="f_passportFile" accept="image/*" style="display:none"></label></div>
        <div style="font-size:.78rem;color:var(--color-muted);margin-top:6px">Default avatars are auto-assigned under assets/images/students/.</div>
      </div>
      <datalist id="classList">${["Creche 1","Creche 2","Nursery 1","Nursery 2","Primary 1","Primary 2","Primary 3","Primary 4","Primary 5","Primary 6","JSS1","JSS2","JSS3","SS1","SS2","SS3"].map((c) => `<option value="${c}">`).join("")}</datalist>
    </div>`;
}

export default async function students() {
  const host = document.getElementById("viewRoot");
  host.innerHTML = `${viewTitle("Students", "Add, edit, promote and manage every learner in the school.", `
      <button class="dbtn dbtn-navy" id="addStudent"><i class="fa-solid fa-user-plus"></i> Add Student</button>
      <button class="dbtn dbtn-gold" id="promoteAll"><i class="fa-solid fa-arrow-up-right-dots"></i> Promote (Promotion System)</button>`)}
    <div class="dash-card">
      <div class="dc-body">
        <div class="toolbar">
          <div class="search-input"><i class="fa-solid fa-magnifying-glass"></i><input type="text" id="stuSearch" placeholder="Search by name or admission number…"></div>
          <select id="stuLevel"><option value="">All Levels</option>${LEVELS.map((l) => `<option>${l}</option>`).join("")}</select>
          <span class="pill gold" id="stuCount"></span>
        </div>
        <div class="dtable-wrap"><table class="dtable">
          <thead><tr><th>Student</th><th>Admission No.</th><th>Class</th><th>Arm</th><th>Gender</th><th>House</th><th>Parent</th><th>Actions</th></tr></thead>
          <tbody id="stuRows"></tbody></table></div>
      </div>
    </div>`;

  let list = [];
  const rows = document.getElementById("stuRows");
  const render = (filtered = list) => {
    document.getElementById("stuCount").textContent = `${filtered.length} students`;
    rows.innerHTML = filtered.length ? filtered.map((st) => `
      <tr>
        <td><div class="flex"><img class="avatar" src="${esc(st.passport || "assets/images/students/student-default.png")}" alt=""><div><b>${esc(st.fullName)}</b><div style="color:var(--color-muted);font-size:.78rem">${esc(st.level || "")}</div></div></div></td>
        <td><b style="color:var(--color-primary-dark)">${esc(st.admissionNumber)}</b></td>
        <td>${esc(st.className)}</td><td>${esc(st.arm || "—")}</td><td>${esc(st.gender)}</td><td>${esc(st.house || "—")}</td>
        <td>${esc(st.parent || "—")}<div style="color:var(--color-muted);font-size:.78rem">${esc(st.phone || "")}</div></td>
        <td><div class="flex">
          <button class="dbtn dbtn-soft" data-edit="${esc(st.id)}"><i class="fa-solid fa-pen"></i></button>
          <button class="dbtn dbtn-danger" data-del="${esc(st.id)}"><i class="fa-solid fa-trash"></i></button>
        </div></td>
      </tr>`).join("") : '<tr><td colspan="8"><div class="empty-state"><p>No students found.</p></div></td></tr>';
  };

  const applyFilters = () => {
    const q = (document.getElementById("stuSearch").value || "").toLowerCase();
    const lvl = document.getElementById("stuLevel").value;
    render(list.filter((st) => (!q || st.fullName.toLowerCase().includes(q) || st.admissionNumber.toLowerCase().includes(q)) && (!lvl || st.level === lvl)));
  };
  document.getElementById("stuSearch").addEventListener("input", applyFilters);
  document.getElementById("stuLevel").addEventListener("change", applyFilters);
  window.__gridFilter = applyFilters;

  const saveStudent = async (id, payload) => {
    if (payload.passportFile) { payload.passport = payload.passportFile; }
    delete payload.passportFile;
    if (id) { await updateDoc(doc(colRef("students"), id), payload); toast("Student updated.", "success", "Saved"); }
    else { const ref = addDoc(colRef("students"), payload); toast("Student added.", "success", "Saved"); }
  };

  document.getElementById("addStudent").addEventListener("click", () => {
    const m = openModal(studentForm(), "Add Student", "fa-user-plus");
    document.getElementById("f_passportFile").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { document.getElementById("f_passport").value = reader.result; };
      reader.readAsDataURL(file);
    });
    m.overlay.querySelector(".modal-body").insertAdjacentHTML("beforeend", `<button class="btn btn-gold btn-block mt-3" id="saveStu">Save Student</button>`);
    document.getElementById("saveStu").addEventListener("click", async () => {
      const name = document.getElementById("f_name").value.trim();
      if (!name) { toast("Name is required", "error"); return; }
      const kg = classKeyOf(document.getElementById("f_level").value, document.getElementById("f_class").value || "Primary 1");
      const payload = { fullName: name, admissionNumber: document.getElementById("f_adm").value.trim(), gender: document.getElementById("f_gender").value, dob: document.getElementById("f_dob").value, parent: document.getElementById("f_parent").value, phone: document.getElementById("f_phone").value, address: document.getElementById("f_address").value, level: document.getElementById("f_level").value, className: document.getElementById("f_class").value || "Primary 1", classKey: kg, arm: document.getElementById("f_arm").value, house: document.getElementById("f_house").value, passport: document.getElementById("f_passport").value || "assets/images/students/student-" + ("0" + (list.length + 1)).slice(-2) + ".jpg", passportFile: document.getElementById("f_passportFile").files[0] };
      await saveStudent(null, payload);
      m.close();
      list = await loadStudents(); render();
    });
  });

  rows.addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-edit]");
    const delBtn = e.target.closest("[data-del]");
    if (editBtn) {
      const st = list.find((x) => x.id === editBtn.dataset.edit);
      const m = openModal(studentForm(st), "Edit Student", "fa-user-pen");
      m.overlay.querySelector(".modal-body").insertAdjacentHTML("beforeend", `<button class="btn btn-gold btn-block mt-3" id="saveStuE">Save Changes</button>`);
      document.getElementById("saveStuE").addEventListener("click", async () => {
        const payload = { fullName: document.getElementById("f_name").value.trim(), admissionNumber: document.getElementById("f_adm").value.trim(), gender: document.getElementById("f_gender").value, dob: document.getElementById("f_dob").value, parent: document.getElementById("f_parent").value, phone: document.getElementById("f_phone").value, address: document.getElementById("f_address").value, level: document.getElementById("f_level").value, className: document.getElementById("f_class").value, classKey: classKeyOf(document.getElementById("f_level").value, document.getElementById("f_class").value), arm: document.getElementById("f_arm").value, house: document.getElementById("f_house").value, passport: document.getElementById("f_passport").value };
        await saveStudent(st.id, payload);
        m.close();
        list = await loadStudents(); render();
      });
    }
    if (delBtn) {
      const st = list.find((x) => x.id === delBtn.dataset.del);
      const m = openModal(`<p>Delete <b>${esc(st.fullName)}</b> (${esc(st.admissionNumber)})? This removes their student record. Their sign-in account remains unless deleted from Firebase console.</p><button class="btn btn-danger btn-block mt-3" style="background:var(--color-danger);color:#fff" id="confirmDel">Yes, Delete Student</button>`, "Delete Student", "fa-trash");
      document.getElementById("confirmDel").addEventListener("click", async () => {
        await deleteDoc(doc(colRef("students"), st.id));
        toast("Student deleted.", "success", "Deleted");
        m.close();
        list = await loadStudents(); render();
      });
    }
  });

  document.getElementById("promoteAll").addEventListener("click", () => {
    const gradNext = (c) => ({ "Creche 1": "Creche 2", "Creche 2": "Nursery 1", "Nursery 1": "Nursery 2", "Nursery 2": "Primary 1", "Primary 1": "Primary 2", "Primary 2": "Primary 3", "Primary 3": "Primary 4", "Primary 4": "Primary 5", "Primary 5": "Primary 6", "Primary 6": "JSS1", JSS1: "JSS2", JSS2: "JSS3", JSS3: "SS1", SS1: "SS2", SS2: "SS3", SS3: "Graduated" }[c] || c);
    const m = openModal(`
      <p>End-of-session promotion moves every learner to the next class automatically.</p>
      <div class="table-wrap mt-3"><table class="pub-table"><thead><tr><th>From</th><th>To</th></tr></thead><tbody>
        ${Object.keys({ "Creche 1": 1,"Creche 2":1,"Nursery 1":1,"Nursery 2":1,"Primary 1":1,"Primary 2":1,"Primary 3":1,"Primary 4":1,"Primary 5":1,"Primary 6":1,JSS1:1,JSS2:1,JSS3:1,SS1:1,SS2:1,SS3:1}).map((c) => `<tr><td>${c}</td><td><b>${gradNext(c)}</b></td></tr>`).join("")}
      </tbody></table></div>
      <button class="btn btn-gold btn-block mt-3" id="goPromote"><i class="fa-solid fa-arrow-trend-up"></i> Promote All Students</button>` , "Promotion System", "fa-arrow-up-right-dots");
    document.getElementById("goPromote").addEventListener("click", async () => {
      let done = 0;
      for (const st of list) {
        const next = gradNext(st.className);
        if (next && next !== "Graduated") {
          await updateDoc(doc(colRef("students"), st.id), { className: next, classKey: classKeyOf(st.level === "Secondary" ? "secondary" : (next.includes("Creche") ? "creche" : next.includes("Nursery") ? "nursery" : next.includes("Primary") ? "primary" : "secondary"), next), level: next.includes("Creche") ? "Creche" : next.includes("Nursery") ? "Nursery" : next.includes("Primary") ? "Primary" : "Secondary" });
        } else if (next === "Graduated") {
          await updateDoc(doc(colRef("students"), st.id), { status: "Graduated" });
        }
        done++;
      }
      toast(`Promotion complete for ${done} students.`, "success", "Done");
      m.close();
      list = await loadStudents(); render();
    });
  });

  list = await loadStudents();
  render();
}