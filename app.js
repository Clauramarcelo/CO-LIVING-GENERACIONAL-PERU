(() => {
  "use strict";

  // ✅ WhatsApp principal (N°2)
  const WHATSAPP_NUMBER = "51956896092";

  // Helpers
  const $ = (sel, root = document) => root.querySelector(sel);
  const safeText = (v) => (v == null ? "" : String(v));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const digitsOnly = (v) => safeText(v).replace(/[^\d]/g, "");
  const normalizePhone = (phone) => safeText(phone).trim().replace(/[^\d+]/g, "");

  function buildWhatsAppLink(number, message) {
    const n = digitsOnly(number);
    const text = encodeURIComponent(message || "");
    return `https://wa.me/${n}?text=${text}`;
  }

  // Data
  const ALL = Array.isArray(window.PROGRAMS) ? window.PROGRAMS : [];
  const PAGE_SIZE = 6;
  let shownCount = 0;

  // Favorites
  const STORAGE_KEY = "coliving_favorites_v1";
  function loadFavs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const ids = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(ids) ? ids : []);
    } catch {
      return new Set();
    }
  }
  function saveFavs(set) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  }
  const favs = loadFavs();

  // Elements
  const yearEl = $("#year");

  // Tabs
  const tabLinks = $("#tab-links");
  const tabAbout = $("#tab-about");
  const tabSignup = $("#tab-signup");
  const panelLinks = $("#panel-links");
  const panelAbout = $("#panel-about");
  const panelSignup = $("#panel-signup");

  // Programs
  const cardsEl = $("#cards");
  const resultsCountEl = $("#resultsCount");
  const btnMorePrograms = $("#btnMorePrograms");
  const emptyState = $("#emptyState");

  // Favorites
  const favoritesSection = $("#favoritesSection");
  const favoritesGrid = $("#favoritesGrid");
  const btnClearFavs = $("#btnClearFavs");

  // Quick actions
  const btnFocusPrograms = $("#btnFocusPrograms");
  const btnOpenAbout = $("#btnOpenAbout");

  // Font controls
  const btnFontDown = $("#btnFontDown");
  const btnFontUp = $("#btnFontUp");

  // Contact button
  const btnContactUs = $("#btnContactUs");

  // Signup
  const signupForm = $("#signupForm");
  const signupStatus = $("#signupStatus");

  function init() {
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    setupTabs();
    setupFontControls();
    setupQuickActions();
    setupContactButton();

    renderInitialPrograms();
    renderFavorites();

    btnMorePrograms?.addEventListener("click", () => renderNextPage());

    btnClearFavs?.addEventListener("click", () => {
      favs.clear();
      saveFavs(favs);
      renderFavorites();
      rerenderCardsKeepingCount();
    });

    setupSignup();
  }

  // Tabs
  function setTab(active) {
    const isPrograms = active === "programs";
    const isAbout = active === "about";
    const isSignup = active === "signup";

    tabLinks?.classList.toggle("is-active", isPrograms);
    tabLinks?.setAttribute("aria-selected", String(isPrograms));

    tabAbout?.classList.toggle("is-active", isAbout);
    tabAbout?.setAttribute("aria-selected", String(isAbout));

    tabSignup?.classList.toggle("is-active", isSignup);
    tabSignup?.setAttribute("aria-selected", String(isSignup));

    if (panelLinks) panelLinks.hidden = !isPrograms;
    if (panelAbout) panelAbout.hidden = !isAbout;
    if (panelSignup) panelSignup.hidden = !isSignup;

    $("#main")?.focus({ preventScroll: false });
  }

  function setupTabs() {
    tabLinks?.addEventListener("click", () => setTab("programs"));
    tabAbout?.addEventListener("click", () => setTab("about"));
    tabSignup?.addEventListener("click", () => setTab("signup"));

    const tabs = [tabLinks, tabAbout, tabSignup].filter(Boolean);
    tabs.forEach((t) => {
      t.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        const idx = tabs.indexOf(t);
        const next = e.key === "ArrowRight"
          ? tabs[(idx + 1) % tabs.length]
          : tabs[(idx - 1 + tabs.length) % tabs.length];
        next.focus();
        next.click();
      });
    });
  }

  // Font controls
  function setupFontControls() {
    const key = "coliving_font_size_v1";
    let size = 16;

    try {
      const stored = Number(localStorage.getItem(key));
      if (!Number.isNaN(stored)) size = clamp(stored, 14, 22);
    } catch {}

    applyFontSize(size);

    btnFontDown?.addEventListener("click", () => {
      size = clamp(size - 1, 14, 22);
      applyFontSize(size);
      localStorage.setItem(key, String(size));
    });

    btnFontUp?.addEventListener("click", () => {
      size = clamp(size + 1, 14, 22);
      applyFontSize(size);
      localStorage.setItem(key, String(size));
    });
  }

  function applyFontSize(px) {
    document.documentElement.style.setProperty("--fs", `${px}px`);
  }

  // Quick actions
  function setupQuickActions() {
    btnFocusPrograms?.addEventListener("click", () => {
      setTab("programs");
      $("#programsTitle")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    btnOpenAbout?.addEventListener("click", () => setTab("about"));
  }

  // Contact button -> WhatsApp
  function setupContactButton() {
    if (!btnContactUs) return;
    btnContactUs.addEventListener("click", () => {
      const msg = "Hola, me interesa CO‑LIVING Generacional y quisiera más información. ✅";
      window.open(buildWhatsAppLink(WHATSAPP_NUMBER, msg), "_blank", "noopener,noreferrer");
    });
  }

  // Programs render
  function renderInitialPrograms() {
    shownCount = 0;
    if (cardsEl) cardsEl.innerHTML = "";

    if (!ALL.length) {
      if (resultsCountEl) resultsCountEl.textContent = "No hay programas cargados.";
      if (emptyState) emptyState.hidden = false;
      if (btnMorePrograms) btnMorePrograms.hidden = true;
      return;
    }

    if (emptyState) emptyState.hidden = true;
    if (btnMorePrograms) btnMorePrograms.hidden = false;

    renderNextPage(true);
    updateCount();
  }

  function renderNextPage() {
    const remaining = ALL.length - shownCount;
    const take = Math.min(PAGE_SIZE, remaining);
    const slice = ALL.slice(shownCount, shownCount + take);

    slice.forEach(p => cardsEl?.appendChild(makeCard(p)));
    shownCount += take;

    updateCount();
    if (btnMorePrograms) btnMorePrograms.hidden = shownCount >= ALL.length;
  }

  function updateCount() {
    const total = ALL.length;
    const shown = Math.min(shownCount, total);
    if (resultsCountEl) resultsCountEl.textContent = `${shown} de ${total} programas mostrados`;
  }

  function rerenderCardsKeepingCount() {
    const keep = shownCount;
    if (!cardsEl) return;

    cardsEl.innerHTML = "";
    shownCount = 0;

    ALL.slice(0, keep).forEach(p => cardsEl.appendChild(makeCard(p)));
    shownCount = keep;

    updateCount();
    if (btnMorePrograms) btnMorePrograms.hidden = shownCount >= ALL.length;
  }

  function makeCard(program) {
    const p = program || {};
    const id = safeText(p.id);
    const title = safeText(p.title) || "Sin título";
    const desc = safeText(p.description) || "Sin descripción.";
    const category = safeText(p.category || "Programa");
    const url = safeText(p.url);
    const location = safeText(p.location);
    const tags = Array.isArray(p.tags) ? p.tags : [];

    const card = document.createElement("article");
    card.className = "card";
    card.dataset.id = id;

    const top = document.createElement("div");
    top.className = "card__top";

    const h = document.createElement("h4");
    h.className = "card__title";
    h.textContent = title;

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = category;

    top.appendChild(h);
    top.appendChild(badge);

    const body = document.createElement("div");
    body.className = "card__body";

    const pDesc = document.createElement("p");
    pDesc.className = "card__desc";
    pDesc.textContent = desc;

    const meta = document.createElement("div");
    meta.className = "card__meta";

    if (location) {
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = location;
      meta.appendChild(pill);
    }

    tags.slice(0, 3).forEach(t => {
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = `#${safeText(t)}`;
      meta.appendChild(pill);
    });

    body.appendChild(pDesc);
    if (meta.childNodes.length) body.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "card__actions";

    if (url) {
      const aOpen = document.createElement("a");
      aOpen.className = "actionLink";
      aOpen.href = url;
      aOpen.target = "_blank";
      aOpen.rel = "noopener noreferrer";
      aOpen.textContent = "Abrir";
      actions.appendChild(aOpen);
    }

    const favBtn = document.createElement("button");
    favBtn.className = "starBtn";
    favBtn.type = "button";
    favBtn.setAttribute("aria-label", "Guardar en favoritos");

    const isOn = favs.has(id);
    favBtn.textContent = isOn ? "★" : "☆";
    favBtn.classList.toggle("is-on", isOn);

    favBtn.addEventListener("click", () => {
      if (!id) return;
      if (favs.has(id)) favs.delete(id);
      else favs.add(id);

      saveFavs(favs);
      renderFavorites();
      rerenderCardsKeepingCount();
    });

    actions.appendChild(favBtn);

    card.appendChild(top);
    card.appendChild(body);
    card.appendChild(actions);

    return card;
  }

  // Favorites
  function renderFavorites() {
    if (!favoritesSection || !favoritesGrid) return;

    favoritesGrid.innerHTML = "";
    const favList = ALL.filter(p => favs.has(String(p.id)));

    if (!favList.length) {
      favoritesSection.hidden = true;
      return;
    }

    favoritesSection.hidden = false;
    favList.forEach(p => favoritesGrid.appendChild(makeCard(p)));
  }

  // Signup -> WhatsApp
  function setStatus(message, type = "ok") {
    if (!signupStatus) return;
    signupStatus.textContent = message || "";
    signupStatus.classList.remove("is-ok", "is-bad");
    signupStatus.classList.add(type === "ok" ? "is-ok" : "is-bad");
  }

  function setupSignup() {
    if (!signupForm) return;

    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const fullName = $("#fullName")?.value?.trim() || "";
      const ageRaw = $("#age")?.value || "";
      const interest = $("#interest")?.value || "";
      const phoneRaw = $("#phone")?.value || "";

      const age = Number(ageRaw);
      const phone = normalizePhone(phoneRaw);

      if (fullName.length < 5) return setStatus("Por favor escribe Apellidos y nombres completos.", "bad");
      if (!Number.isFinite(age) || age < 18 || age > 120) return setStatus("Por favor ingresa una edad válida (18 a 120).", "bad");
      if (!interest) return setStatus("Selecciona un interés.", "bad");
      if (!phone || phone.replace(/\D/g, "").length < 8) return setStatus("Ingresa un número de celular válido.", "bad");

      const msg =
`📌 *Nueva inscripción - CO‑LIVING Generacional*
👤 *Apellidos y nombres:* ${fullName}
🎂 *Años:* ${age}
⭐ *Interés:* ${interest}
📱 *Celular:* ${phone}

Enviado desde la web ✅`;

      window.open(buildWhatsAppLink(WHATSAPP_NUMBER, msg), "_blank", "noopener,noreferrer");
      setStatus("Abriendo WhatsApp… 👍 (envía el mensaje desde WhatsApp)", "ok");

      signupForm.reset();
    });

    signupForm.addEventListener("reset", () => setStatus("", "ok"));
  }

  document.addEventListener("DOMContentLoaded", init);
})();
