/* ==============================================================
 * ADMIN — Site Settings. Persists to `settings/main` which
 * loadSettings() reads globally (name, session, term, grading…).
 * ============================================================== */
import { doc, setDoc } from "../../lib/db.js";
import { db } from "../../lib/firebase.js";
import { toast } from "../../lib/ui.js";
import { viewTitle } from "./shell.js";
import { DEFAULT_SETTINGS, loadSettings } from "../../lib/site.js";

export default async function settings() {
  const host = document.getElementById("viewRoot");
  const s = await loadSettings(true);
  host.innerHTML = `${viewTitle("School Settings", "These values drive every page, result sheet and the prospectus.", `
      <button class="dbtn dbtn-navy" id="saveSet"><i class="fa-solid fa-floppy-disk"></i> Save Settings</button>
      <button class="dbtn dbtn-soft" id="resetSet"><i class="fa-solid fa-rotate-left"></i> Reset</button>`)}
    <form id="settingsForm" class="settings-grid">
      <div class="dash-card"><div class="dc-body">
        <h4 style="color:var(--color-primary-dark);margin-bottom:12px"><i class="fa-solid fa-school"></i> Identity</h4>
        <div class="form-grid">
          <div class="form-field"><label>School Name</label><input name="name" value="${s.name}" required></div>
          <div class="form-field"><label>Short Name</label><input name="shortName" value="${s.shortName}"></div>
          <div class="form-field" style="grid-column:1/-1"><label>Motto</label><input name="motto" value="${s.motto}"></div>
          <div class="form-field" style="grid-column:1/-1"><label>Address</label><input name="address" value="${s.address}"></div>
          <div class="form-field"><label>Email</label><input name="email" value="${s.email}"></div>
          <div class="form-field"><label>Admissions Email</label><input name="admissionsEmail" value="${s.admissionsEmail}"></div>
          <div class="form-field"><label>Phone</label><input name="phone" value="${s.phone}"></div>
          <div class="form-field"><label>Phone 2</label><input name="phone2" value="${s.phone2}"></div>
          <div class="form-field"><label>WhatsApp</label><input name="whatsapp" value="${s.whatsapp}"></div>
          <div class="form-field"><label>Domain</label><input name="domain" value="${s.domain}"></div>
          <div class="form-field"><label>Principal Name</label><input name="principalName" value="${s.principalName || ""}"></div>
          <div class="form-field"><label>Founded</label><input name="founded" value="${s.founded}"></div>
        </div>
      </div></div>
      <div class="dash-card"><div class="dc-body">
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px">
          <div>
            <h4 style="color:var(--color-primary-dark);margin-bottom:12px"><i class="fa-solid fa-calendar"></i> Session & Term</h4>
            <div class="form-field"><label>Session (e.g. 2026/2027)</label><input name="session" value="${s.session}"></div>
            <div class="form-field"><label>Session Key</label><input name="sessionKey" value="${s.sessionKey || ""}" placeholder="e.g. 2026-2027_first"></div>
            <div class="form-field"><label>Current Term</label><select name="term"><option ${s.term === "First" ? "selected" : ""}>First</option><option ${s.term === "Second" ? "selected" : ""}>Second</option><option ${s.term === "Third" ? "selected" : ""}>Third</option></select></div>
            <div class="form-field"><label>Next Term Begins</label><input name="nextTermDate" type="date" value="${s.nextTermDate || ""}"></div>
          </div>
          <div>
            <h4 style="color:var(--color-primary-dark);margin-bottom:12px"><i class="fa-solid fa-flag"></i> Maximum Marks</h4>
            <div class="form-field"><label>CA1</label><input name="ca1Max" type="number" value="${s.ca1Max}"></div>
            <div class="form-field"><label>CA2</label><input name="ca2Max" type="number" value="${s.ca2Max}"></div>
            <div class="form-field"><label>Exam</label><input name="examMax" type="number" value="${s.examMax}"></div>
            <h4 style="color:var(--color-primary-dark);margin:12px 0 8px"><i class="fa-solid fa-chart-simple"></i> Grading</h4>
            ${["A", "B", "C", "D", "E", "F"].map((g) => `<div class="grading-inline"><b>${g}</b><input name="g-min-${g}" placeholder="min" type="number" value="${s.grading?.[g]?.min ?? 0}"><input name="g-rem-${g}" placeholder="remark" value="${s.grading?.[g]?.remark || ""}"></div>`).join("")}
          </div>
        </div>
      </div></div>
      <div class="dash-card"><div class="dc-body">
        <h4 style="color:var(--color-primary-dark);margin-bottom:12px"><i class="fa-solid fa-share-nodes"></i> Socials & Footer</h4>
        <div class="form-grid">
          <div class="form-field"><label>Facebook</label><input name="facebook" value="${s.facebook}"></div>
          <div class="form-field"><label>Twitter / X</label><input name="twitter" value="${s.twitter}"></div>
          <div class="form-field"><label>Instagram</label><input name="instagram" value="${s.instagram}"></div>
          <div class="form-field"><label>YouTube</label><input name="youtube" value="${s.youtube}"></div>
          <div class="form-field" style="grid-column:1/-1"><label>Newsletter Text</label><input name="newsletterText" value="${s.newsletterText}"></div>
        </div>
      </div></div>
    </form>`;

  document.getElementById("settingsForm").addEventListener("submit", (e) => e.preventDefault());

  document.getElementById("saveSet").addEventListener("click", async () => {
    const form = document.getElementById("settingsForm");
    const data = { ...DEFAULT_SETTINGS };
    form.querySelectorAll("[name]").forEach((inp) => {
      const n = inp.name;
      if (n.startsWith("g-min-") || n.startsWith("g-rem-")) return;
      data[n] = inp.type === "number" ? +inp.value : inp.value.trim();
    });
    const grading = {};
    ["A", "B", "C", "D", "E", "F"].forEach((g) => {
      grading[g] = { min: +(form.querySelector(`[name="g-min-${g}"]`).value || 0), remark: form.querySelector(`[name="g-rem-${g}"]`).value.trim() };
    });
    data.grading = grading;
    if (!data.sessionKey) data.sessionKey = (data.session || "2026/2027").replace(/\//g, "-").toLowerCase() + "_" + data.term.toLowerCase().replace(/\s+/g, "");
    await setDoc(doc(db, "settings", "main"), data);
    await loadSettings(true);
    window.__settings = await loadSettings();
    toast("Settings saved globally.", "success", "Saved");
  });

  document.getElementById("resetSet").addEventListener("click", async () => {
    await setDoc(doc(db, "settings", "main"), { ...DEFAULT_SETTINGS, sessionKey: "2026-2027_first", term: "First", session: "2026/2027", principalName: "Mrs. Ngozi Adeyemi", nextTermDate: "2026-10-05" });
    toast("Settings reset to defaults.", "info");
    location.reload();
  });
}