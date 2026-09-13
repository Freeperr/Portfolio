// Sticky header shadow after scroll
const header = document.getElementById("site-header");
const onScroll = () => {
  header.classList.toggle("scrolled", window.scrollY > 4);
};
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

// Mobile nav toggle
const navToggle = document.getElementById("nav-toggle");
const nav = document.getElementById("site-nav");
navToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
  navToggle.setAttribute("aria-label", isOpen ? "Menü schließen" : "Menü öffnen");
});
nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

// Subtle reveal-on-scroll
const revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealEls.forEach((el) => observer.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

// Live-Vorschau: iframe auf virtuelle Desktop-Breite (1440px) skalieren
const livePreviews = document.querySelectorAll(".live-preview");
if ("ResizeObserver" in window && livePreviews.length) {
  const ro = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      const scale = entry.contentRect.width / 1440;
      entry.target.style.setProperty("--scale", scale.toFixed(4));
    });
  });
  livePreviews.forEach((el) => ro.observe(el));
}

// Live-Vorschau: iframe erst sichtbar einblenden, sobald es geladen ist
livePreviews.forEach((el) => {
  const iframe = el.querySelector("iframe");
  if (!iframe) return;
  iframe.addEventListener("load", () => {
    iframe.classList.add("is-loaded");
    el.classList.add("is-loaded");
  });
});

// Footer year
document.getElementById("year").textContent = new Date().getFullYear();
