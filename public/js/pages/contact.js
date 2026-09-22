/* ==============================================================
 * CONTACT — stores enquiries into Firestore `contacts`.
 * ============================================================== */
import { colRef, addDoc } from "../lib/db.js";
import { toast } from "../lib/ui.js";

const form = document.getElementById("contactForm");
if (form) form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…';
  try {
    await addDoc(colRef("contacts"), {
      name: form.cname.value.trim(),
      phone: form.cphone.value.trim(),
      email: form.cemail.value.trim(),
      role: form.crole.value,
      message: form.cmsg.value.trim(),
      createdAt: new Date(),
    });
    toast("Thank you! Our admissions team will respond within 24 hours.", "success", "Message Sent");
    form.reset();
  } catch (err) {
    console.error(err);
    toast("Could not send your message right now. Please try again.", "error", "Error");
  }
  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Message';
});