const $ = (sel) => document.querySelector(sel);
const data = window.LINKS_DATA ?? [];

const state = {
  favorites: new Set(JSON.parse(localStorage.getItem("favorites") || "[]")),
  fontScale: Number(localStorage.getItem("fontScale") || "1")
};

/* ===== Tamaño de letra ===== */
function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
function applyFontScale(){
  state.fontScale = clamp(state.fontScale, 0.9, 1.3);
  document.documentElement.style.fontSize = `${state.fontScale * 100}%`;
  localStorage.setItem("fontScale", String(state.fontScale));
}

/* ===== Utilidades ===== */
function escapeHTML(str){
  return (str ?? "").toString()
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function safeHostname(url){ try { return new URL(url).hostname; } catch { return ""; } }

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
  const tabs = {
    links:  { tab: $("#tab-links"),  panel: $("#panel-links") },
    signup: { tab: $("#tab-signup"), panel: $("#panel-signup") },
    about:  { tab: $("#tab-about"),  panel: $("#panel-about") }
  };

  Object.keys(tabs).forEach(k => {
    const on = (k === which);
    tabs[k].tab.classList.toggle("is-active", on);
    tabs[k].panel.classList.toggle("is-active", on);
    tabs[k].tab.setAttribute("aria-selected", on ? "true" : "false");
  });

  $("#main")?.focus();
}

function setupTabs(){
  $("#tab-links")?.addEventListener("click", () => setActiveTab("links"));
  $("#tab-signup")?.addEventListener("click", () => setActiveTab("signup"));
  $("#tab-about")?.addEventListener("click", () => setActiveTab("about"));
}

/* ===== Botón Ver programas (único en bienvenida) ===== */
function setupWelcomeButton(){
  $("#btnFocusPrograms")?.addEventListener("click", () => {
    setActiveTab("links");
    $("#programsTitle")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

/* ===== Confirmación inscripción ===== */
function setupConfirmSignup(){
  const btn = $("#btnConfirmSignup");
  const msg = $("#confirmMsg");
  if (!btn || !msg) return;

  btn.addEventListener("click", () => {
    msg.hidden = false;
    msg.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

/* ===== WhatsApp share del Sheet ===== */
function setupWhatsappShare(){
  const sheetBtn = $("#sheetLinkBtn");
  const waBtn = $("#whatsShareBtn");
  if (!sheetBtn || !waBtn) return;

  const sheetUrl = sheetBtn.getAttribute("href");
  const text = `Lista de inscritos CO‑LIVING Generacional: ${sheetUrl}`;
  waBtn.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
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

  const isFav = state.favorites.has(item.id);
  const favClass = isFav ? "favBtn is-on" : "favBtn";
  const favLabel = isFav ? "Quitar de favoritos" : "Guardar en favoritos";
  const badgeTrust = trust ? `<span class="badge badge--trust">${trust}</span>` : "";

  return `
    <article class="card">
      <div class="card__top">
        <div>
          <h3 class="card__title">${title}</h3>
          <div class="small">${provider}${provider && location ? " • " : ""}${location}</div>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
          ${badgeTrust}
          <span class="badge">${mode}</span>
        </div>
      </div>

      <p class="card__desc">${desc}</p>

      <div class="card__actions">
        <div class="actionsLeft">
          <a class="btn btn--ghost" href="${url}" target="_blank" rel="noopener">Abrir enlace →</a>
          <button class="${favClass}" type="button" data-fav="${escapeHTML(item.id)}" aria-label="${favLabel}">
            ${isFav ? "★" : "☆"}
          </button>
        </div>
        <span class="small">${host}</span>
      </div>
    </article>
  `;
}

/* ===== Render ===== */
function wireFavButtons(scope = document){
  scope.querySelectorAll("[data-fav]").forEach(btn => {
    btn.addEventListener("click", () => toggleFavorite(btn.getAttribute("data-fav")));
  });
}

function renderPrograms(){
  const cards = $("#cards");
  const empty = $("#emptyState");
  const count = $("#resultsCount");

  if (!data.length){
    cards.innerHTML = "";
    empty.hidden = false;
    count.textContent = "0 programas";
    return;
  }

  cards.innerHTML = data.map(cardTemplate).join("");
  empty.hidden = true;
  count.textContent = `${data.length} programa(s)`;
  wireFavButtons(cards);
}

function renderFavorites(){
  const section = $("#favoritesSection");
  const grid = $("#favoritesGrid");

  const favItems = data.filter(p => state.favorites.has(p.id));
  if (!favItems.length){
    section.hidden = true;
    grid.innerHTML = "";
    return;
  }

  section.hidden = false;
  grid.innerHTML = favItems.map(cardTemplate).join("");
  wireFavButtons(grid);
}

/* ===== Limpiar favoritos ===== */
function setupClearFavs(){
  $("#btnClearFavs")?.addEventListener("click", () => {
    state.favorites.clear();
    saveFavorites();
    renderAll();
  });
}

/* ===== A+/A- ===== */
function setupFontControls(){
  applyFontScale();
  $("#btnFontUp")?.addEventListener("click", () => { state.fontScale += 0.05; applyFontScale(); });
  $("#btnFontDown")?.addEventListener("click", () => { state.fontScale -= 0.05; applyFontScale(); });
}

/* ===== Botón Arriba ===== */
function setupTopButton(){
  const btn = $("#btnTop");
  if (!btn) return;

  const onScroll = () => { btn.hidden = !(window.scrollY > 380); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

function renderAll(){
  renderFavorites();
  renderPrograms();
}

/* ===== Init ===== */
function init(){
  $("#year").textContent = new Date().getFullYear();

  setupTabs();
  setupWelcomeButton();
  setupClearFavs();
  setupFontControls();
  setupTopButton();

  setupConfirmSignup();
  setupWhatsappShare();

  renderAll();
}

init();
