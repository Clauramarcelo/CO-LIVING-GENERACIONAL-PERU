/**
 * app.js
 * Lógica principal: tabs, render de tarjetas, favoritos, paginación simple, accesibilidad y tamaño de letra.
 */

(() => {
  "use strict";

  // =========================
  // Helpers
  // =========================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const safeText = (v) => (v == null ? "" : String(v));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function onlyDigits(str) {
    return safeText(str).replace(/[^\d]/g, "");
  }

  function waLink(number, text = "") {
    const n = onlyDigits(number);
    if (!n) return "";
    const msg = encodeURIComponent(text);
    return `https://wa.me/${n}${text ? `?text=${msg}` : ""}`;
  }

  // =========================
  // State
  // =========================
  const ALL = Array.isArray(window.PROGRAMS) ? window.PROGRAMS : [];
  const PAGE_SIZE = 6;

  let shownCount = 0;

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

  // =========================
  // Elements
  // =========================
  const yearEl = $("#year");

  const tabLinks = $("#tab-links");
  const tabAbout = $("#tab-about");
  const panelLinks = $("#panel-links");
  const panelAbout = $("#panel-about");

  const cardsEl = $("#cards");
  const resultsCountEl = $("#resultsCount");
  const btnMorePrograms = $("#btnMorePrograms");
  const emptyState = $("#emptyState");

  const favoritesSection = $("#favoritesSection");
  const favoritesGrid = $("#favoritesGrid");
  const btnClearFavs = $("#btnClearFavs");

  const btnFocusPrograms = $("#btnFocusPrograms");
  const btnOpenAbout = $("#btnOpenAbout");

  const btnFontDown = $("#btnFontDown");
  const btnFontUp = $("#btnFontUp");

  // =========================
  // Init
  // =========================
  function init() {
    // Año
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Tabs
    setupTabs();

    // Fuente
    setupFontControls();

    // Botones rápidos
    setupQuickActions();

    // Render inicial
    renderInitial();
    renderFavorites();

    // Botón más
    btnMorePrograms?.addEventListener("click", () => {
      renderNextPage();
    });

    // Clear favs
    btnClearFavs?.addEventListener("click", () => {
      favs.clear();
      saveFavs(favs);
      renderFavorites();
      rerenderCards(); // actualiza estrellas
    });
  }

  // =========================
  // Tabs (accesible)
  // =========================
  function setTab(active) {
    const isPrograms = active === "programs";

    tabLinks.classList.toggle("is-active", isPrograms);
    tabLinks.setAttribute("aria-selected", String(isPrograms));

    tabAbout.classList.toggle("is-active", !isPrograms);
    tabAbout.setAttribute("aria-selected", String(!isPrograms));

    // Panels
    panelLinks.hidden = !isPrograms;
    panelLinks.classList.toggle("is-active", isPrograms);

    panelAbout.hidden = isPrograms;
    panelAbout.classList.toggle("is-active", !isPrograms);

    // Mover foco al main para accesibilidad
    const main = $("#main");
    main?.focus({ preventScroll: false });
  }

  function setupTabs() {
    tabLinks?.addEventListener("click", () => setTab("programs"));
    tabAbout?.addEventListener("click", () => setTab("about"));

    // Navegación con teclado (izq/der)
    const tabs = [tabLinks, tabAbout].filter(Boolean);
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

  // =========================
  // Font controls
  // =========================
  function setupFontControls() {
    // Leer valor guardado
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

  // =========================
  // Quick actions
  // =========================
  function setupQuickActions() {
    btnFocusPrograms?.addEventListener("click", () => {
      setTab("programs");
      // Desplazar a la sección de programas
      $("#programsTitle")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    btnOpenAbout?.addEventListener("click", () => {
      setTab("about");
    });
  }

  // =========================
  // Rendering
  // =========================
  function renderInitial() {
    shownCount = 0;

    cardsEl.innerHTML = "";
    if (!ALL.length) {
      resultsCountEl.textContent = "No hay programas cargados.";
      emptyState.hidden = false;
      btnMorePrograms.hidden = true;
      return;
    }

    emptyState.hidden = true;
    btnMorePrograms.hidden = false;

    renderNextPage(true);
  }

  function renderNextPage(isFirst = false) {
    const remaining = ALL.length - shownCount;
    const take = Math.min(PAGE_SIZE, remaining);
    const slice = ALL.slice(shownCount, shownCount + take);

    slice.forEach(p => cardsEl.appendChild(makeCard(p)));
    shownCount += take;

    updateCount();

    // Si ya no hay más, ocultar el botón
    if (shownCount >= ALL.length) {
      btnMorePrograms.hidden = true;
    } else {
      btnMorePrograms.hidden = false;
    }

    // Mejor UX: en la primera carga, mantener al usuario arriba
    if (!isFirst) {
      // pequeño scroll para mostrar que cargó más (opcional)
      // btnMorePrograms.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function updateCount() {
    const total = ALL.length;
    const shown = Math.min(shownCount, total);

    resultsCountEl.textContent = `${shown} de ${total} programas mostrados`;
  }

  function rerenderCards() {
    // Re-render conservando cantidad mostrada
    const keep = shownCount;
    cardsEl.innerHTML = "";
    shownCount = 0;

    const toShow = ALL.slice(0, keep);
    toShow.forEach(p => cardsEl.appendChild(makeCard(p)));
    shownCount = keep;

    updateCount();
    btnMorePrograms.hidden = shownCount >= ALL.length;
  }

  function makeCard(program) {
    const p = program || {};
    const id = safeText(p.id);
    const title = safeText(p.title);
    const desc = safeText(p.description);
    const category = safeText(p.category || "Programa");
    const url = safeText(p.url);
    const location = safeText(p.location);
    const tags = Array.isArray(p.tags) ? p.tags : [];

    const phone = onlyDigits(p.phone);
    const whatsapp = onlyDigits(p.whatsapp);

    const card = document.createElement("article");
    card.className = "card";
    card.setAttribute("data-id", id);

    // Top
    const top = document.createElement("div");
    top.className = "card__top";

    const titleWrap = document.createElement("div");
    const h = document.createElement("h4");
    h.className = "card__title";
    h.textContent = title || "Sin título";

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = category || "Programa";

    titleWrap.appendChild(h);
    top.appendChild(titleWrap);
    top.appendChild(badge);

    // Body
    const body = document.createElement("div");
    body.className = "card__body";

    const pDesc = document.createElement("p");
    pDesc.className = "card__desc";
    pDesc.textContent = desc || "Sin descripción.";

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

    // Actions
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

    if (whatsapp) {
      const aWa = document.createElement("a");
      aWa.className = "actionLink";
      aWa.href = waLink(whatsapp, `Hola, quisiera información sobre: ${title}`);
      aWa.target = "_blank";
      aWa.rel = "noopener noreferrer";
      aWa.textContent = "WhatsApp";
      actions.appendChild(aWa);
    }

    if (phone) {
      const aTel = document.createElement("a");
      aTel.className = "actionLink";
      aTel.href = `tel:${phone}`;
      aTel.textContent = "Llamar";
      actions.appendChild(aTel);
    }

    // Favorito
    const favBtn = document.createElement("button");
    favBtn.className = "starBtn";
    favBtn.type = "button";
    favBtn.setAttribute("aria-label", "Guardar en favoritos");
    favBtn.textContent = favs.has(id) ? "★" : "☆";
    favBtn.classList.toggle("is-on", favs.has(id));

    favBtn.addEventListener("click", () => {
      if (!id) return;

      if (favs.has(id)) favs.delete(id);
      else favs.add(id);

      saveFavs(favs);
      renderFavorites();
      rerenderCards();
    });

    actions.appendChild(favBtn);

    // Ensamblar
    card.appendChild(top);
    card.appendChild(body);
    card.appendChild(actions);

    return card;
  }

  // =========================
  // Favorites
  // =========================
  function renderFavorites() {
    if (!favoritesSection || !favoritesGrid) return;

    favoritesGrid.innerHTML = "";

    const favList = ALL.filter(p => favs.has(String(p.id)));

    if (!favList.length) {
      favoritesSection.hidden = true;
      return;
    }

    favoritesSection.hidden = false;

    favList.forEach(p => {
      const card = makeCard(p);
      favoritesGrid.appendChild(card);
    });
  }

  // =========================
  // Run
  // =========================
  document.addEventListener("DOMContentLoaded", init);
})();
