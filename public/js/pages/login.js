/* ==============================================================
 * LOGIN PAGE — role cards, Firebase Email/Password, redirect by role.
 * ============================================================== */
import { signIn, ROLES, onAuth, resolveRole } from "../lib/auth.js";
import { toast } from "../lib/ui.js";
import { loadSettings } from "../lib/site.js";
import { auth } from "../lib/firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const roleBtns = document.querySelectorAll(".role-card");
let role = new URLSearchParams(location.search).get("role") || "admin";

function setRole(r) {
  role = r;
  roleBtns.forEach((b) => b.classList.toggle("active", b.dataset.role === r));
  document.getElementById("roleName").textContent = ROLES[r];
}

roleBtns.forEach((b) => b.addEventListener("click", () => setRole(b.dataset.role)));
setRole(role);

const form = document.getElementById("loginForm");
const err = document.getElementById("loginError");
const btn = document.getElementById("loginBtn");
const redirect = new URLSearchParams(location.search).get("redirect");

onAuth((user) => {
  if (!user) return;
  resolveRole(user).then((r) => {
    if (r) location.href = redirect && !redirect.includes("login.html") ? redirect : "dashboard-" + r + ".html";
  });
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.style.display = "none";
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in…';
  try {
    const cred = await signInWithEmailAndPassword(auth, document.getElementById("email").value.trim(), document.getElementById("password").value);
    const r = await resolveRole(cred.user);
    toast("Welcome back!", "success", "Signed In");
    location.href = redirect && !redirect.includes("login.html") ? redirect : "dashboard-" + (r || "staff") + ".html";
  } catch (ex) {
    let m = "Could not sign in. Check your credentials and try again.";
    if (ex.code === "auth/user-not-found" || ex.code === "auth/wrong-password" || ex.code === "auth/invalid-credential") m = "Incorrect email or password for the selected role.";
    if (ex.code === "auth/invalid-email") m = "Please enter a valid email address.";
    if (ex.code === "auth/too-many-requests") m = "Too many attempts. Please try again in a few minutes.";
    err.textContent = "⚠ " + m;
    err.style.display = "block";
    console.error(ex);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
  }
});

loadSettings().then((s) => { window.__settings = s; document.title = "Portal Login — " + s.name; document.documentElement.style.display = "block"; });