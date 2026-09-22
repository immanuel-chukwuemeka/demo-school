/* ==============================================================
 * PARENT RESULT CHECKER
 * Validates admission number + scratch card PIN, enforces the
 * 3-attempt rule per term, then renders the published result.
 * ============================================================== */
import { getDoc, doc, updateDoc, colRef, getDocs } from "../lib/db.js";
import { db } from "../lib/firebase.js";
import { renderResultSheet, downloadResultPDF } from "../lib/result-view.js";
import { esc, toast } from "../lib/ui.js";

const admissionEl = document.getElementById("admission");
const pinEl = document.getElementById("pin");
const sessionEl = document.getElementById("rSession");
const termEl = document.getElementById("rTerm");
const btn = document.getElementById("checkBtn");
const msg = document.getElementById("checkMsg");
const area = document.getElementById("resultArea");

const TERM_FIELDS = { First: "firstTermAttempts", Second: "secondTermAttempts", Third: "thirdTermAttempts" };

async function loadSessions() {
  try {
    const snap = await getDocs(colRef("sessions"));
    const sessions = snap.docs.map((d) => d.data());
    const current = (window.__settings && window.__settings.session) || "2026/2027";
    sessionEl.innerHTML = sessions.map((s) => `<option>${esc(s.name)}</option>`).join("") || `<option>${current}</option>`;
  } catch {
    sessionEl.innerHTML = `<option>${(window.__settings && window.__settings.session) || "2026/2027"}</option>`;
  }
}

function sessionKey(session, term) {
  return session.replace(/\//g, "-").toLowerCase() + "_" + term.toLowerCase();
}

async function checkResult() {
  const admission = admissionEl.value.trim();
  const pin = pinEl.value.trim();
  const session = sessionEl.value;
  const term = termEl.value;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying…';
  msg.innerHTML = "";
  area.innerHTML = "";

  try {
    // 1. Read scratch pin (public read by doc id)
    const pinSnap = await getDoc(doc(db, "scratchPins", pin));
    if (!pinSnap.exists()) { throw new Error("PIN_NOT_FOUND"); }
    const pinData = pinSnap.data();
    if (pinData.isActive === false) { throw new Error("PIN_DISABLED"); }
    if (pinData.admissionNumber && pinData.admissionNumber.toUpperCase() !== admission.toUpperCase()) {
      throw new Error("PIN_MISMATCH");
    }

    // 2. Enforce attempt limit
    const attemptsField = TERM_FIELDS[term];
    const attempts = Number(pinData[attemptsField] || 0);
    if (attempts >= 3) {
      msg.innerHTML = '<div class="card" style="background:#FEE2E2;border-color:var(--color-danger);text-align:center"><b style="color:var(--color-danger)">Maximum trial exceeded.</b><p style="color:var(--color-muted);font-size:.88rem;margin-top:6px">This PIN has used all 3 attempts for the <b>' + term + '</b> term. Please contact the school office to reset your scratch card for next term.</p></div>';
      toast("Maximum trial exceeded", "error", "Try Limit Reached");
      return;
    }

    // 3. Consume one attempt (bump the counter)
    const increment = {};
    increment[attemptsField] = attempts + 1;
    try { await updateDoc(doc(db, "scratchPins", pin), increment); } catch (e) { toast("Note: results are still loading.", "info"); }

    // 4. Fetch the published result
    const key = sessionKey(session, term);
    const classId = pinData.classId;
    const studentId = pinData.studentId;
    const resultSnap = await getDoc(doc(db, "results", key, classId, studentId));
    if (!resultSnap.exists()) { throw new Error("NOT_PUBLISHED"); }
    const r = { id: resultSnap.id, ...resultSnap.data() };
    if (!r.published) { throw new Error("NOT_PUBLISHED"); }

    const settings = window.__settings || {};
    area.innerHTML = renderResultSheet(r, settings) +
      `<div class="print-actions mt-4 no-print">
        <button class="btn btn-navy" id="dlPdf"><i class="fa-solid fa-file-pdf"></i> Download PDF</button>
        <button class="btn btn-outline" onclick="window.print()"><i class="fa-solid fa-print"></i> Print</button>
      </div>`;
    document.getElementById("dlPdf").addEventListener("click", () => downloadResultPDF(r));
    if (attempts === 0) toast("Result loaded. This was your first attempt for this term.", "success", "Success");
    else toast("Result loaded. Attempt " + (attempts + 1) + " of 3 for this term.", "info");
  } catch (err) {
    const messages = {
      PIN_NOT_FOUND: "Invalid PIN. Please check the card and try again.",
      PIN_DISABLED: "This PIN has been disabled. Contact the school office.",
      PIN_MISMATCH: "This PIN does not belong to the admission number entered.",
      NOT_PUBLISHED: "The result for this session/term has not been published yet. Kindly check back later."
    };
    msg.innerHTML = '<div class="card" style="background:#FEE2E2;border-color:var(--color-danger);text-align:center"><b style="color:var(--color-danger)"><i class="fa-solid fa-circle-xmark"></i> Unable to load result</b><p style="color:var(--color-muted);font-size:.88rem;margin-top:6px">' + (messages[err.message] || "An unexpected error occurred. Please try again.") + '</p></div>';
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-file-circle-check"></i> Check Result';
  }
}

btn.addEventListener("click", checkResult);
[admissionEl, pinEl, termEl].forEach((el) => el && el.addEventListener("keydown", (e) => { if (e.key === "Enter") checkResult(); }));
loadSessions();