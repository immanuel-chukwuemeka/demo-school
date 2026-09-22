/* ==============================================================
 * ADMIN — Scratch cards for parent result access. PINs are 10-digit
 * numeric string document IDs in `scratchPins`. Generate in bulk,
 * track usage, export CSV.
 * ============================================================== */
import { colRef, queryData, doc, setDoc, deleteDoc, limit, getDocs, query } from "../../lib/db.js";
import { db } from "../../lib/firebase.js";
import { esc, toast, openModal } from "../../lib/ui.js";
import { viewTitle } from "./shell.js";
import { CLASS_GROUPS, classKeyOf } from "../../pages/requirements.js";

const ALL_CLASSES = [];
Object.entries(CLASS_GROUPS).forEach(([level, g]) => g.levels.forEach((cn) => {
  const levelName = (level === "secondary" && /^S/.test(cn)) ? "Secondary" : ({ creche: "Creche", nursery: "Nursery", primary: "Primary" })[level] || "Secondary";
  ALL_CLASSES.push({ level: levelName, className: cn, classKey: classKeyOf(level, cn) });
}));

function genPin() {
  let pin = "";
  for (let i = 0; i < 10; i++) pin += Math.floor(Math.random() * 10);
  return pin;
}

export default async function scratchcards() {
  const host = document.getElementById("viewRoot");
  host.innerHTML = `${viewTitle("Scratch Cards", "Parent access PINs. Each 10-digit PIN maps to one student and resets per attempt-window.", `
      <button class="dbtn dbtn-navy" id="genPins"><i class="fa-solid fa-cash-register"></i> Generate PINs</button>
      <button class="dbtn dbtn-soft" id="dlCsv"><i class="fa-solid fa-file-csv"></i> Export CSV</button>`)}
    <div class="dash-card"><div class="dc-body">
      <div class="toolbar">
        <select id="pinClass">${ALL_CLASSES.map((c) => `<option value="${c.classKey}">${esc(c.className)}</option>`).join("")}</select>
        <div class="search-input"><i class="fa-solid fa-magnifying-glass"></i><input type="text" id="pinSearch" placeholder="Search PIN or student…"></div>
        <span class="pill gold" id="pinCount"></span>
      </div>
      <div class="dtable-wrap"><table class="dtable">
        <thead><tr><th>PIN</th><th>Student</th><th>Adm No</th><th>1st</th><th>2nd</th><th>3rd</th><th>Status</th><th>Created</th><th></th></tr></thead>
        <tbody id="pinRows"></tbody></table></div>
    </div></div>`;

  const rows = document.getElementById("pinRows");
  let currentClass = ALL_CLASSES[0].classKey;
  let all = [];

  const render = async () => {
    const pins = await queryData(colRef("scratchPins"));
    all = pins;
    const students = await queryData(colRef("students"));
    const filtered = pins.filter((p) => p.classId === currentClass);
    document.getElementById("pinCount").textContent = `${filtered.length} PINs`;
    rows.innerHTML = filtered.map((p) => {
      const st = students.find((s) => s.admissionNumber === p.admissionNumber);
      const used = Math.max(p.firstTermAttempts || 0, p.secondTermAttempts || 0, p.thirdTermAttempts || 0);
      return `<tr>
        <td><code style="font-size:1rem;font-weight:700;color:var(--color-primary-dark);letter-spacing:1px">${esc(p.pin)}</code></td>
        <td><b>${esc(p.studentName || st?.fullName || "—")}</b></td>
        <td><span class="pill navy">${esc(p.admissionNumber || "—")}</span></td>
        <td>${p.firstTermAttempts || 0}/3</td><td>${p.secondTermAttempts || 0}/3</td><td>${p.thirdTermAttempts || 0}/3</td>
        <td>${(p.firstTermAttempts || 0) >= 3 ? '<span class="chip gray">Used up</span>' : '<span class="chip green">Valid</span>'}</td>
        <td style="color:var(--color-muted);font-size:.8rem">${p.createdAt ? new Date(p.createdAt.toDate ? p.createdAt.toDate() : p.createdAt).toLocaleDateString("en-GB") : "—"}</td>
        <td><button class="dbtn dbtn-danger" data-del="${esc(p.pin)}"><i class="fa-solid fa-trash"></i></button></td></tr>`;
    }).join("") || '<tr><td colspan="9"><div class="empty-state"><p>No PINs for this class yet.</p></div></td></tr>';
  };

  document.getElementById("pinClass").addEventListener("change", (e) => { currentClass = e.target.value; render(); });

  document.getElementById("pinSearch").addEventListener("input", () => {
    const q = document.getElementById("pinSearch").value.toLowerCase();
    rows.querySelectorAll("tr").forEach((tr) => {
      tr.style.display = !q || tr.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  });

  document.getElementById("genPins").addEventListener("click", () => {
    const students = [];
    queryData(colRef("students")).then((list) => {
      const cls = list.filter((s) => s.classKey === currentClass);
      const m = openModal(`
        <p class="muted">Creating PINs for <b>${cls.length}</b> students in this class. Each will receive a unique 10-digit token.</p>
        <div class="form-field"><label>Quantity per student</label><input id="qtyGlobal" type="number" value="1" min="1" max="5"></div>
        <button class="btn btn-gold btn-block mt-3" id="goGen">Generate</button>`, "Generate Scratch PINs", "fa-ticket");
      document.getElementById("goGen").addEventListener("click", async () => {
        const qty = +document.getElementById("qtyGlobal").value || 1;
        const existing = await queryData(colRef("scratchPins"));
        const used = new Set(existing.map((p) => p.pin));
        let made = 0;
        for (const s of [cls[0]].concat(cls.slice(1))) {
          for (let i = 0; i < qty; i++) {
            let pin = genPin();
            let guard = 0;
            while (used.has(pin) && guard++ < 50) pin = genPin();
            if (used.has(pin)) continue;
            used.add(pin);
            await setDoc(doc(db, "scratchPins", pin), {
              pin, admissionNumber: s.admissionNumber, studentName: s.fullName, className: s.className, classId: s.classKey, studentId: s.id,
              firstTermAttempts: 0, secondTermAttempts: 0, thirdTermAttempts: 0, createdAt: new Date()
            });
            made++;
          }
        }
        toast(`Created ${made} PINs for ${cls.length} students.`, "success", "Scratch Cards Ready");
        m.close(); render();
      });
    });
  });

  document.getElementById("dlCsv").addEventListener("click", () => {
    const filtered = all.filter((p) => p.classId === currentClass);
    const csv = ["PIN,Student,Admission,Class,FirstTermAttempts,SecondTermAttempts,ThirdTermAttempts,Status"].concat(filtered.map((p) => `${p.pin},"${(p.studentName || "").replace(/"/g, '""')}",${p.admissionNumber || ""},${p.className || ""},${p.firstTermAttempts || 0},${p.secondTermAttempts || 0},${p.thirdTermAttempts || 0},${(p.firstTermAttempts || 0) >= 3 ? "USED" : "VALID"}`)).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `scratch-cards-${currentClass}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("CSV downloaded.", "success");
  });

  rows.addEventListener("click", async (e) => {
    const dbx = e.target.closest("[data-del]");
    if (dbx) {
      const pin = dbx.dataset.del;
      const m = openModal(`<p>Delete PIN <code>${pin}</code>? The student can no longer check results with it.</p><button class="btn btn-block mt-3" id="delPin" style="background:var(--color-danger);color:#fff">Delete PIN</button>`, "Delete Scratch Card", "fa-trash");
      document.getElementById("delPin").addEventListener("click", async () => {
        await deleteDoc(doc(db, "scratchPins", pin));
        toast("PIN deleted.", "success"); m.close(); render();
      });
    }
  });

  await render();
}