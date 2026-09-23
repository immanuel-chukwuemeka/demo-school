/* ==============================================================
 * SCHOOL IDENTITY & GLOBAL SETTINGS
 * Defaults shown instantly; replaced by Firestore `settings`
 * once it loads so the site works offline too.
 * ============================================================== */
import { getData } from "./db.js";

export const DEFAULT_SETTINGS = {
  name: "Greenwood Academy International",
  shortName: "GA",
  motto: "Knowledge, Character, Excellence",
  vision: "To be a centre of academic and moral excellence, raising global leaders grounded in integrity.",
  mission: "To provide world-class education that nurtures creativity, discipline and character in every child.",
  address: "15 Cedar Avenue, Ikeja GRA, Lagos, Nigeria",
  email: "info@greenwoodacademy.edu.ng",
  admissionsEmail: "admissions@greenwoodacademy.edu.ng",
  phone: "+234 801 234 5678",
  phone2: "+234 802 345 6789",
  whatsapp: "+234 803 456 7890",
  domain: "www.greenwoodacademy.edu.ng",
  founded: "2008",
  session: "2026/2027",
  term: "First",
  sessionKey: "2026-2027_first",
  nextTermDate: "2026-10-05",
  principalName: "Mrs. Ngozi Adeyemi",
  ca1Max: 20,
  ca2Max: 20,
  examMax: 60,
  grading: {
    A: { min: 70, remark: "Excellent" },
    B: { min: 60, remark: "Very Good" },
    C: { min: 50, remark: "Good" },
    D: { min: 45, remark: "Fair" },
    E: { min: 40, remark: "Poor" },
    F: { min: 0, remark: "Fail" }
  },
  facebook: "https://facebook.com/greenwoodacademyng",
  twitter: "https://x.com/greenwoodacadng",
  instagram: "https://instagram.com/greenwoodacademyng",
  youtube: "https://youtube.com/@greenwoodacademy",
  newsletterText: "Subscribe for admissions news, term dates and school updates."
};

let cached = null;
const KEY = "GA_SETTINGS_V1";

/** Load settings (cache in localStorage so pages render instantly). */
export async function loadSettings(force = false) {
  if (cached && !force) return cached;
  try {
    const local = localStorage.getItem(KEY);
    if (local && !force) cached = { ...DEFAULT_SETTINGS, ...JSON.parse(local) };
    const remote = await getData("settings", "main");
    if (remote) cached = { ...DEFAULT_SETTINGS, ...remote };
    if (!cached) cached = DEFAULT_SETTINGS;
    localStorage.setItem(KEY, JSON.stringify(cached));
  } catch {
    if (!cached) cached = DEFAULT_SETTINGS;
  }
  return cached;
}

export function settingsSync() { return cached || DEFAULT_SETTINGS; }

export const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");