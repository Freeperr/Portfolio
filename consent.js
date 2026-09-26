// Cookie-Einwilligung: speichert nur die Auswahl im localStorage und lädt
// externe Inhalte (Google Fonts, Live-Vorschauen) erst nach Zustimmung.
const CONSENT_KEY = "fp-consent";
const DEFAULT_EXTERNAL = false;
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";

const readConsent = () => {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (err) {
    return null;
  }
};

const writeConsent = (external) => {
  const value = { necessary: true, external: external === true, ts: new Date().toISOString() };
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
  } catch (err) {
    /* localStorage nicht verfügbar – Auswahl gilt dann nur für diese Sitzung */
  }
  return value;
};

const externalAllowed = () => {
  const consent = readConsent();
  return !!consent && consent.external === true;
};

// Google Fonts erst nach Einwilligung laden (ohne sie bleiben Systemschriften)
const loadFonts = () => {
  if (document.querySelector("link[data-fp-fonts]")) return;

  const preconnectApi = document.createElement("link");
  preconnectApi.rel = "preconnect";
  preconnectApi.href = "https://fonts.googleapis.com";

  const preconnectStatic = document.createElement("link");
  preconnectStatic.rel = "preconnect";
  preconnectStatic.href = "https://fonts.gstatic.com";
  preconnectStatic.crossOrigin = "anonymous";

  const sheet = document.createElement("link");
  sheet.rel = "stylesheet";
  sheet.href = FONT_HREF;

  [preconnectApi, preconnectStatic, sheet].forEach((link) => {
    link.setAttribute("data-fp-fonts", "");
    document.head.appendChild(link);
  });
};

const unloadFonts = () => {
  document.querySelectorAll("link[data-fp-fonts]").forEach((link) => link.remove());
};

const hostOf = (url) => {
  try {
    return new URL(url, window.location.href).hostname;
  } catch (err) {
    return "";
  }
};

const makePlaceholder = (host) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "preview-placeholder";
  button.setAttribute("data-preview-load", "");

  const title = document.createElement("span");
  title.className = "preview-placeholder-title";
  title.textContent = host ? `Vorschau von ${host} laden` : "Vorschau laden";

  const hint = document.createElement("span");
  hint.className = "preview-placeholder-hint";
  hint.textContent = host ? `Externe Inhalte von ${host}` : "Externe Inhalte";

  button.append(title, hint);
  return button;
};

// Eine einzelne Live-Vorschau laden – oder wieder blockieren.
const setPreview = (box, allowed) => {
  const frame = box.querySelector("iframe");
  const url = frame ? frame.getAttribute("data-src") : null;
  if (!url) return;

  if (allowed) {
    const placeholder = box.querySelector("[data-preview-load]");
    if (placeholder) placeholder.remove();
    if (frame.getAttribute("data-fp-loaded") === "1") return;

    frame.setAttribute("data-fp-loaded", "1");
    frame.addEventListener("load", () => {
      frame.classList.add("is-loaded");
      box.classList.add("is-loaded");
    });
    frame.src = url;
    return;
  }

  // Das Element bleibt erhalten, damit eine später erneut erteilte
  // Einwilligung die Vorschau wieder laden kann.
  frame.removeAttribute("src");
  frame.removeAttribute("data-fp-loaded");
  frame.classList.remove("is-loaded");
  box.classList.remove("is-loaded");
  if (!box.querySelector("[data-preview-load]")) {
    box.appendChild(makePlaceholder(hostOf(url)));
  }
};

const setPreviews = (allowed) => {
  document.querySelectorAll(".live-preview").forEach((box) => setPreview(box, allowed));
};

const bannerMarkup = `
  <div class="cookie-inner">
    <div class="cookie-text">
      <h2 class="cookie-title" id="cookie-banner-title">Cookie-Einstellungen</h2>
      <p>
        Diese Website setzt keine Cookies und nutzt kein Tracking – gespeichert wird nur deine Auswahl.
        Externe Inhalte wie Google Fonts und die Live-Vorschauen lade ich erst mit deiner Zustimmung.
        <a href="datenschutz.html#externe-inhalte">Mehr erfahren</a>
      </p>
      <div class="cookie-options">
        <label class="cookie-option is-locked">
          <input type="checkbox" checked disabled />
          <span class="cookie-switch" aria-hidden="true"></span>
          <span class="cookie-option-label">
            Notwendig
            <small>Immer aktiv – speichert deine Auswahl</small>
          </span>
        </label>
        <label class="cookie-option">
          <input type="checkbox" id="cookie-external" />
          <span class="cookie-switch" aria-hidden="true"></span>
          <span class="cookie-option-label">
            Externe Inhalte
            <small>Google Fonts, Live-Vorschauen der Projekte</small>
          </span>
        </label>
      </div>
    </div>
    <div class="cookie-actions">
      <button type="button" class="btn btn-secondary" data-consent="necessary">Nur notwendige</button>
      <button type="button" class="btn btn-primary" data-consent="save">Auswahl speichern</button>
    </div>
  </div>
`;

let banner = null;
let bannerOpen = false;
let closeTimer = null;

const syncBodySpace = () => {
  if (!banner) return;
  document.body.style.paddingBottom = bannerOpen ? `${banner.offsetHeight}px` : "";
};

const hideBanner = () => {
  if (!banner || !bannerOpen) return;
  bannerOpen = false;
  banner.classList.remove("is-open");
  syncBodySpace();
  window.clearTimeout(closeTimer);
  closeTimer = window.setTimeout(() => {
    if (!bannerOpen) banner.hidden = true;
  }, 320);
};

const openBanner = () => {
  if (!banner) return;
  const toggle = banner.querySelector("#cookie-external");
  const consent = readConsent();
  if (toggle) toggle.checked = consent ? consent.external === true : DEFAULT_EXTERNAL;

  window.clearTimeout(closeTimer);
  bannerOpen = true;
  banner.hidden = false;
  syncBodySpace();
  requestAnimationFrame(() => {
    if (!bannerOpen) return;
    banner.classList.add("is-open");
  });

  const primary = banner.querySelector("[data-consent='save']");
  if (primary) primary.focus({ preventScroll: true });
};

const saveConsent = () => {
  const toggle = banner ? banner.querySelector("#cookie-external") : null;
  const external = !!(toggle && toggle.checked);
  writeConsent(external);
  if (external) {
    loadFonts();
  } else {
    unloadFonts();
  }
  setPreviews(external);
  hideBanner();
};

const closestFrom = (target, selector) => {
  const el = target instanceof Element ? target : null;
  return el ? el.closest(selector) : null;
};

const init = () => {
  banner = document.createElement("div");
  banner.className = "cookie-banner";
  banner.id = "cookie-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-labelledby", "cookie-banner-title");
  banner.hidden = true;
  banner.innerHTML = bannerMarkup;
  document.body.appendChild(banner);

  if (externalAllowed()) {
    loadFonts();
    setPreviews(true);
  } else {
    setPreviews(false);
  }

  if (!readConsent()) openBanner();

  document.addEventListener("click", (event) => {
    if (closestFrom(event.target, "[data-preview-load]")) {
      const preview = closestFrom(event.target, ".live-preview");
      if (preview) setPreview(preview, true);
      return;
    }

    if (closestFrom(event.target, "[data-consent-open]")) {
      event.preventDefault();
      openBanner();
      return;
    }

    const action = closestFrom(event.target, "[data-consent]");
    if (action) {
      if (action.dataset.consent === "necessary") {
        const toggle = banner.querySelector("#cookie-external");
        if (toggle) toggle.checked = false;
      }
      saveConsent();
      return;
    }

    // Navigation und andere Bedienelemente sollen nicht durch den Hinweis
    // ausgebremst werden. Beim Verlassen des Banners gilt daher die
    // datensparsame Auswahl „nur notwendige“.
    if (bannerOpen && closestFrom(event.target, "a, button")) {
      writeConsent(false);
      unloadFonts();
      setPreviews(false);
      hideBanner();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && bannerOpen) hideBanner();
  });

  window.addEventListener("resize", () => {
    if (bannerOpen) syncBodySpace();
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
