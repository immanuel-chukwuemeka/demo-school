/* ==============================================================
 * FIREBASE WEB CONFIGURATION (client side)
 * --------------------------------------------------------------
 * These values are PUBLIC. Firebase enforces security through
 * its Security Rules and Authentication, NOT by hiding this JSON.
 * The SERVICE ACCOUNT is never included in this file — it lives
 * only in /server/serviceAccountKey.json (git-ignored) and is used
 * exclusively by server-side seeding/admin scripts.
 *
 * Copy values from your /.env into this object if you regenerate.
 * ============================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyBu9sURx8kXQUJQ-ghsiUf0m8QCp8EGTxE",
  authDomain: "school-demo-58461.firebaseapp.com",
  projectId: "school-demo-58461",
  storageBucket: "school-demo-58461.appspot.com",
  messagingSenderId: "248231556093",
  appId: "1:248231556093:web:ef764182a7e0a06b931f94"
};

export default firebaseConfig;