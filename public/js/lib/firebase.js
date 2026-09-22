/* ==============================================================
 * FIREBASE APP INITIALIZATION (modular SDK v10 via CDN)
 * ============================================================== */
import config from "../firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;