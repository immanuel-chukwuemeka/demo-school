#!/usr/bin/env node
/* ==============================================================
 * GREENWOOD ACADEMY — Full seeding script.
 *   node seed.js            → Firestore + Auth users
 *   node seed.js --no-auth  → Firestore only
 *
 * Requires server/serviceAccountKey.json (admin SDK service key).
 * Uses deterministic RNG so results are reproducible.
 * ============================================================== */
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const NO_AUTH = process.argv.includes("--no-auth");

const KEY = path.join(__dirname, "serviceAccountKey.json");
const sa = require(KEY);

admin.initializeApp({ credential: admin.credential.cert(sa), storageBucket: sa.project_id + ".appspot.com" });
const db = admin.firestore();
const auth = admin.auth();

/* ---------- deterministic RNG ---------- */
let _seed = 20260824;
const rand = () => { _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 4294967296; };
const irand = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

/* ---------- helpers ---------- */
async function batchWrite(items, size = 400) {
  for (let i = 0; i < items.length; i += size) {
    const b = db.batch();
    for (const { ref, data } of items.slice(i, i + size)) b.set(ref, data);
    await b.commit();
  }
}

const SESSION = { key: "2026-2027_first", session: "2026/2027", term: "First" };

const FIRST_NAMES = ["Ada", "Chidi", "Emeka", "Ngozi", "Tunde", "Yemi", "Aisha", "Kehinde", "Obinna", "Zainab", "Ibrahim", "Kemi", "Uche", "Tolu", "Amina", "Chiamaka", "Femi", "Halima", "Ikenna", "Josiah", "Linda", "Musa", "Nneka", "Ogochukwu", "Peter", "Rahmat", "Sade", "Tobi", "Umar", "Vivian", "Wale", "Yusuf", "Adaeze", "Bola", "Chinonso", "Damilola", "Ebele", "Fatima", "Goke", "Hannah", "Ifeanyi", "Jumoke", "Kunle", "Lola", "Maryam", "Ngozi", "Olu", "Precious", "Qudus", "Ruth", "Samuel", "Tina", "Uche", "Victor", "Winnie", "Yakubu", "Zara", "Adebayo", "Blessing", "Chika"];
const LAST_NAMES = ["Adebayo", "Okafor", "Okonkwo", "Balogun", "Oyelaran", "Muhammed", "Uzoma", "Eze", "Johnson", "Ibrahim", "Afolabi", "Nwosu", "Lawal", "Adeyemi", "Obasi", "Chukwu", "Bello", "Agboola", "Okeke", "Idowu", "Onwu", "Yusuf", "Adeleke", "Igwe", "Danjuma", "Emeka", "Fasanya", "Obi", "Salami", "Umeh", "Akinwande", "Nnamdi", "Adebanjo", "Osagie", "Ezeani", "Funmilayo", "Kalu", "Moses", "Okafor", "Ajayi"];
const HOUSES = ["Red House", "Blue House", "Gold House", "Green House"];
const GENDERS = ["Male", "Female"];
const ARMS = ["A", "B", "C"];
const SOCIALS = { facebook: "https://facebook.com/greenwoodacademyng", twitter: "https://x.com/greenwoodacadng", instagram: "https://instagram.com/greenwoodacademyng", youtube: "https://youtube.com/@greenwoodacademy" };

/* ---------- subjects ---------- */
const SUBJECTS = [
  ["math", "Mathematics", "MTH"], ["eng", "English Language", "ENG"],
  ["phy", "Physics", "PHY"], ["chm", "Chemistry", "CHM"], ["bio", "Biology", "BIO"],
  ["eco", "Economics", "ECN"], ["com", "Commerce", "COM"], ["gov", "Government", "GOV"],
  ["lit", "Literature in English", "LIT"], ["csc", "Computer Studies", "CSC"],
  ["agr", "Agricultural Science", "AGR"], ["civ", "Civic Education", "CIV"],
  ["rel", "Religious Studies", "CRS"], ["sos", "Social Studies", "SOS"],
  ["bsc", "Basic Science", "BSC"], ["pe", "Physical & Health Education", "PE"],
  ["p_math", "Mathematics", "PMT"], ["p_eng", "English Studies", "PEN"],
  ["p_bsc", "Basic Science", "PBS"], ["p_sos", "Social Studies", "PSS"],
  ["p_civ", "Civic Education", "PCV"], ["p_crt", "Cultural & Creative Arts", "PCC"],
  ["p_pe", "Physical & Health Education", "PPE"], ["p_com", "Computer Studies", "PCM"],
  ["p_rel", "Religious Studies", "PRS"], ["ns_dis", "Discovery & Nature", "NSD"],
  ["ns_let", "Letters & Sounds", "NSL"], ["ns_play", "Creative Play", "NSP"],
  ["ns_motor", "Motor Skills", "NSM"], ["ns_rhym", "Rhymes & Movement", "NSR"]
];
const SUBJ_LOOKUP = Object.fromEntries(SUBJECTS.map(([id, name, code]) => [id, { id, name, code, caMax: 20, ca2Max: 20, examMax: 60 }]));

/* ---------- class buckets ---------- */
const CLASSES = [
  { classKey: "creche1", className: "Creche 1", level: "Creche", arms: ["A", "B"], size: 25, subs: ["ns_dis", "ns_let", "ns_play", "ns_motor", "ns_rhym"] },
  { classKey: "creche2", className: "Creche 2", level: "Creche", arms: ["A", "B"], size: 25, subs: ["ns_dis", "ns_let", "ns_play", "ns_motor", "ns_rhym"] },
  { classKey: "nursery1", className: "Nursery 1", level: "Nursery", arms: ["A", "B"], size: 25, subs: ["p_eng", "p_math", "ns_play", "ns_let", "ns_rhym"] },
  { classKey: "nursery2", className: "Nursery 2", level: "Nursery", arms: ["A", "B"], size: 25, subs: ["p_eng", "p_math", "ns_play", "ns_let", "ns_rhym"] },
  { classKey: "p1", className: "Primary 1", level: "Primary", arms: ["A", "B", "C"], size: 10, subs: ["p_math", "p_eng", "p_bsc", "p_sos", "p_civ", "p_crt", "p_pe", "p_com", "p_rel"] },
  { classKey: "p2", className: "Primary 2", level: "Primary", arms: ["A", "B", "C"], size: 10, subs: ["p_math", "p_eng", "p_bsc", "p_sos", "p_civ", "p_crt", "p_pe", "p_com", "p_rel"] },
  { classKey: "p3", className: "Primary 3", level: "Primary", arms: ["A", "B", "C"], size: 10, subs: ["p_math", "p_eng", "p_bsc", "p_sos", "p_civ", "p_crt", "p_pe", "p_com", "p_rel"] },
  { classKey: "p4", className: "Primary 4", level: "Primary", arms: ["A", "B", "C"], size: 10, subs: ["p_math", "p_eng", "p_bsc", "p_sos", "p_civ", "p_crt", "p_pe", "p_com", "p_rel"] },
  { classKey: "p5", className: "Primary 5", level: "Primary", arms: ["A", "B", "C"], size: 10, subs: ["p_math", "p_eng", "p_bsc", "p_sos", "p_civ", "p_crt", "p_pe", "p_com", "p_rel"] },
  { classKey: "p6", className: "Primary 6", level: "Primary", arms: ["A", "B", "C"], size: 10, subs: ["p_math", "p_eng", "p_bsc", "p_sos", "p_civ", "p_crt", "p_pe", "p_com", "p_rel"] },
  { classKey: "jss1", className: "JSS1", level: "Secondary", arms: ["A", "B", "C"], size: 9, subs: ["math", "eng", "bsc", "sos", "csc", "civ", "rel", "pe", "agr"] },
  { classKey: "jss2", className: "JSS2", level: "Secondary", arms: ["A", "B", "C"], size: 8, subs: ["math", "eng", "bsc", "sos", "csc", "civ", "rel", "pe", "agr"] },
  { classKey: "jss3", className: "JSS3", level: "Secondary", arms: ["A", "B", "C"], size: 8, subs: ["math", "eng", "bsc", "sos", "csc", "civ", "rel", "pe", "agr"] },
  { classKey: "ss1", className: "SS1", level: "Secondary", arms: ["A", "B", "C"], size: 8, subs: ["math", "eng", "phy", "chm", "bio", "eco", "gov", "lit", "csc", "civ"] },
  { classKey: "ss2", className: "SS2", level: "Secondary", arms: ["A", "B", "C"], size: 9, subs: ["math", "eng", "phy", "chm", "bio", "eco", "com", "lit", "csc", "civ"] },
  { classKey: "ss3", className: "SS3", level: "Secondary", arms: ["A", "B", "C"], size: 8, subs: ["math", "eng", "phy", "chm", "bio", "eco", "gov", "lit", "csc", "civ"] }
];

/* ---------- fees (per classKey) ---------- */
const FEES = {
  creche1: { tuition: 420000 }, creche2: { tuition: 440000 },
  nursery1: { tuition: 480000 }, nursery2: { tuition: 495000 },
  p1: { tuition: 520000 }, p2: { tuition: 540000 }, p3: { tuition: 555000 },
  p4: { tuition: 570000 }, p5: { tuition: 580000 }, p6: { tuition: 595000 },
  jss1: { tuition: 650000 }, jss2: { tuition: 670000 }, jss3: { tuition: 685000 },
  ss1: { tuition: 720000 }, ss2: { tuition: 740000 }, ss3: { tuition: 760000 }
};
const FEE_KEYS = ["tuition", "uniform", "books", "pta", "development", "toiletries", "sports", "ict", "transport", "other"];
const feeDoc = (c) => {
  const base = FEES[c.classKey].tuition;
  const data = { ...FEES[c.classKey] };
  data.uniform = Math.round(base * 0.06); data.books = Math.round(base * 0.05);
  data.pta = 25000; data.development = Math.round(base * 0.08); data.toiletries = 15000;
  data.sports = 20000; data.ict = Math.round(base * 0.03); data.transport = 50000;
  data.other = 10000;
  data.className = c.className; data.classKey = c.classKey; data.levelName = c.level;
  data.total = FEE_KEYS.reduce((s, k) => s + data[k], 0);
  data.session = SESSION.session;
  return data;
};

/* ---------- prospectus sections per level ---------- */
const prospectusFor = (c) => {
  const sec = (label) => (["#1 " + label + " — " + c.className, "All items labelled clearly with name and class", "Arrive with a comfortable change of clothes"].filter(Boolean));
  const books = c.level === "Secondary" ? ["Textbooks per subject per the school curriculum list", "5 exercise books, 2 notebooks", "Jotter + school diary"] : c.level === "Primary" ? ["3 exercise books", "Phonics reader", "School diary"] : ["2 wipe-clean activity books", "Picture dictionary", "School diary"];
  return {
    classKey: c.classKey, className: c.className, level: c.level,
    description: `Starting ${c.className} at Greenwood Academy means joining a warm, structured and joyful learning community. This is your complete checklist to be ready on day one.`,
    textbooks: books,
    exerciseBooks: ["4 soft-cover exercise books (ruled)", "1 squared paper book (math)", "1 blank sketchbook", "2 notebooks (jotters)"],
    uniforms: c.level === "Secondary" ? ["School blazer + grey trousers/skirt", "2 white shirts", "School tie + ID card", "Clean white trainers"] : ["2 blue-and-white school uniforms", "1 tracksuit (PE days)", "Comfortable closed shoes", "School cap"],
    stationery: ["HB pencils + eraser + sharpener", "Crayons/markers", "Ruler and geometry set", "Water bottle + lunch box"],
    materials: ["Hand sanitiser + wet wipes", "Hand towel + napkin", "Spare clothes bag (early years)", "School bag (labelled)"],
    resumptionItems: ["3 passport photographs", "Photocopy of birth certificate", "Medical/immunisation record", "Completed health form"],
    rules: ["Arrival by 7:45am; assembly at 8:00am sharp", "Homework completed and signed daily", "Phone use strictly during breaks in designated areas", "Respect, kindness and honesty at all times"],
    recommended: ["One good storybook", "Painting overalls/smock", "Library card", "Termly planner"]
  };
};

/* ---------- positions ---------- */
function standings(totals) {
  const sorted = [...totals].sort((a, b) => b - a);
  const posOf = {};
  let lastScore = -1, lastPos = 1;
  sorted.forEach((t, i) => {
    if (t < lastScore) lastPos = i + 1;
    if (!(t in posOf)) posOf[t] = lastPos;
    lastScore = t;
  });
  return (t) => posOf[t];
}

const gradeRemark = { A: "Excellent", B: "Very Good", C: "Good", D: "Fair", E: "Poor", F: "Fail" };
const gradeOf = (m) => (m >= 70 ? "A" : m >= 60 ? "B" : m >= 50 ? "C" : m >= 45 ? "D" : m >= 40 ? "E" : "F");

function buildResult(student, scoreDoc) {
  const rows = Object.keys(scoreDoc.subjects).map((sid) => {
    const s = SUBJ_LOOKUP[sid];
    const sc = scoreDoc.subjects[sid];
    const total = (sc.ca1 || 0) + (sc.ca2 || 0) + (sc.exam || 0);
    const g = gradeOf(total);
    return { name: s.name, ca1: sc.ca1, ca2: sc.ca2, exam: sc.exam, total, grade: g, remark: gradeRemark[g] };
  });
  const total = rows.reduce((a, r) => a + r.total, 0);
  const average = +(total / rows.length).toFixed(2);
  return {
    studentId: student.id, name: student.fullName, admission: student.admissionNumber,
    className: student.className, arm: student.arm, classSize: student.classSize,
    gender: student.gender, house: student.house, passport: student.passport,
    session: SESSION.session, sessionKey: SESSION.key, term: SESSION.term,
    subjects: rows, total, maxTotal: rows.length * 100, average, grade: gradeOf(average),
    remark: gradeRemark[gradeOf(average)],
    subjectComments: rows.map((r) => `${r.name}: ${r.remark}`).join(". "),
    formTeacherRemark: student.formRemark,
    principalRemark: "A promising term. Keep striving for excellence.",
    present: student.present, absent: student.absent, daysOpen: 90,
    nextTermDate: "2026-10-05", published: true, locked: true,
    classId: student.classKey, updatedAt: new Date()
  };
}

/* ============================================================== */
async function main() {
  const AUTH_ONLY = process.argv.includes("--auth-only");
  if (AUTH_ONLY) {
    console.log("🌱 Auth-only run — linking existing Firestore records to Firebase Auth accounts.");
    await createAuthUsers();
    console.log("\n✅ AUTH STEP COMPLETE.");
    process.exit(0);
  }

  console.log("🌱 Seeding Greenwood Academy …");

  /* ---- settings, sessions, terms, grading, schools ---- */
  const settings = {
    name: "Greenwood Academy", shortName: "GA", motto: "Knowledge, Character, Excellence",
    vision: "To be a centre of academic and moral excellence, raising global leaders grounded in integrity.",
    mission: "To provide world-class education that nurtures creativity, discipline and character in every child.",
    address: "15 Cedar Avenue, Ikeja GRA, Lagos, Nigeria",
    email: "info@greenwoodacademy.edu.ng", admissionsEmail: "admissions@greenwoodacademy.edu.ng",
    phone: "+234 801 234 5678", phone2: "+234 802 345 6789", whatsapp: "+234 803 456 7890",
    domain: "www.greenwoodacademy.edu.ng", founded: "2008",
    session: SESSION.session, sessionKey: SESSION.key, term: SESSION.term,
    ca1Max: 20, ca2Max: 20, examMax: 60,
    grading: { A: { min: 70, remark: "Excellent" }, B: { min: 60, remark: "Very Good" }, C: { min: 50, remark: "Good" }, D: { min: 45, remark: "Fair" }, E: { min: 40, remark: "Poor" }, F: { min: 0, remark: "Fail" } },
    principalName: "Mrs. Ngozi Adeyemi", nextTermDate: "2026-10-05", ...SOCIALS,
    newsletterText: "Subscribe for admissions news, term dates and school updates."
  };
  await db.collection("settings").doc("main").set(settings);
  await db.collection("sessions").doc("2026-2027").set({
    name: "2026/2027", firstTerm: { start: new Date("2026-09-08"), end: new Date("2026-12-18"), resumption: new Date("2026-10-05") },
    secondTerm: { start: new Date("2027-01-05"), end: new Date("2027-04-02") },
    thirdTerm: { start: new Date("2027-04-20"), end: new Date("2027-07-23") }
  });
  await db.collection("terms").doc("first").set({ name: "First", order: 1 });
  await db.collection("terms").doc("second").set({ name: "Second", order: 2 });
  await db.collection("terms").doc("third").set({ name: "Third", order: 3 });
  await db.collection("grading").doc("A").set({ min: 70, remark: "Excellent" });
  await db.collection("grading").doc("B").set({ min: 60, remark: "Very Good" });
  await db.collection("grading").doc("C").set({ min: 50, remark: "Good" });
  await db.collection("grading").doc("D").set({ min: 45, remark: "Fair" });
  await db.collection("grading").doc("E").set({ min: 40, remark: "Poor" });
  await db.collection("grading").doc("F").set({ min: 0, remark: "Fail" });
  await db.collection("schools").doc("greenwood").set({
    name: "Greenwood Academy", slug: "greenwood", motto: settings.motto, address: settings.address, phone: settings.phone, email: settings.email, type: "Private Co-educational Day School", levels: ["Creche", "Nursery", "Primary", "Secondary"]
  });
  console.log("  ✔ settings / sessions / terms / grading / schools");

  /* ---- classes, subjects, departments ---- */
  const classDocs = CLASSES.map((c) => ({ ref: db.collection("classes").doc(c.classKey), data: c }));
  const subjectWrites = SUBJECTS.map(([id, name, code]) => ({ ref: db.collection("subjects").doc(id), data: { id, name, code, level: /^p_|^ns_/.test(id) ? "Primary" : "Secondary", caMax: 20, examMax: 60, description: name } }));
  await batchWrite(classDocs.concat(subjectWrites));
  console.log("  ✔ classes (" + CLASSES.length + ") + subjects (" + SUBJECTS.length + ")");

  const DEPARTMENTS = [
    { name: "Early Years", head: "Mrs. Funke Aderinto" }, { name: "Primary School", head: "Mr. Tunde Ogundipe" },
    { name: "Secondary School", head: "Mr. Chukwuma Obi" }, { name: "Science", head: "Mrs. Amina Bello" },
    { name: "Arts & Humanities", head: "Mrs. Ngozi Ezeani" }, { name: "Commercial", head: "Mr. Ibrahim Yusuf" },
    { name: "Languages", head: "Mrs. Lara Adekunle" }, { name: "ICT & Innovation", head: "Mr. Edwin Nwosu" },
    { name: "Administration", head: "Mrs. Ronke Adeyemi" }, { name: "Finance", head: "Mr. Samuel Eze" },
    { name: "Health & Sports", head: "Mr. Victor Mba" }, { name: "Non-Teaching", head: "Mrs. Bisola Ajayi" }
  ];
  await batchWrite(DEPARTMENTS.map((d) => ({ ref: db.collection("departments").doc(d.name.toLowerCase().replace(/\s+/g, "")), data: d })));
  console.log("  ✔ departments (" + DEPARTMENTS.length + ")");

  /* ---- fees + requirements + prospectus ---- */
  const feeWrites = [];
  const reqWrites = [];
  for (const c of CLASSES) {
    const f = feeDoc(c);
    feeWrites.push({ ref: db.collection("fees").doc(c.classKey), data: f });
    reqWrites.push({ ref: db.collection("requirements").doc(c.classKey), data: f });
  }
  await batchWrite(feeWrites); await batchWrite(reqWrites);
  const prosWrites = CLASSES.map((c) => ({ ref: db.collection("prospectus").doc(c.classKey), data: { ...prospectusFor(c), lastUpdated: new Date() } }));
  await batchWrite(prosWrites);
  console.log("  ✔ fees + requirements + prospectus (" + CLASSES.length + " classes)");

  /* ---- staff (30) + teacher assignments ---- */
  const TEACHING_ROLES = {
    "Mrs. Funke Aderinto": ["Early Years", "Head, Early Years"], "Mr. Tunde Ogundipe": ["Primary School", "Head of Primary"],
    "Mr. Chukwuma Obi": ["Secondary School", "Vice Principal"], "Mrs. Amina Bello": ["Science", "Senior Teacher"],
    "Mrs. Ngozi Ezeani": ["Arts & Humanities", "Senior Teacher"], "Mr. Ibrahim Yusuf": ["Commercial", "Senior Teacher"],
    "Mrs. Lara Adekunle": ["Languages", "English Teacher"], "Mr. Edwin Nwosu": ["ICT & Innovation", "ICT Teacher"],
    "Mrs. Kemi Oyelaran": ["Early Years", "Creche Coordinator"], "Mr. Victor Mba": ["Health & Sports", "PE Teacher"],
    "Mrs. Ada Okafor": ["Languages", "Literacy Teacher"], "Mr. Tobi Alabi": ["Science", "Maths Teacher"],
    "Mrs. Chinwe Eze": ["Science", "Biology Teacher"], "Mr. Emeka Nwankwo": ["Science", "Chemistry Teacher"],
    "Mrs. Halima Danladi": ["Arts & Humanities", "Literature Teacher"], "Mr. Femi Adekoya": ["Commercial", "Commerce Teacher"],
    "Mrs. Zainab Sani": ["Arts & Humanities", "Civic Teacher"], "Mr. Kunle Ojo": ["ICT & Innovation", "Computer Teacher"]
  };
  const ADMIN_STAFF = [
    ["Mrs. Ronke Adeyemi", "Administration", "School Administrator"], ["Mr. Samuel Eze", "Finance", "Bursar"],
    ["Mrs. Bisola Ajayi", "Non-Teaching", "School Nurse"], ["Mr. Daniel Okoro", "Administration", "Registrar"],
    ["Mrs. Ify Orji", "Administration", "Front Desk Officer"], ["Mr. Collins Mbanefo", "Non-Teaching", "Operations Manager"],
    ["Mrs. Grace Omoniyi", "Non-Teaching", "Librarian"], ["Mr. Peter Afolayan", "Non-Teaching", "Lab Technician"],
    ["Mrs. Ruth Abiola", "Non-Teaching", "Counsellor"], ["Mr. Michael Chima", "Non-Teaching", "IT Support"],
    ["Mrs. Folake Adebiyi", "Finance", "Accountant"], ["Mr. Joseph Emeka", "Non-Teaching", "Security Coordinator"]
  ];

  const staffWrites = [];
  const staffAuth = [];
  let staffSeq = 0;
  const TEACHING = Object.entries(TEACHING_ROLES);
  const allStaff = TEACHING.map(([name, [dept, role]]) => ({ name, dept, role, teaching: true }))
    .concat(ADMIN_STAFF.map(([name, dept, role]) => ({ name, dept, role, teaching: false })));

  for (const s of allStaff) {
    staffSeq++;
    const slug = s.name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "") || "staff" + staffSeq;
    const email = `staff.${slug}@greenwoodacademy.edu.ng`;
    const formTeacher = ["Mrs. Funke Aderinto", "Mrs. Kemi Oyelaran", "Mrs. Amina Bello", "Mr. Tunde Ogundipe", "Mr. Chukwuma Obi", "Mr. Victor Mba", "Mrs. Ada Okafor", "Mr. Femi Adekoya"].includes(s.name);
    staffWrites.push({
      ref: db.collection("staff").doc("st" + String(staffSeq).padStart(3, "0")),
      data: {
        fullName: s.name, staffId: "GAE-ST" + String(staffSeq).padStart(3, "0"), email, phone: "+234 80" + (10000000 + staffSeq * 1379).toString().slice(0, 8),
        type: s.teaching ? "Teaching" : "Non-Teaching", department: s.dept, role: s.role,
        formTeacher: formTeacher ? "Yes" : "No", passport: "assets/images/staff/staff-" + String((staffSeq % 6) + 1) + ".jpg",
        userId: "", sessionTerm: `${SESSION.session} | ${SESSION.term}`, createdAt: new Date()
      }
    });
    staffAuth.push({ email, password: "Staff@2026", idx: staffSeq, role: "staff" });
  }
  await batchWrite(staffWrites);
  console.log("  ✔ staff (" + allStaff.length + ")");

  /* ---- students (210) ---- */
  const studentWrites = [];
  const studentAuth = [];
  let adm = 1;
  const classSizeMap = {};
  for (const c of CLASSES) {
    const studs = [];
    for (let i = 0; i < c.size; i++) {
      const admissionNumber = "GA2026" + String(adm).padStart(4, "0");
      const fullName = `${pick(FIRST_NAMES)} ${LAST_NAMES[adm % LAST_NAMES.length]}`;
      const present = irand(84, 90);
      studs.push({
        fullName, admissionNumber, gender: pick(GENDERS), dob: `${irand(2007, 2020)}-${String(irand(1, 12)).padStart(2, "0")}-${String(irand(1, 28)).padStart(2, "0")}`,
        parent: `${pick(FIRST_NAMES)} ${LAST_NAMES[(adm + 3) % LAST_NAMES.length]}`, phone: "+234 80" + String(70000000 + adm * 571).slice(0, 8),
        address: `${irand(1, 40)} ${pick(["Cedar Avenue", "Kingsway Road", "Mango Street", "Unity Close", "Liberty Drive"])}, Ikeja, Lagos`,
        level: c.level, className: c.className, classKey: c.classKey, classSize: c.size,
        arm: i % 2 === 0 ? "A" : c.level === "Secondary" ? (i % 3 === 1 ? "B" : "C") : "B",
        house: HOUSES[adm % 4], passport: "assets/images/students/avatar-" + String((adm % 12) + 1) + ".jpg",
        userId: "", present, absent: 90 - present,
        formRemark: pick(["A promising result. Encouraged to keep improving.", "Works hard; needs to read more at home.", "Exemplary conduct and discipline.", "Should speak up more in class."]),
        session: SESSION.session, createdAt: new Date()
      });
      studentAuth.push({ email: admissionNumber.toLowerCase() + "@greenwoodacademy.edu.ng", password: "Student@2026", idx: adm, role: "student" });
      adm++;
    }
    classSizeMap[c.classKey] = studs.length;
    studs.forEach((s, i) => {
      s.arm = s.arm; // keep
      const id = c.classKey + "s" + String(i + 1).padStart(3, "0");
      studentWrites.push({ ref: db.collection("students").doc(id), data: { ...s, id } });
    });
  }
  await batchWrite(studentWrites);
  console.log("  ✔ students (" + (adm - 1) + ")");

  /* ---- teacher assignments (many-to-many) ---- */
  const assignWrites = [];
  let asg = 0;
  const formTeacherNames = ["Mrs. Funke Aderinto", "Mrs. Kemi Oyelaran", "Mrs. Amina Bello", "Mr. Tunde Ogundipe", "Mr. Victor Mba", "Mr. Chukwuma Obi", "Mr. Femi Adekoya", "Mrs. Ada Okafor"];
  CLASSES.forEach((c, ci) => {
    const formName = formTeacherNames[ci % formTeacherNames.length];
    const formDoc = allStaff.findIndex((s) => s.name === formName);
    if (formDoc >= 0) {
      asg++;
      assignWrites.push({ ref: db.collection("teacherAssignments").doc("ta" + String(asg).padStart(4, "0")), data: { teacherId: "st" + String(formDoc + 1).padStart(3, "0"), subjectId: c.subs[0], classId: c.classKey, isFormTeacher: true } });
    }
    c.subs.forEach((sid, si) => {
      const tidx = (ci * 3 + si) % allStaff.length;
      asg++;
      assignWrites.push({ ref: db.collection("teacherAssignments").doc("ta" + String(asg).padStart(4, "0")), data: { teacherId: "st" + String(tidx + 1).padStart(3, "0"), subjectId: sid, classId: c.classKey, isFormTeacher: false } });
    });
  });
  await batchWrite(assignWrites);
  console.log("  ✔ teacher assignments (" + asg + ")");

  /* ---- scores + results per student ---- */
  const students = (await db.collection("students").get()).docs.map((d) => ({ id: d.id, ...d.data() }));
  const scoreWrites = [];
  const resultWrites = [];
  for (const c of CLASSES) {
    const clsStudents = students.filter((s) => s.classKey === c.classKey);
    const totalsById = {};
    const prelim = [];
    for (const st of clsStudents) {
      const subjects = {};
      for (const sid of c.subs) {
        const ca1 = irand(6, 20), ca2 = irand(6, 20), exam = irand(12, 58);
        subjects[sid] = { ca1, ca2, exam };
      }
      const total = Object.values(subjects).reduce((a, x) => a + x.ca1 + x.ca2 + x.exam, 0);
      totalsById[st.id] = total;
      prelim.push({ st, subjects, total });
    }
    const posOf = standings(Object.values(totalsById));
    for (const { st, subjects, total } of prelim) {
      const sId = st.id;
      scoreWrites.push({ ref: db.collection("scores").doc(`${SESSION.key}_${c.classKey}_${sId}`), data: { sessionKey: SESSION.key, classId: c.classKey, term: SESSION.term, attendance: { daysOpen: 90, present: st.present, absent: st.absent, formTeacherRemark: st.formRemark, formTeacher: "Greenwood Staff" }, subjects } });
      const res = buildResult(st, { subjects });
      res.position = posOf(total);
      resultWrites.push({ ref: db.collection("results").doc(SESSION.key).collection(c.classKey).doc(sId), data: res });
    }
  }
  await batchWrite(scoreWrites); await batchWrite(resultWrites);
  console.log("  ✔ scores + results (" + scoreWrites.length + " score docs, " + resultWrites.length + " published result sheets)");

  /* ---- scratch pins (primary + secondary) ---- */
  const pinStudents = students.filter((s) => ["Primary", "Secondary"].includes(s.level));
  const pinWrites = [];
  for (const s of pinStudents) {
    let pin = "";
    for (let i = 0; i < 10; i++) pin += irand(0, 9);
    pinWrites.push({ ref: db.collection("scratchPins").doc(pin), data: { pin, admissionNumber: s.admissionNumber, studentName: s.fullName, className: s.className, classId: s.classKey, studentId: s.id, firstTermAttempts: 0, secondTermAttempts: 0, thirdTermAttempts: 0, createdAt: new Date() } });
  }
  await batchWrite(pinWrites);
  console.log("  ✔ scratch pins (" + pinWrites.length + ") — PINs listed in server/sample-pins.txt");
  const sampleLines = pinWrites.slice(0, 15).map((p) => `${p.data.pin}  ${p.data.admissionNumber}  ${p.data.studentName}  ${p.data.className}`);
  fs.writeFileSync(path.join(__dirname, "sample-pins.txt"), "SAMPLE SCRATCH PINS (first 15 of " + pinWrites.length + " for Primary+Secondary)\nPIN  AdmNo  Student  Class\n" + sampleLines.join("\n") + "\n\nFull PIN list lives in Firestore: collection scratchPins.\n");

  /* ---- public content ---- */
  const blogPosts = [
    ["top-10-ways-parents-support-home-learning", "Top 10 Ways Parents Can Support Learning at Home", "Parenting", "Parental support is the quiet engine of academic success. Here is how families move the needle.", "assets/images/blog/blog-1.jpg", 5, "Mrs. Ngozi Adeyemi", "Principal, Greenwood Academy", [
      { type: "p", text: "A child’s home is their first classroom, and the habits formed there set the rhythm for everything that follows." },
      { type: "ul", items: ["Build a fixed homework routine with a calm desk", "Read together for twenty minutes every night", "Talk about the school day during dinner", "Praise effort, not just results"] },
      { type: "quote", text: "Parents who ask questions, curious parents, raise children who ask questions." },
      { type: "p", text: "Even fifteen focused minutes a day changes the arc of a child’s year." }
    ]],
    ["why-early-years-matters", "Why the Early Years Really Matter", "Early Years", "Neuroscience shows that the first five years build the architecture of the brain.", "assets/images/blog/blog-2.jpg", 6, "Mrs. Funke Aderinto", "Head, Early Years", [
      { type: "p", text: "Rapid brain development happens before formal instruction ever begins — through play, language and relationships." },
      { type: "ul", items: ["Sensory play wires the motor cortex", "Rhymes build phonemic awareness", "Story time grows vocabulary by thousands of words", "Structured routines create emotional safety"] },
      { type: "p", text: "At Greenwood, the creche and nursery follow a play-based, curiosity-led curriculum." }
    ]],
    ["stem-and-creativity", "How We Blend STEM and Creativity in the Classroom", "Curriculum", "Coding and clay, physics and poetry — our approach to a modern curriculum.", "assets/images/blog/blog-3.jpg", 4, "Mr. Edwin Nwosu", "ICT & Innovation", [
      { type: "p", text: "The careers of 2035 will be invented, not inherited. We prepare students to build them." },
      { type: "ul", items: ["Practical lab days each week", "Coding clubs from JSS1", "Inter-house innovation challenges", "Art and design integrated into projects"] },
      { type: "quote", text: "Creativity is intelligence having fun." }
    ]],
    ["meet-our-librarian", "Meet Our Librarian: Grace Omoniyi", "Staff", "From quiet corners to book clubs — the heartbeat of the campus.", "assets/images/blog/blog-4.jpg", 3, "Editorial Team", "Writer, Greenwood Academy", [
      { type: "p", text: "Mrs. Omoniyi has turned reading into the most popular afternoon activity at Greenwood." },
      { type: "ul", items: ["Termly reading challenges with prizes", "Author visits every term", "A 9,000-title catalogue and growing"] }
    ]],
    ["healthy-morning-routine", "The School Mornings That Set Up Success", "Parenting", "A calm, structured morning is a predictor of a focused day.", "assets/images/blog/blog-5.jpg", 3, "Mrs. Ronke Adeyemi", "School Administrator", [
      { type: "p", text: "What happens before 7:45am shapes how a child learns by 12pm." },
      { type: "ul", items: ["Backpacks packed the night before", "A protein-rich breakfast", "Five minutes of quiet conversation", "Arrival by 7:45am for assembly"] }
    ]],
    ["sports-and-discipline", "Sports, Discipline and the Green House Rivalry", "Sports", "Inter-house sports day produced heroes and taught grace.", "assets/images/blog/blog-6.jpg", 4, "Mr. Victor Mba", "Head of Sports", [
      { type: "p", text: "Four houses. One trophy. A hundred personal bests." },
      { type: "quote", text: "Sports don’t build character — they reveal it." }
    ]],
    ["term1-assessments", "What Happens in Continuous Assessment", "Academics", "CA1, CA2 and exams explained for parents.", "assets/images/blog/blog-7.jpg", 5, "Mr. Chukwuma Obi", "Vice Principal", [
      { type: "p", text: "Our reporting uses CA1 (20) + CA2 (20) + Exam (60) = 100 for every subject." },
      { type: "p", text: "Continuous assessment spreads pressure and rewards consistency rather than one-day brilliance." }
    ]],
    ["boarding-ingenuity", "Young Inventors: The JSS3 Innovation Fair", "News", "Solar phone chargers and recycled irrigation systems at our annual fair.", "assets/images/blog/blog-8.jpg", 3, "Editorial Team", "Writer, Greenwood Academy", [
      { type: "p", text: "Forty-two projects, six prototypes, one unforgettable afternoon." }
    ]],
    ["nutrition-and-learning", "Nutrition and Learning: What’s on a Greenwood Lunchbox", "Wellbeing", "Food is fuel for focus. Our cafeteria standards explained.", "assets/images/blog/blog-9.jpg", 3, "Mrs. Grace Omoniyi", "School Nurse", [
      { type: "ul", items: ["Balanced hot lunch served daily", "Fresh fruit at break", "Water stations across campus", "Allergies flagged and catered for"] }
    ]],
    ["digital-safety", "Digital Safety: How We Teach Children to Be Good Online", "Wellbeing", "Phones, screens and citizenship — our whole-school approach.", "assets/images/blog/blog-10.jpg", 5, "Mr. Edwin Nwosu", "ICT & Innovation", [
      { type: "p", text: "Digital citizenship is taught from Primary 4, not assumed at Secondary." },
      { type: "ul", items: ["Sessions on privacy and passwords", "Role-play on cyberbullying", "A zero-tolerance reporting channel"] }
    ]]
  ];
  await batchWrite(blogPosts.map(([slug, title, category, excerpt, image, readTime, author, authorRole, blocks]) => ({
    ref: db.collection("blogPosts").doc(slug),
    data: { slug, title, category, excerpt, image, readTime, author, authorRole, blocks, date: new Date(2026, irand(0, 8), irand(1, 27)), publishedAt: new Date() }
  })));
  console.log("  ✔ blog posts (" + blogPosts.length + ")");

  const newsItems = [
    ["Greenwood Wins 2026 Inter-School Science Fair", "Science & Tech", "news-1", "Our SS2 Chemistry team took first place with an eco-battery project."],
    ["New STEM and Robotics Lab Opens on Campus", "Campus", "news-2", "Equipped with 3D printers, robotics kits and a crescent-shaped design studio."],
    ["Admissions for 2026/2027 Session Now Open", "Admissions", "news-3", "Creche to SSS3 places available. Term one begins September 8."],
    ["Scholarship Programme Launched for Top Candidates", "Scholarship", "news-4", "Up to 50% fee waivers for outstanding entrance exam candidates."],
    ["Inter-House Sports Day a Resounding Success", "Sports", "news-5", "Gold House take the trophy after a thrilling relay final."],
    ["Community Clean-up: Students Lead the Way", "Community", "news-6", "Our students joined the local AUTHORITY for a weekend clean-up initiative."]
  ];
  await batchWrite(newsItems.map(([title, category, img, excerpt], i) => ({
    ref: db.collection("news").doc("news_" + i),
    data: { title, category, excerpt, image: "assets/images/news/" + img + ".jpg", date: new Date(2026, irand(7, 8), irand(1, 28)), readTime: "3", type: "news" }
  })));

  const events = [
    ["Entrance & Scholarship Exams", "Admissions", "event-1", "Candidates sit the entrance exam for the 2026/2027 session.", "2026-10-14", "School Hall"],
    ["Inter-House Sports Day", "Sports", "event-2", "Track, field and house cheer-off at the Greenwood Sports Arena.", "2026-11-20", "Sports Arena"],
    ["Mid-Term Break", "Calendar", "event-3", "School closes for the mid-term break.", "2026-11-04", "—"],
    ["Parent-Teacher Conference", "Parents", "event-4", "Results review and feedback sessions with form teachers.", "2026-12-08", "Classrooms & Hall"],
    ["Santa Comes to Greenwood", "Events", "event-5", "A fun-filled day of games and Christmas cheer for early years.", "2026-12-15", "School Field"],
    ["Term One Exams Begin", "Academics", "event-6", "Written examinations for Primary and Secondary.", "2026-12-09", "School Campus"],
    ["Second Term Resumption", "Calendar", "event-7", "All students return for term two.", "2027-01-05", "School Campus"],
    ["Career Fair & Alumni Day", "Community", "event-8", "Professionals share career paths; alumni reunite.", "2027-02-19", "School Hall"],
    ["Valentine Cultural Day", "Events", "event-9", "Cultural displays, dress day and a fundraising drive.", "2027-02-13", "School Field"],
    ["JS/SS Graduation & Prize-Giving", "Ceremony", "event-10", "Graduation ceremony for JSS3 & SSS3 plus annual prizes.", "2027-07-20", "Main Hall"]
  ];
  await batchWrite(events.map(([title, category, img, excerpt, date, venue]) => ({
    ref: db.collection("events").doc(img),
    data: { slug: img, title, category, excerpt, image: "assets/images/events/" + img + ".jpg", date: new Date(date + "T09:00:00"), venue, published: true }
  })));

  const galleryItems = [];
  const gTitles = ["Campus Aerial View", "The Main Corridor", "Science Laboratory", "Our Library", "Morning Assembly", "Music & Drama Studio", "Primary Classroom", "Early Years Play Area", "Artwork Exhibition", "Basketball Court", "ICT & Robotics Lab", "Cafeteria", "Swimming Class", "Speech & Prize Day", "Chemistry Practical", "Cultural Display", "Design & Technology", "Outdoor Activity", "Chapel Service", "Green Fields at Dawn"];
  gTitles.forEach((t, i) => galleryItems.push({ ref: db.collection("gallery").doc("gal_" + (i+1)), data: { title: t, category: pick(["Campus", "Classrooms", "Sports", "Events", "Facilities"]), image: "assets/images/gallery/gallery-"+ (i+1)+".jpg", featured: i < 4, date: new Date(2026, 7, 1 + i) } }));
  await batchWrite(galleryItems);

  const announcements = [
    ["First Term Resumption — Monday 8 September", "All students resume for the 2026/2027 session. Assembly by 8:00am.", true],
    ["Scratch Card Result Checker is Live", "Parents can check results with the PIN printed on their child’s report.", false],
    ["PTC Scheduled for 8 December", "Book a slot with your child's form teacher.", false],
    ["New Library Timings", "The library now opens from 7:30am to 6:00pm on school days.", false],
    ["Term One Exams: 9–17 December", "Revision timetable published on the student portal.", false]
  ];
  await batchWrite(announcements.map(([title, body, pinned], i) => ({ ref: db.collection("announcements").doc("ann_" + i), data: { title, body, pinned, active: true, date: new Date(2026, irand(7, 9), irand(1, 20)) } })));
  console.log("  ✔ news / events / gallery / announcements");

  await db.collection("contacts").doc("demo_contact").set({ name: "Adeyemi Family", email: "adeyemi@example.com", phone: "+234 801 000 1111", subject: "Admissions", message: "Please send admission details for our daughter's JSS1 entry.", createdAt: new Date() });
  console.log("  ✔ sample contact (for admin contact inbox demo)");

  /* ---- Auth users + claims ---- */
  if (NO_AUTH) {
    console.log("  ⏭  skipped Auth user creation (--no-auth)");
    await writeUsersDocOnly();
  } else {
    await createAuthUsers();
  }

  console.log("\n✅ SEED COMPLETE.");
  console.log("   Web config:  see .env / public/js/firebase-config.js");
  console.log("   Logins:      see CREDENTIALS.md (covers sample PINs for result checker)");
  process.exit(0);
}

async function writeUsersDocOnly() {
  const batch = db.batch();
  for (let i = 1; i <= 210; i++) {
    const id = "GA2026" + String(i).padStart(4, "0");
    batch.set(db.collection("users").doc("none_" + i), { role: "student", recordId: "", email: id.toLowerCase() + "@greenwoodacademy.edu.ng" });
  }
  await batch.commit();
}

async function createAuthUsers() {
  console.log("  Creating Auth users + custom claims … this may take a minute");
  const getUid = async (email) => { try { return (await auth.getUserByEmail(email)).uid; } catch { return null; } };
  const adminExists = await getUid("admin@greenwoodacademy.edu.ng");
  let adminUser;
  if (adminExists) adminUser = { uid: adminExists };
  else adminUser = await auth.createUser({ email: "admin@greenwoodacademy.edu.ng", password: "Admin@2026", displayName: "Greenwood Administrator" });
  await auth.setCustomUserClaims(adminUser.uid, { role: "admin", roleName: "Administrator" });
  await db.collection("users").doc(adminUser.uid).set({ role: "admin", email: "admin@greenwoodacademy.edu.ng", recordId: null, displayName: "Greenwood Administrator" });

  const staffDocs = (await db.collection("staff").get()).docs;
  for (const d of staffDocs) {
    const data = d.data();
    try {
      let uid = (await getUid(data.email));
      if (!uid) uid = (await auth.createUser({ email: data.email, password: "Staff@2026", displayName: data.fullName })).uid;
      await auth.setCustomUserClaims(uid, { role: "staff", roleName: "Staff" });
      await db.collection("users").doc(uid).set({ role: "staff", email: data.email, recordId: d.id, displayName: data.fullName });
      await d.ref.update({ userId: uid });
    } catch (e) { console.warn("  ! staff " + data.email + ": " + e.message); }
  }

  const studDocs = (await db.collection("students").get()).docs;
  for (const d of studDocs) {
    const data = d.data();
    const email = data.admissionNumber.toLowerCase() + "@greenwoodacademy.edu.ng";
    try {
      let uid = (await getUid(email));
      if (!uid) uid = (await auth.createUser({ email, password: "Student@2026", displayName: data.fullName })).uid;
      await auth.setCustomUserClaims(uid, { role: "student", roleName: "Student" });
      await db.collection("users").doc(uid).set({ role: "student", email, recordId: d.id, displayName: data.fullName });
      await d.ref.update({ userId: uid });
    } catch (e) { console.warn("  ! student " + email + ": " + e.message); }
  }
  console.log("  ✔ Auth users created (1 admin + " + staffDocs.length + " staff + " + studDocs.length + " students), claims + users docs set");
}

main().catch((e) => { console.error("SEED ERROR:", e); process.exit(1); });