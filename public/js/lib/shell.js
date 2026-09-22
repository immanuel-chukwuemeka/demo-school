/* ==============================================================
 * SITE SHELL — renders the sticky glass header, premium footer,
 * mobile nav, login dropdown and back-to-top on every public page.
 * Each page marks itself active via <body data-page="home"> etc.
 * ============================================================== */
import { loadSettings, settingsSync } from "./site.js";
import { toast } from "./ui.js";

export const NAV = [
  { key: "home", label: "Home", href: "index.html" },
  { key: "about", label: "About", href: "about.html" },
  {
    key: "academics", label: "Academics", dropdown: [
      { label: "Creche", href: "creche.html" },
      { label: "Nursery", href: "nursery.html" },
      { label: "Primary", href: "primary.html" },
      { label: "Secondary", href: "secondary.html" }
    ]
  },
  {
    key: "admissions", label: "Admissions", dropdown: [
      { label: "Admissions", href: "admissions.html" },
      { label: "Requirements", href: "requirements.html" },
      { label: "Prospectus", href: "prospectus.html" },
      { label: "Check Result", href: "check-result.html" }
    ]
  },
  {
    key: "media", label: "Media", dropdown: [
      { label: "Gallery", href: "gallery.html" },
      { label: "News & Activities", href: "news.html" },
      { label: "Blog", href: "blog.html" },
      { label: "School Events", href: "activities.html" }
    ]
  },
  { key: "contact", label: "Contact", href: "contact.html" }
];

function dropdown(item) {
  return `
    <li class="nav-item has-dropdown" data-key="${item.key}">
      <a class="nav-link" href="#" aria-haspopup="true">${item.label} <i class="fa-solid fa-caret-down"></i></a>
      ${item.dropdown ? `<div class="dropdown">${item.dropdown.map((d) => `<a href="${d.href}">${d.label}</a>`).join("")}</div>` : ""}
    </li>`;
}

function navItem(item) {
  return item.dropdown
    ? dropdown(item)
    : `<li class="nav-item" data-key="${item.key}"><a class="nav-link" href="${item.href}">${item.label}</a></li>`;
}

function headerHTML() {
  const s = settingsSync();
  return `
  <div class="topbar">
    <div class="container topbar-inner">
      <div class="topbar-title">${s.motto}</div>
      <div class="flex" style="gap:18px">
        <a href="tel:${s.phone.replace(/\s/g, "")}"><i class="fa-solid fa-phone"></i> ${s.phone}</a>
        <a href="mailto:${s.email}"><i class="fa-solid fa-envelope"></i> ${s.email}</a>
        <a href="${s.facebook}" target="_blank" rel="noopener" style="font-size:1rem"><i class="fa-brands fa-facebook-f"></i></a>
        <a href="${s.twitter}" target="_blank" rel="noopener" style="font-size:1rem"><i class="fa-brands fa-x-twitter"></i></a>
        <a href="${s.instagram}" target="_blank" rel="noopener" style="font-size:1rem"><i class="fa-brands fa-instagram"></i></a>
      </div>
    </div>
  </div>
  <div class="container header-inner">
    <a class="brand" href="index.html" aria-label="${s.name} home">
      <img src="assets/logo/logo.svg" alt="${s.name} logo">
      <span class="brand-name">${s.name}<small>Creche · Nursery · Primary · Secondary</small></span>
    </a>
    <nav class="main-nav" id="mainNav" aria-label="Primary">
      <ul class="nav-list">${NAV.map(navItem).join("")}</ul>
    </nav>
    <div class="header-actions">
      <a class="btn btn-gold btn-sm" href="admissions.html"><i class="fa-solid fa-user-plus"></i> Apply Now</a>
      <div style="position:relative">
        <button class="login-drop" type="button" id="loginDrop" aria-haspopup="true">
          <i class="fa-solid fa-user-lock"></i> Login <i class="fa-solid fa-caret-down"></i>
        </button>
        <div class="login-menu">
          <a href="login.html?role=admin"><span class="li-ic"><i class="fa-solid fa-user-tie"></i></span> Admin Login</a>
          <a href="login.html?role=staff"><span class="li-ic"><i class="fa-solid fa-chalkboard-user"></i></span> Staff Login</a>
          <a href="login.html?role=student"><span class="li-ic"><i class="fa-solid fa-graduation-cap"></i></span> Student Login</a>
          <div style="border-top:1px solid var(--color-border);margin:8px 4px 4px"></div>
          <a href="check-result.html" style="color:var(--color-accent)"><span class="li-ic"><i class="fa-solid fa-file-circle-check"></i></span> Parent: Check Result</a>
        </div>
      </div>
      <button class="nav-toggle" id="navToggle" type="button" aria-label="Open menu"><i class="fa-solid fa-bars"></i></button>
    </div>
  </div>`;
}

function footerHTML() {
  const s = settingsSync();
  return `
  <div class="container footer-top">
    <div class="footer-brand">
      <a class="brand" href="index.html">
        <img src="assets/logo/logo-white.svg" alt="${s.name}" style="height:58px">
        <span class="brand-name" style="color:#fff">${s.name}<small style="color:var(--color-accent)">${s.motto}</small></span>
      </a>
      <p>A premium private school nurturing confident, disciplined, academically excellent learners from creche through secondary school. ${s.vision}</p>
      <div class="footer-social">
        <a href="${s.facebook}" aria-label="Facebook"><i class="fa-brands fa-facebook-f"></i></a>
        <a href="${s.twitter}" aria-label="X"><i class="fa-brands fa-x-twitter"></i></a>
        <a href="${s.instagram}" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
        <a href="${s.youtube}" aria-label="YouTube"><i class="fa-brands fa-youtube"></i></a>
        <a href="https://wa.me/${s.whatsapp.replace(/\D/g, "")}" aria-label="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
      </div>
    </div>
    <div class="footer-col">
      <h4>Quick Links</h4>
      <ul>
        <li><a href="index.html"><i class="fa-solid fa-caret-right"></i> Home</a></li>
        <li><a href="about.html"><i class="fa-solid fa-caret-right"></i> About Us</a></li>
        <li><a href="admissions.html"><i class="fa-solid fa-caret-right"></i> Admissions</a></li>
        <li><a href="gallery.html"><i class="fa-solid fa-caret-right"></i> Gallery</a></li>
        <li><a href="blog.html"><i class="fa-solid fa-caret-right"></i> Blog</a></li>
        <li><a href="contact.html"><i class="fa-solid fa-caret-right"></i> Contact</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Academics</h4>
      <ul>
        <li><a href="creche.html"><i class="fa-solid fa-caret-right"></i> Creche</a></li>
        <li><a href="nursery.html"><i class="fa-solid fa-caret-right"></i> Nursery</a></li>
        <li><a href="primary.html"><i class="fa-solid fa-caret-right"></i> Primary</a></li>
        <li><a href="secondary.html"><i class="fa-solid fa-caret-right"></i> Secondary</a></li>
        <li><a href="requirements.html"><i class="fa-solid fa-caret-right"></i> Requirements</a></li>
        <li><a href="prospectus.html"><i class="fa-solid fa-caret-right"></i> Prospectus</a></li>
      </ul>
    </div>
    <div class="footer-news">
      <h4>Stay Connected</h4>
      <p>${s.newsletterText}</p>
      <form class="news-form" id="newsletterForm">
        <input type="email" required placeholder="Your email address" aria-label="Email for newsletter">
        <button class="btn btn-gold btn-sm" type="submit">Subscribe</button>
      </form>
      <div class="flex" style="margin-top:18px;font-size:.88rem;color:#AAB7CC">
        <i class="fa-solid fa-location-dot" style="color:var(--color-accent)"></i> ${s.address}
      </div>
    </div>
  </div>
  <div class="container footer-bottom">
    <span>&copy; ${new Date().getFullYear()} ${s.name}. All rights reserved.</span>
    <span>${s.name} · <a href="${s.domain}">${s.domain}</a></span>
  </div>`;
}

export async function mountShell() {
  const s = await loadSettings();
  const headerHost = document.getElementById("site-header");
  const footerHost = document.getElementById("site-footer");
  if (headerHost) headerHost.innerHTML = headerHTML();
  if (footerHost) footerHost.innerHTML = footerHTML();
  finalizeShell();
}

/** Wire up interactions after HTML is injected. */
export function finalizeShell() {
  const activeKey = document.body.dataset.page;

  document.querySelectorAll(".nav-item").forEach((it) => {
    if (it.dataset.key === activeKey) it.classList.add("active");
    else {
      const child = it.querySelector(`a[href="${window.location.pathname.split("/").pop()}"]`);
      if (child) it.classList.add("active");
    }
  });

  // Glassmorphism header on scroll
  const header = document.querySelector(".site-header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile menu
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("mainNav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => { nav.classList.toggle("open"); document.querySelector(".nav-overlay")?.classList.toggle("show"); });
  }
  const overlay = document.createElement("div");
  overlay.className = "nav-overlay";
  document.body.appendChild(overlay);
  overlay.addEventListener("click", () => { nav.classList.remove("open"); overlay.classList.remove("show"); });
  document.querySelectorAll(".has-dropdown > .nav-link").forEach((l) => {
    l.addEventListener("click", (e) => { if (window.innerWidth <= 1080) { e.preventDefault(); l.parentElement.classList.toggle("open"); } });
  });

  // Mobile toggle icon swap
  if (toggle) {
    const ic = toggle.querySelector("i");
    if (ic) {
      const iv = setInterval(() => {
        if (nav.classList.contains("open")) { ic.className = "fa-solid fa-xmark"; clearInterval(iv); }
      }, 300);
      nav.addEventListener("transitionend", () => {
        ic.className = nav.classList.contains("open") ? "fa-solid fa-xmark" : "fa-solid fa-bars";
      });
    }
  }

  // Login dropdown
  const ld = document.getElementById("loginDrop");
  if (ld) ld.addEventListener("click", () => ld.classList.toggle("open"));

  // Newsletter
  const nf = document.getElementById("newsletterForm");
  if (nf) nf.addEventListener("submit", (e) => { e.preventDefault(); nf.reset(); toast("Thank you! You are now subscribed.", "success", "Subscribed"); });

  const mobileLinks = nav ? nav.querySelectorAll(".nav-link") : [];
  mobileLinks.forEach((l) => l.addEventListener("click", () => { if (window.innerWidth <= 1080 && !l.closest(".has-dropdown")) { nav.classList.remove("open"); overlay.classList.remove("show"); } }));
}