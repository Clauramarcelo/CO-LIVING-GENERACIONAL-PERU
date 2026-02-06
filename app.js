const $ = (sel) => document.querySelector(sel);
const data = window.LINKS_DATA ?? [];

const state = {
  showExtra: false,
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
function onlyDigits(str){ return (str ?? "").toString().replace(/\D+/g, ""); }
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

  $("#main").focus();
}

function setupTabs(){
  $("#tab-links").addEventListener("click", () => setActiveTab("links"));
  $("#tab-signup").addEventListener("click", () => setActiveTab("signup"));
  $("#tab-about").addEventListener("click", () => setActiveTab("about"));
}

/* ===== Botones rápidos ===== */
function setupQuickButtons(){
  $("#btnFocusPrograms")?.addEventListener("click", () => {
    setActiveTab("links");
    $("#programsTitle")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("#btnOpenSignup")?.addEventListener("click", () => setActiveTab("signup"));
  $("#btnOpenAbout")?.addEventListener("click", () => setActiveTab("about"));
}

/* ===== Contact buttons ===== */
function contactButtons(item){
  const btns = [];
  if (item.whatsapp){
    const wa = makeWhatsAppLink(item.whatsapp, item.whatsappText);
    if (wa) btns.push(`<a class="btn btn--whatsapp" href="${wa}" target="_blank" rel="noopener">💬 WhatsApp</a>`);
  }
  if (item.phone){
    const tel = makeTelLink(item.phone);
    if (tel) btns.push(`<a class="btn btn--call" href="${tel}">📞 Llamar</a>`);
  }
  return btns.join("");
}

/* ===== Card template (links correctos) ===== */
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
          <a class="btn btn--primary" href="${url}" target="_blank" rel="noopener">Abrir enlace →</a>
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

/* ===== Asistente (recomendador) ===== */
function normalizeText(str){
  return (str || "").toString().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
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
    ? "Te mostramos opciones sencillas para empezar con calma."
    : `Opciones relacionadas a: ${selected}.`;

  section.hidden = false;
  grid.innerHTML = recs.map(cardTemplate).join("");
  wireFavButtons(grid);
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}
function setupAssistant(){
  document.querySelectorAll(".assistantBtn").forEach(btn => {
    btn.addEventListener("click", () => renderForYou(btn.getAttribute("data-interest")));
  });
  $("#btnClearForYou")?.addEventListener("click", () => {
    $("#forYouSection").hidden = true;
    document.querySelector(".assistant")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

/* ===== Más programas ===== */
function setupMorePrograms(){
  $("#btnMorePrograms")?.addEventListener("click", () => {
    state.showExtra = !state.showExtra;
    renderAll();
  });
}

/* ===== A+/A- ===== */
function setupFontControls(){
  applyFontScale();
  $("#btnFontUp")?.addEventListener("click", () => { state.fontScale += 0.05; applyFontScale(); });
  $("#btnFontDown")?.addEventListener("click", () => { state.fontScale -= 0.05; applyFontScale(); });
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

/* ===== Render all ===== */
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
  setupQuickButtons();
  setupAssistant();
  setupMorePrograms();
  setupFontControls();
  setupWhatsappShare();

  renderAll();
}

init();
