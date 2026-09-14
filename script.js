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

// Kontaktformular (sendet über /api/contact an Resend)
const contactForm = document.getElementById("contact-form");
if (contactForm) {
  const statusEl = document.getElementById("cf-status");
  const submitBtn = contactForm.querySelector("button[type='submit']");
  const submitLabel = submitBtn.querySelector(".btn-label");
  const minLoadingTime = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.textContent = "";
    statusEl.classList.remove("success", "error");

    const payload = Object.fromEntries(new FormData(contactForm).entries());

    submitBtn.disabled = true;
    submitBtn.classList.add("is-loading");
    submitLabel.textContent = "Wird gesendet…";

    try {
      const [response] = await Promise.all([
        fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
        minLoadingTime(700),
      ]);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Nachricht konnte nicht gesendet werden.");
      }

      contactForm.reset();
      statusEl.textContent = "Danke! Ich melde mich so schnell wie möglich.";
      statusEl.classList.add("success");
    } catch (err) {
      statusEl.textContent = err.message || "Etwas ist schiefgelaufen. Bitte versuch es später erneut.";
      statusEl.classList.add("error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove("is-loading");
      submitLabel.textContent = "Nachricht senden";
    }
  });
}
