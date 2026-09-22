#!/usr/bin/env node
/* ==============================================================
 * LOCAL IMAGE GENERATION — pollinations.ai (free, no API key).
 * Download once into public/assets/images, never hotlink.
 * Filters/regex-reject unsafe prompts; writes an SVG fallback if
 * a download fails so no page ships with a broken image.
 *
 *   node generate-images.js          # everything (large batch)
 *   node generate-images.js core     # hero/facilities/activities
 *   node generate-images.js gallery  # gallery-1..20
 *   node generate-images.js blog     # blog-1..10
 * ============================================================== */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "public", "assets", "images");

const OUT = (sub, name) => path.join(ROOT, sub, name);
const mk = (p) => fs.mkdirSync(path.dirname(p), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SILENT = process.argv.includes("--silent");
const log = (...a) => { if (!SILENT) console.log(...a); };

/* ---------- safe-prompt filter (keeps Pollinations T&Cs happy) ---------- */
const SAFE = /child|kid|boy|girl|student|student+ s/i;
const BAD = /nude|naked|topless|sexy|violen|weapon|gun|blood|terror|frontier implicit/i;
function safe(prompt) { return BAD.test(prompt) ? "[filtered unsafe prompt]" : prompt; }

/* ---------- manifest ---------- */
const core = [
  ["hero", "campus-hero", "wide exterior shot of a modern Nigerian private school campus building with green lawns, palm trees, blue and navy architecture, golden accents, morning light, professional photography", "wide"],
  ["hero", "morning-assembly", "African school children in smart navy and gold uniforms standing for morning assembly in a school courtyard, warm sunlight, cinematic photography", "wide"],
  ["hero", "principal", "portrait of a confident Nigerian female school principal in her 50s wearing an elegant navy suit, warm smile, blurred school campus background, professional portrait photography", "square"],
  ["facilities", "classroom-primary", "bright cheerful primary school classroom with colorful wall charts, small wooden desks, happy young African pupils raising hands, teacher smiling, natural light", "wide"],
  ["facilities", "classroom-secondary", "clean secondary school classroom, teenage African students in navy uniforms taking notes, modern smart board, bright windows", "wide"],
  ["facilities", "science-lab", "modern school science laboratory, teenage African students in white lab coats doing a chemistry experiment, microscopes and beakers, bright lighting", "wide"],
  ["facilities", "library", "cozy school library with wooden shelves full of books, young African students reading at tables, warm lighting", "wide"],
  ["facilities", "computer-lab", "school ICT computer lab, young African students working on desktop computers, modern monitors, blue interior", "wide"],
  ["activities", "career-day", "school career day event in an assembly hall, African students in uniform listening to a guest speaker on stage, banners, bright hall", "wide"],
  ["activities", "cultural-day", "Nigerian cultural day at school, students in colorful traditional attire dancing on stage, festive atmosphere, bright lights", "wide"],
  ["activities", "graduation", "school graduation ceremony, African graduates in navy gowns and caps celebrating outdoors on campus, golden hour", "wide"]
];

const galleryPrompts = [
  "aerial view of a modern Nigerian private school campus with football field and swimming pool",
  "wide school corridor with lockers, students walking, bright and clean architecture",
  "well equipped school science laboratory benches with beakers, empty room, clean",
  "school library reading corner with colorful bean bags and storybooks for children",
  "morning school assembly, rows of students in navy uniforms on a field, flags",
  "music and drama studio with drum set, piano and African instruments",
  "colorful early years classroom with alphabet wall, toys, small chairs",
  "creche play area with soft mats, climbing blocks and bright toys",
  "school art exhibition wall with children paintings and crafts",
  "outdoor basketball court at a private school, students playing",
  "robotics lab with 3d printers, robot kits, students building",
  "school cafeteria with food counter and students eating lunch",
  "children learning to swim in a school pool with instructor",
  "school speech and prize giving day stage with trophies",
  "chemistry practical class, students in white coats holding test tubes",
  "cultural dance display on stage, traditional IGbo and Yoruba attire",
  "design and technology workshop woodworking benches",
  "group of African school children playing soccer on a green field after school",
  "chapel service at a private school, students seated with hymn books",
  "school campus at dawn, dewy green lawn and building silhouette"
];

const blogPrompts = [
  "black African mother helping her son with homework at a dining table, warm home setting",
  "nursery age African children playing with building blocks in a colorful classroom, teacher assisting",
  "African schoolgirl building a robot kit in a STEM lab, focused expression",
  "friendly Nigerian female librarian shelving books in a school library, smiling",
  "African family having breakfast together before school, bright kitchen, school bags",
  "school sports day relay race, young African athletes on a track, cheering crowd",
  "African secondary students writing an exam in a classroom, calm and focused",
  "young African inventors presenting cardboard projects at a school innovation fair, poster boards",
  "healthy school lunchbox with fruits, sandwich and water bottle on a wooden desk",
  "African teenager using a tablet in school library with a teacher nearby, digital safety theme"
];

const eventPrompts = [
  "school hall with rows of desks for entrance exams, students writing, calm",
  "school inter-house sports day gala day, colorful bunting, running track, students in house colors",
  "empty school corridor during midterm break, quiet, clean",
  "parent teacher conference room, African parents talking with teachers, desks and chairs",
  "santa and christmas decorations event for young children on a school field",
  "exam hall with secondary students writing papers at desks, clock",
  "students with backpacks entering school gate on resumption day, morning light",
  "career fair booths with professionals talking to school students in a hall",
  "valentine cultural day food stalls and dance on school field, festive",
  "graduation ceremony main hall, graduates in gowns receiving certificates on stage"
];

const newsPrompts = [
  "African science students holding a trophy at a science fair, celebration",
  "modern robotics and STEM lab opening with ribbon cutting, students with robots",
  "admissions desk with brochures and prospectus on a school table",
  "African student receiving a scholarship certificate on stage",
  "inter-house sports day trophy presentation, gold team celebrating",
  "young African students with gloves cleaning up a neighborhood street, community spirit"
];

const avatarPrompts = [
  "passport style headshot portrait of a smiling 7 year old African schoolboy in navy uniform, plain light grey background",
  "passport style headshot portrait of a smiling 8 year old African schoolgirl in navy uniform, plain light grey background",
  "passport style headshot portrait of a happy 10 year old African schoolboy in white shirt, plain light grey background",
  "passport style headshot portrait of a cheerful 9 year old African schoolgirl with braids in uniform, plain light grey background",
  "passport style headshot portrait of a smiling 12 year old African schoolboy in blazer, plain light grey background",
  "passport style headshot portrait of a smiling 13 year old African schoolgirl in blazer, plain light grey background",
  "passport style headshot portrait of a happy 6 year old African schoolboy in polo shirt, plain light grey background",
  "passport style headshot portrait of a joyful 5 year old African schoolgirl with curly hair, plain light grey background",
  "passport style headshot portrait of a smiling 14 year old African schoolboy in navy tie, plain light grey background",
  "passport style headshot portrait of a cheerful 15 year old African schoolgirl in uniform, plain light grey background",
  "passport style headshot portrait of a smiling 11 year old African schoolboy in round glasses, plain light grey background",
  "passport style headshot portrait of a happy 16 year old African schoolgirl in blazer, plain light grey background"
];

const staffPrompts = [
  "professional headshot portrait of a smiling Nigerian female nursery school teacher in navy uniform, plain light background",
  "professional headshot portrait of a middle aged Nigerian male science teacher in shirt and tie, plain light background",
  "professional headshot portrait of a smiling young Nigerian female teacher with headwrap, plain light background",
  "professional headshot portrait of a Nigerian male school administrator in formal suit, plain light background",
  "professional headshot portrait of a smiling Nigerian female librarian in cardigan, plain light background",
  "professional headshot portrait of a Nigerian male sports coach in athletic wear, plain light background"
];

/* ---------- sizing ---------- */
const WIDE = { width: 1536, height: 864 };
const SQUARE = { width: 1024, height: 1024 };
const PORTRAIT = { width: 768, height: 1024 };

function makeManifest() {
  let listCount = 0;
  const entries = core.map(([sub, name, prompt, r]) => ({ file: OUT(sub, name + ".jpg"), prompt, seed: 20260800 + listCount++, ...(r === "square" ? SQUARE : r === "portrait" ? PORTRAIT : WIDE) }));
  const add = (sub, prefix, prompts, mode) => prompts.forEach((p, i) => entries.push({ file: OUT(sub, `${prefix}-${i + 1}.jpg`), prompt: p, seed: 20260000 + (i * 97) + 13, ...(mode === "square" ? SQUARE : mode === "portrait" ? PORTRAIT : WIDE) }));
  add("gallery", "gallery", galleryPrompts, "wide");
  add("blog", "blog", blogPrompts, "wide");
  add("news", "news", newsPrompts, "wide");
  add("events", "event", eventPrompts, "wide");
  add("students", "avatar", avatarPrompts, "portrait");
  add("staff", "staff", staffPrompts, "square");
  return entries;
}

/* ---------- downloader ---------- */
let done = 0, failed = 0;
async function dl(entry) {
  if (fs.existsSync(entry.file)) { log("  · " + path.relative(ROOT, entry.file) + " (exists, skipped)"); return; }
  if (fs.existsSync(entry.file.replace(/\.(png|jpg|jpeg|webp)$/i, ".svg"))) fs.unlinkSync(entry.file.replace(/\.(png|jpg|jpeg|webp)$/i, ".svg"));
  const enc = encodeURIComponent(safe(entry.prompt));
  const url = `https://image.pollinations.ai/prompt/${enc}?width=${entry.width}&height=${entry.height}&nologo=true&seed=${entry.seed}&model=flux`;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(90000) });
      if (res.status === 429) { log(`  ⏳ ${path.relative(ROOT, entry.file)} rate-limited, retry ${attempt}/5`); await sleep(6000 * attempt); continue; }
      if (!res.ok) throw new Error("HTTP " + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 3000) throw new Error("tiny payload " + buf.length);
      mk(entry.file);
      fs.writeFileSync(entry.file, buf);
      done++;
      log("  ✔ " + path.relative(ROOT, entry.file));
      return;
    } catch (e) {
      if (attempt === 5) {
        failed++;
        fallbackSvg(entry.file, entry.prompt);
        log("  ✗ " + path.relative(ROOT, entry.file) + " → " + e.message.slice(0, 60));
        return;
      }
      log(`  ⏳ ${path.relative(ROOT, entry.file)} ${e.message.slice(0, 40)} retry ${attempt}/5`);
      await sleep(3500 * attempt);
    }
  }
}

function fallbackSvg(file, prompt) {
  const title = prompt.split(",")[0] || "Greenwood Academy";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="100%" height="100%" fill="#0d1b2a"/><circle cx="450" cy="190" r="60" fill="#f5c542"/><text x="450" y="330" fill="#f5c542" font-family="Segoe UI, Arial" font-size="34" font-weight="800" text-anchor="middle">GREENWOOD</text><text x="450" y="370" fill="#dfe8f4" font-family="Segoe UI, Arial" font-size="19" text-anchor="middle">${title}</text><text x="450" y="560" fill="#8fa3bd" font-family="Segoe UI, Arial" font-size="14" text-anchor="middle">knowledge · character · excellence</text></svg>`;
  try { mk(file); fs.writeFileSync(file.replace(/\.(png|jpg|jpeg|webp)$/i, ".svg"), svg); } catch (e) {}
}

/* ---------- placeholders for default avatars ---------- */
function defaults() {
  const png = (name, bg, ring, label) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="${bg}"/><circle cx="200" cy="160" r="78" fill="#3a4a5c"/><circle cx="200" cy="420" r="150" fill="#3a4a5c"/><rect x="0" y="0" width="400" height="400" fill="none" stroke="${ring}" stroke-width="14"/><text x="200" y="392" fill="#aebfd4" font-family="Segoe UI, Arial" font-size="26" font-weight="700" text-anchor="middle">${label}</text></svg>`;
    const p = path.join(ROOT, name);
    mk(p); fs.writeFileSync(p.replace(/\.png$/, ".svg"), svg);
  };
  png("students/student-default.png", "#0d1b2a", "#f5c542", "STUDENT");
  png("staff/staff-default.png", "#0d1b2a", "#f5c542", "STAFF");
}

/* ---------- main ---------- */
(async () => {
  const target = process.argv.slice(2).filter((a) => !a.startsWith("--"))[0] || "all";
  let entries = makeManifest();
  if (target === "core") entries = entries.filter((e) => ["hero", "facilities", "activities"].includes(e.file.split(path.sep).slice(-2)[0]));
  if (target === "gallery") entries = entries.filter((e) => e.file.includes("gallery"));
  if (target === "blog") entries = entries.filter((e) => e.file.includes("blog"));
  if (target === "avatars") entries = entries.filter((e) => e.file.includes("students"));
  if (target === "staffimg") entries = entries.filter((e) => e.file.includes("staff"));
  if (target === "media") entries = entries.filter((e) => e.file.includes("news") || e.file.includes("events"));

  defaults();
  console.log(`Generating ${entries.length} images (batch: ${target}) …`);
  for (const e of entries) await dl(e);
  console.log(`\nDone — ${done} downloaded, ${failed} fell back to SVG placeholders.`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });