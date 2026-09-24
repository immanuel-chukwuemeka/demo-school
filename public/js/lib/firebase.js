/* ==============================================================
 * FIREBASE APP INITIALIZATION (modular SDK v10 via CDN)
 * Auth uses SESSION persistence (per-tab) so the admin, staff and
 * student dashboards can each run in their own browser tab at the
 * same time, without one shared login bouncing tabs around.
 * ============================================================== */
import config from "../firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(config);
export const auth = getAuth(app);
try {
  await setPersistence(auth, browserSessionPersistence);
} catch (err) {
  console.error("Could not set session persistence (falling back to default):", err);
}
export const db = getFirestore(app);
export default app;