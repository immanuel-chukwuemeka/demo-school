/* ==============================================================
 * AUTH HELPERS — sign in/out, role resolution from custom claims,
 * role guards used by the three dashboards.
 * ============================================================== */
import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDoc, doc } from "./db.js";
import { db } from "./firebase.js";

export const ROLES = { admin: "Admin", staff: "Staff", student: "Student" };

export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signOutClient() {
  return signOut(auth);
}

export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

/** Resolve role from ID-token custom claims (set by the seeding/admin SDK). */
export async function resolveRole(user) {
  if (!user) return null;
  try {
    const idTokenResult = await user.getIdTokenResult();
    return idTokenResult.claims.role || null;
  } catch { return null; }
}

/** Full profile for the dashboards (from Firestore). */
export async function profileOf(user) {
  if (!user) return null;
  let uid;
  try {
    const uSnap = await getDoc(doc(db, "users", user.uid));
    if (uSnap.exists()) {
      const u = uSnap.data();
      uid = u.recordId || u.studentId || u.staffId;
    }
  } catch { /* ignore */ }
  return { uid, email: user.email || "", displayName: user.displayName || "" };
}

/** Guard a dashboard page: redirect to login if not signed in / wrong role. */
export function guardPage(requiredRole, onReady) {
  onAuth(async (user) => {
    const loader = document.getElementById("authGate");
    if (loader) loader.classList.add("hidden");
    const app = document.getElementById("appRoot");
    if (!user) { location.href = "login.html?role=" + requiredRole + "&redirect=" + encodeURIComponent(location.pathname.split("/").pop()); return; }
    const role = await resolveRole(user);
    if (role !== requiredRole) { location.href = "dashboard-" + role + ".html"; return; }
    if (app) app.classList.remove("hidden");
    onReady(user);
  });
}

export async function logout() {
  await signOutClient();
  location.href = "login.html";
}

export const DEMO_CREDENTIALS = {
  admin: { email: "admin@greenwoodacademy.edu.ng", password: "Admin@2026" },
  staff: { email: "staff.principal@greenwoodacademy.edu.ng", password: "Staff@2026" },
  student: { email: "GA20260001@greenwoodacademy.edu.ng", password: "Student@2026" }
};