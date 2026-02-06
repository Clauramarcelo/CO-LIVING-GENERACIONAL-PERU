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

/* ===== ORDEN AUTOMÁTICO =====
   - CORE antes que EXTRA
   - "Empieza aquí" primero
   - Luego alfabético
*/
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
      btns.push(
        `<a class="btn btn--whatsapp" href="${wa}" target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>`
      );
    }
  }

  if (item.phone){
    const tel = makeTelLink(item.phone);
    if (tel){
      btns.push(
        `<a class="btn btn--call" href="${tel}">📞 Llamar</a>`
      );
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
  const tags = (item.interests || [])
    .slice(0, 6)
    .map(t => `<span class="tag">${escapeHTML(t)}</span>`)
    .join("");

  const isFav = state.favorites.has(item.id);
  const favClass = isFav ? "favBtn is-on" : "favBtn";
  const favLabel = isFav ? "Quitar de favoritos" : "Guardar en favoritos";
  const badgeStart = item.highlight ? `<span class="badge badge--start">Empieza aquí</span>` : "";

  return `
    <article class="card">
      <div class="card__top">
        <div>
          <h3 class="card__title">${title}</h3>
          <div class="small">${provider}${provider && location ? " • " : ""}${location}</div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          ${badgeStart}
          <span class="badge">${mode}</span>
        </div>
      </div>

      <p class="card__desc">${desc}</p>

      <div class="tags" aria-label="Etiquetas">${tags}</div>

      <div class="card__actions">
        <div class="actionsLeft">
          <a class="btn btn--primary" href="${url}" target="_blank" rel="noopener noreferrer">Abrir enlace →</a>
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

/* ===== Render ===== */
function getVisiblePrograms(){
  const filtered = data.filter(p => p.tier === "core" || (state.showExtra && p.tier === "extra"));
  return sortPrograms(filtered);
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

  document.querySelectorAll("[data-fav]").forEach(btn => {
    btn.addEventListener("click", () => toggleFavorite(btn.getAttribute("data-fav")));
  });
}

function renderFavorites(){
  const section = $("#favoritesSection");
  const grid = $("#favoritesGrid");

  const favItems = data.filter(p => state.favorites.has(p.id));
  const orderedFavs = sortPrograms(favItems);

  if (!orderedFavs.length){
    section.hidden = true;
    grid.innerHTML = "";
    return;
  }

  section.hidden = false;
  grid.innerHTML = orderedFavs.map(cardTemplate).join("");

  grid.querySelectorAll("[data-fav]").forEach(btn => {
    btn.addEventListener("click", () => toggleFavorite(btn.getAttribute("data-fav")));
  });
}

function renderMoreButton(){
  const btn = $("#btnMorePrograms");
  const extraCount = data.filter(p => p.tier === "extra").length;

  btn.textContent = state.showExtra
    ? "Mostrar menos"
    : `Más programas (${extraCount})`;
}

function renderAll(){
  renderFavorites();
  renderPrograms();
  renderMoreButton();
}

/* ===== Setup UI ===== */
function setupWelcomeButtons(){
  $("#btnFocusPrograms")?.addEventListener("click", () => {
    setActiveTab("links");
    $("#programsTitle")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#btnOpenAbout")?.addEventListener("click", () => {
    setActiveTab("about");
  });
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

/* ===== Init ===== */
function init(){
  $("#year").textContent = new Date().getFullYear();
  setupTabs();
  setupWelcomeButtons();
  setupMorePrograms();
  setupClearFavs();
  setupFontControls();
  renderAll();
}

init();
