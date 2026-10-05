/* ==============================================================
 * ADMIN BOOTSTRAP — registers all admin views with the shell.
 * ============================================================== */
import { bootShell } from "./shell.js";
import { initPWA } from "../../lib/pwa.js";
import dashboard from "./dashboard.js";
import students from "./students.js";
import staff from "./staff.js";
import classes, { subjects, departments } from "./classes.js";
import { fees, requirements, prospectus } from "./finance.js";
import results from "./results.js";
import scratchcards from "./scratchcards.js";
import { announcements, gallery, news } from "./content.js";
import settings from "./settings.js";

const views = {
  dashboard, students, staff, classes, subjects, departments,
  fees, requirements, prospectus, results, scratchcards,
  announcements, gallery, news, settings
};

/* Offline shell only — the admin control room never nags about installing. */
initPWA({ banner: false });

bootShell(views);