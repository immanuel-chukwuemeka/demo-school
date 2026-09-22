# Greenwood Academy — School Website + Result Management System

A complete Nigerian private-school website with a role-based **Result Management System** — admin control room, teacher marksheet portal, student portal, and a parent scratch-card result checker — built with **vanilla HTML/CSS/JavaScript (ES modules)** on **Firebase** (Authentication, Cloud Firestore, Hosting).

Brand: *Greenwood Academy* · Motto: *"Knowledge, Character, Excellence"* · Firebase project: `school-demo-58461`.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Static HTML + CSS design system + vanilla JS (ES modules) |
| Backend | Firebase Authentication + Cloud Firestore (NFR rules) |
| Data layer | `firebase-admin` (offline seeding script only) |
| PDFs | jsPDF (result sheet, broadsheet, fee breakdown, prospectus) |
| Charts | Chart.js |
| Images | Pollinations AI (downloaded once to `public/assets/images/`, **never hotlinked**) |

No build step, no bundler. Serve `public/` over any HTTP server (ES modules require HTTP, not `file://`).

## Features

**Public website** — homepage with live requirement widget, hero, stats; About; Academics (Creche / Nursery / Primary / Secondary); Admissions + FAQs; Requirements (per-class fee breakdown + PDF); Prospectus (per-class with download); Gallery; News; Blog (+ article pages & sharing); Activities; Contact (writes to `contacts`).

**Portals** (role-gated by custom claims):
- **Admin** — dashboard with charts; Students (CRUD + Class Promoter); Staff + many-to-many teacher assignments; Classes; Subjects; Departments; Fees (per class, auto totals); Requirements; Prospectus; Result engine (enter marks from CA1 20 · CA2 20 · Exam 60, publish/unpublish/lock, broadsheet PDF); Scratch cards (bulk-generate PINs, CSV export); Announcements; Gallery; News & Blog; School Settings.
- **Staff** — subject-class marksheets with live totals, bulk entry; form-teacher attendance; view/lock results; announcements; profile.
- **Student** — overview with summary stat card; report sheet + PDF; attendance; fees & requirements; announcements; profile.

**Parents** — `check-result.html`: admission number + 10-digit scratch PIN → reads `scratcPins` → verifies ≤3 attempts/term → loads the published report from `results/{sessionKey}/{classId}/{studentId}` with print/PDF (Secondary only).

## Firestore Data Model

```
settings/main            — school identity, session/term, grading, sessionKey
schools/{slug}           — one school (multi-school ready)
sessions/2026-2027, terms/{first…}, grading/{A…F}
classes/{classKey}       — creche1, creche2, nursery1, nursery2, p1..p6, jss1..3, ss1..3
subjects/{id}, departments/{id}
staff/{id}               — staffId, type, department, formTeacher, userId
teacherAssignments/{id}  — teacherId ↔ subjectId ↔ classId (+ isFormTeacher)
students/{id}            — classKey, classifier, arm, house, userId, passport
fees/{classKey}, requirements/{classKey}   — mirror; public reads
prospectus/{classKey}    — textbooks/exerciseBooks/uniforms/… arrays
scores/{sessionKey}_{classId}_{studentId}  — per-subject {ca1,ca2,exam} + attendance
results/{sessionKey}/{classId}/{studentId} — computed published sheet
scratchPins/{pin}        — 10-digit numeric ID + admissionNumber, attempts/term
news, blogPosts, events, gallery, announcements, contacts
```

`sessionKey` = `${session sans slash}-${term lower}` e.g. `2026-2027_first`.

## Getting Started

```bash
# 1. Config (no secrets here — the web config is public by design)
cp .env.example .env            # values already filled for school-demo-58461

# 2. Firebase CLI login + select project
firebase login
firebase use school-demo-58461

# 3. Node modules for the seeding script only (server-side)
cd server && npm install && cd ..

# 4. Seed Firestore + Auth (create 210 students, 30 staff, results, pins…)
cd server && node seed.js --no-auth   # Firestore only (no Auth users)
node seed.js                          # Firestore + 241 Auth users + custom claims
cd ..

# 4b. Re-running the Auth step only (idempotent, no data duplication):
#   Firebase Console → Authentication → Sign-in method → Email/Password → Enable
#   then: cd server && node seed.js --auth-only

# 5. Generate local images (optional — fallbacks are SVGs)
node generate-images.js core && node generate-images.js gallery && node generate-images.js blog \
  && node generate-images.js avatars && node generate-images.js staffimg && node generate-images.js media

# 6. Deploy
firebase deploy --only firestore:rules,storage,hosting

# 7. Enable Email/Password provider
# Firebase Console → Authentication → Sign-in method → Email/Password → Enable
```

Done — open `https://school-demo-58461.web.app`.

## Doc Logins

See **CREDENTIALS.md** for admin/staff/student accounts and sample parent scratch PINs; `server/sample-pins.txt` is written by the seed.

## Underscore-free security

Two security layers: **rules** (public read for content, claim-gated write/read) and **app-layer guards** (`guardPage(role)`). No secret ever lives in the client — the service key `server/serviceAccountKey.json` is gitignored and used only by `seed.js`.

## Notes
- Free Spark plan → no Firebase Storage; images/avatars live in `public/assets/images/`.
- `contacts` is publicly writable with validation so the contact form works before the admin exists.
- Result checker marks the pin's attempt counters; rules allow anonymous updates to those counters only.