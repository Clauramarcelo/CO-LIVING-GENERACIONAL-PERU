const $ = (sel) => document.querySelector(sel);
const data = window.LINKS_DATA ?? [];

const state = {
  showExtra: false,
  favorites: new Set(JSON.parse(localStorage.getItem("favorites") || "[]")),
  fontScale: Number(localStorage.getItem("fontScale") || "1")
};

/* ===== Accesibilidad: tamaño de letra ===== */
function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

function applyFontScale(){
  state.fontScale = clamp(state.fontScale, 0.9, 1.3);
  document.documentElement.style.fontSize = `${state.fontScale * 100}%`;
  localStorage.setItem("fontScale", String(state.fontScale));
}

/* ===== Utilidades ===== */
function escapeHTML(str){
  return (str ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function safeHostname(url){
  try { return new URL(url).hostname; } catch { return ""; }
}

function onlyDigits(str){
  return (str ?? "").toString().replace(/\D+/g, "");
}

function makeWhatsAppLink(number, text){
  const phone = onlyDigits(number);
  if (!phone) return "";
  const msg = encodeURIComponent(text || "Hola, quisiera información por favor.");
  return `https://wa.me/${phone}?text=${msg}`;
}

function makeTelLink(number){
  const raw = (number ?? "").toString().trim();
  if (!raw) return "";
  const tel = raw.startsWith("+") ? raw : `+${onlyDigits(raw)}`;
  return `tel:${tel}`;
}

/* ===== Orden ===== */
function sortPrograms(items){
  const collator = new Intl.Collator("es", { sensitivity: "base" });
  return [...items].sort((a, b) => {
    const tierA = (a.tier === "core") ? 0 : 1;
    const tierB = (b.tier === "core") ? 0 : 1;
    if (tierA !== tierB) return tierA - tierB;

    const hiA = a.highlight ? 0 : 1;
    const hiB = b.highlight ? 0 : 1;
    if (hiA !== hiB) return hiA - hiB;

    return collator.compare(a.title || "", b.title || "");
  });
}

/* ===== Favoritos ===== */
function saveFavorites(){
  localStorage.setItem("favorites", JSON.stringify(Array.from(state.favorites)));
}

function toggleFavorite(id){
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);
  saveFavorites();
  renderAll();
}

/* ===== Tabs ===== */
function setActiveTab(which){
  const tabLinks = $("#tab-links");
  const tabAbout = $("#tab-about");
  const panelLinks = $("#panel-links");
  const panelAbout = $("#panel-about");

  const isLinks = which === "links";

  tabLinks.classList.toggle("is-active", isLinks);
  tabAbout.classList.toggle("is-active", !isLinks);

  tabLinks.setAttribute("aria-selected", isLinks ? "true" : "false");
  tabAbout.setAttribute("aria-selected", !isLinks ? "true" : "false");

  panelLinks.classList.toggle("is-active", isLinks);
  panelAbout.classList.toggle("is-active", !isLinks);

  $("#main").focus();
}

function setupTabs(){
  const tabLinks = $("#tab-links");
  const tabAbout = $("#tab-about");

  tabLinks.addEventListener("click", () => setActiveTab("links"));
  tabAbout.addEventListener("click", () => setActiveTab("about"));

  const tabs = [tabLinks, tabAbout];
  tabs.forEach((t, idx) => {
    t.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const next = (idx + dir + tabs.length) % tabs.length;
        tabs[next].focus();
        tabs[next].click();
      }
    });
  });
}

/* ===== Contact buttons ===== */
function contactButtons(item){
  const btns = [];

  if (item.whatsapp){
    const wa = makeWhatsAppLink(item.whatsapp, item.whatsappText);
    if (wa){
      btns.push(`<a class="btn btn--whatsapp" href="${wa}" target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>`);
    }
  }

  if (item.phone){
    const tel = makeTelLink(item.phone);
    if (tel){
      btns.push(`<a class="btn btn--call" href="${tel}">📞 Llamar</a>`);
    }
  }

  return btns.join("");
}

/* ===== Card template ===== */
function cardTemplate(item){
  const title = escapeHTML(item.title);
  const desc = escapeHTML(item.description);
  const provider = escapeHTML(item.provider || "");
  const location = escapeHTML(item.location || "");
  const mode = escapeHTML(item.mode || "Información");
  const host = escapeHTML(safeHostname(item.url));
  const url = escapeHTML(item.url);
  const trust = escapeHTML(item.trust || "");

  const tags = (item.interests || [])
    .slice(0, 6)
    .map(t => `<span class="tag">${escapeHTML(t)}</span>`)
    .join("");

  const isFav = state.favorites.has(item.id);
  const favClass = isFav ? "favBtn is-on" : "favBtn";
  const favLabel = isFav ? "Quitar de favoritos" : "Guardar en favoritos";
  const badgeStart = item.highlight ? `<span class="badge badge--start">Empieza aquí</span>` : "";
  const badgeTrust = trust ? `<span class="badge badge--trust">${trust}</span>` : "";

  return `
    <article class="card">
      <div class="card__top">
        <div>
          <h3 class="card__title">${title}</h3>
          <div class="small">${provider}${provider && location ? " • " : ""}${location}</div>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
          ${badgeStart}
          ${badgeTrust}
          <span class="badge">${mode}</span>
        </div>
      </div>

      <p class="card__desc">${desc}</p>

      <div class="tags" aria-label="Etiquetas">${tags}</div>

      <div class="card__actions">
        <div class="actionsLeft">
          <a class="btn btn--ghost" href="${url}" target="_blank" rel="noopener noreferrer">Abrir enlace →</a>
          ${contactButtons(item)}
          <button class="${favClass}" type="button" data-fav="${escapeHTML(item.id)}" aria-label="${favLabel}">
            ${isFav ? "★" : "☆"}
          </button>
        </div>

        <span class="small">${host}</span>
      </div>
    </article>
  `;
}

/* ===== Render helpers ===== */
function getVisiblePrograms(){
  const filtered = data.filter(p => p.tier === "core" || (state.showExtra && p.tier === "extra"));
  return sortPrograms(filtered);
}

function wireFavButtons(scope = document){
  scope.querySelectorAll("[data-fav]").forEach(btn => {
    btn.addEventListener("click", () => toggleFavorite(btn.getAttribute("data-fav")));
  });
}

function renderPrograms(){
  const cards = $("#cards");
  const empty = $("#emptyState");
  const count = $("#resultsCount");

  const visible = getVisiblePrograms();

  if (!visible.length){
    cards.innerHTML = "";
    empty.hidden = false;
    count.textContent = "0 programas";
    return;
  }

  cards.innerHTML = visible.map(cardTemplate).join("");
  empty.hidden = true;
  count.textContent = `${visible.length} programa(s)`;

  wireFavButtons(cards);
}

function renderFavorites(){
  const section = $("#favoritesSection");
  const grid = $("#favoritesGrid");

  const favItems = data.filter(p => state.favorites.has(p.id));
  const ordered = sortPrograms(favItems);

  if (!ordered.length){
    section.hidden = true;
    grid.innerHTML = "";
    return;
  }

  section.hidden = false;
  grid.innerHTML = ordered.map(cardTemplate).join("");
  wireFavButtons(grid);
}

function renderRecommended(){
  const section = $("#recommendedSection");
  const grid = $("#recommendedGrid");

  const recommended = data.filter(p => p.tier === "core" && p.highlight);
  const ordered = sortPrograms(recommended);

  if (!ordered.length){
    section.hidden = true;
    grid.innerHTML = "";
    return;
  }

  section.hidden = false;
  grid.innerHTML = ordered.map(cardTemplate).join("");
  wireFavButtons(grid);
}

function renderMoreButton(){
  const btn = $("#btnMorePrograms");
  const extraCount = data.filter(p => p.tier === "extra").length;
  btn.textContent = state.showExtra ? "Mostrar menos" : `Más programas (${extraCount})`;
}

/* ===== “IA” simple por interés ===== */
function normalizeText(str){
  return (str || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function scoreProgram(program, selected){
  const tags = (program.interests || []).map(normalizeText);
  const title = normalizeText(program.title);
  const desc = normalizeText(program.description);
  const trust = normalizeText(program.trust || "");
  const sel = normalizeText(selected);

  let score = 0;

  if (sel === "ayuda") {
    if (program.highlight) score += 8;
    if (trust.includes("oficial")) score += 3;
    if (program.tier === "core") score += 2;
    return score;
  }

  if (tags.includes(sel)) score += 8;
  if (tags.some(t => t.includes(sel) || sel.includes(t))) score += 4;
  if (title.includes(sel)) score += 3;
  if (desc.includes(sel)) score += 2;

  if (program.highlight) score += 2;
  if (trust.includes("oficial")) score += 1;

  if (sel === "bienestar") {
    if (tags.includes("comunidad")) score += 3;
    if (tags.includes("adulto mayor")) score += 2;
  }
  if (sel === "empleo") {
    if (tags.includes("orientación") || tags.includes("cv")) score += 2;
    if (tags.includes("reinserción laboral")) score += 2;
  }
  if (sel === "capacitación") {
    if (tags.includes("formación")) score += 2;
  }

  return score;
}

function getRecommendations(selected, limit = 5){
  const visible = getVisiblePrograms();
  const scored = visible
    .map(p => ({ p, s: scoreProgram(p, selected) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s);

  if (!scored.length){
    return visible.filter(p => p.tier === "core" && p.highlight).slice(0, Math.min(3, limit));
  }

  return scored.slice(0, limit).map(x => x.p);
}

function renderForYou(selected){
  const section = $("#forYouSection");
  const grid = $("#forYouGrid");
  const subtitle = $("#forYouSubtitle");

  const recs = getRecommendations(selected, 5);

  subtitle.textContent = (selected === "Ayuda")
    ? "Elegimos buenos primeros pasos para comenzar con calma."
    : `Perfecto. Aquí tienes ideas para dar ese paso con tranquilidad: ${selected}.`;

  section.hidden = false;
  grid.innerHTML = recs.map(cardTemplate).join("");
  wireFavButtons(grid);

  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setupAssistant(){
  document.querySelectorAll(".assistantBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const interest = btn.getAttribute("data-interest");
      renderForYou(interest);
    });
  });

  $("#btnClearForYou")?.addEventListener("click", () => {
    $("#forYouSection").hidden = true;
    document.querySelector(".assistant")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

/* ===== Top button ===== */
function setupTopButton(){
  const btn = $("#btnTop");
  if (!btn) return;

  const onScroll = () => { btn.hidden = !(window.scrollY > 380); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/* ===== Suggest (mailto) ===== */
function setupSuggest(){
  const dlg = $("#suggestDialog");
  const openBtn = $("#btnSuggestOpen");
  const closeBtn = $("#btnSuggestClose");
  const form = $("#suggestForm");

  if (!dlg || !openBtn || !form) return;

  openBtn.addEventListener("click", () => {
    if (typeof dlg.showModal === "function") dlg.showModal();
    else alert("Tu navegador no soporta esta ventana. Puedes escribirnos al correo de contacto.");
  });

  closeBtn?.addEventListener("click", () => dlg.close());

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = $("#sName").value.trim();
    const url = $("#sUrl").value.trim();
    const note = $("#sNote").value.trim();

    const to = "contacto@colivinggeneracional.pe";
    const subject = encodeURIComponent("Sugerencia de programa para CO‑LIVING Generacional");
    const body = encodeURIComponent(
      `Hola,\n\nQuiero sugerir este programa:\n\n` +
      `Nombre: ${name}\n` +
      `Enlace: ${url}\n` +
      (note ? `Comentario: ${note}\n` : "") +
      `\nGracias.`
    );

    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    dlg.close();
    form.reset();
  });
}

/* ===== Setup UI ===== */
function setupWelcomeButtons(){
  $("#btnFocusPrograms")?.addEventListener("click", () => {
    setActiveTab("links");
    $("#programsTitle")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#btnOpenAbout")?.addEventListener("click", () => setActiveTab("about"));
}

function setupMorePrograms(){
  $("#btnMorePrograms")?.addEventListener("click", () => {
    state.showExtra = !state.showExtra;
    renderAll();
    if (state.showExtra) $("#programsTitle")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function setupClearFavs(){
  $("#btnClearFavs")?.addEventListener("click", () => {
    state.favorites.clear();
    saveFavorites();
    renderAll();
  });
}

function setupFontControls(){
  applyFontScale();

  $("#btnFontUp")?.addEventListener("click", () => {
    state.fontScale += 0.05;
    applyFontScale();
  });

  $("#btnFontDown")?.addEventListener("click", () => {
    state.fontScale -= 0.05;
    applyFontScale();
  });
}

function renderAll(){
  renderRecommended();
  renderFavorites();
  renderPrograms();
  renderMoreButton();
}

/* ===== Init ===== */
function init(){
  $("#year").textContent = new Date().getFullYear();

  setupTabs();
  setupWelcomeButtons();
  setupMorePrograms();
  setupClearFavs();
  setupFontControls();
  setupTopButton();
  setupSuggest();
  setupAssistant();

  renderAll();
}

init();
