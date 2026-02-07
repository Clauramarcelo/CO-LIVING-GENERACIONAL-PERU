/**
 * app.js
 * Tabs, render de cards, favoritos, botón “Más programas”, contador, año y control de fuente.
 */

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);

  const safeText = (v) => (v == null ? "" : String(v));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  // Estado
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

  // Elementos
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

  function init() {
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    setupTabs();
    setupFontControls();
    setupQuickActions();

    renderInitial();
    renderFavorites();

    btnMorePrograms?.addEventListener("click", () => renderNextPage(false));

    btnClearFavs?.addEventListener("click", () => {
      favs.clear();
      saveFavs(favs);
      renderFavorites();
      rerenderCards();
    });
  }

  // Tabs
  function setTab(active) {
    const isPrograms = active === "programs";

    tabLinks.classList.toggle("is-active", isPrograms);
    tabLinks.setAttribute("aria-selected", String(isPrograms));

    tabAbout.classList.toggle("is-active", !isPrograms);
    tabAbout.setAttribute("aria-selected", String(!isPrograms));

    panelLinks.hidden = !isPrograms;
    panelLinks.classList.toggle("is-active", isPrograms);

    panelAbout.hidden = isPrograms;
    panelAbout.classList.toggle("is-active", !isPrograms);

    $("#main")?.focus({ preventScroll: false });
  }

  function setupTabs() {
    tabLinks?.addEventListener("click", () => setTab("programs"));
    tabAbout?.addEventListener("click", () => setTab("about"));

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

  // Fuente
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

  // Acciones rápidas
  function setupQuickActions() {
    btnFocusPrograms?.addEventListener("click", () => {
      setTab("programs");
      $("#programsTitle")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    btnOpenAbout?.addEventListener("click", () => setTab("about"));
  }

  // Render
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

  function renderNextPage(isFirst) {
    const remaining = ALL.length - shownCount;
    const take = Math.min(PAGE_SIZE, remaining);
    const slice = ALL.slice(shownCount, shownCount + take);

    slice.forEach(p => cardsEl.appendChild(makeCard(p)));
    shownCount += take;

    updateCount();
    btnMorePrograms.hidden = shownCount >= ALL.length;
  }

  function updateCount() {
    const total = ALL.length;
    const shown = Math.min(shownCount, total);
    resultsCountEl.textContent = `${shown} de ${total} programas mostrados`;
  }

  function rerenderCards() {
    const keep = shownCount;
    cardsEl.innerHTML = "";
    shownCount = 0;

    ALL.slice(0, keep).forEach(p => cardsEl.appendChild(makeCard(p)));
    shownCount = keep;

    updateCount();
    btnMorePrograms.hidden = shownCount >= ALL.length;
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
    card.setAttribute("data-id", id);

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
      rerenderCards();
    });

    actions.appendChild(favBtn);

    card.appendChild(top);
    card.appendChild(body);
    card.appendChild(actions);

    return card;
  }

  // Favoritos
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

  document.addEventListener("DOMContentLoaded", init);
})();
