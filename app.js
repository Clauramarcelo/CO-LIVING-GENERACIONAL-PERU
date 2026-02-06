const $ = (sel) => document.querySelector(sel);
const data = window.LINKS_DATA ?? [];

/* Utilidades */
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

/* Botones de contacto por card */
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

/* Template de card */
function cardTemplate(item){
  const title = escapeHTML(item.title);
  const desc = escapeHTML(item.description);
  const provider = escapeHTML(item.provider || "");
  const location = escapeHTML(item.location || "");
  const mode = escapeHTML(item.mode || "Información");
  const tags = (item.interests || []).slice(0, 6).map(t => `<span class="tag">${escapeHTML(t)}</span>`).join("");
  const host = escapeHTML(safeHostname(item.url));
  const url = escapeHTML(item.url);

  return `
    <article class="card">
      <div class="card__top">
        <div>
          <h3 class="card__title">${title}</h3>
          <div class="small">${provider}${provider && location ? " • " : ""}${location}</div>
        </div>
        <span class="badge">${mode}</span>
      </div>

      <p class="card__desc">${desc}</p>

      <div class="tags" aria-label="Etiquetas">${tags}</div>

      <div class="card__actions">
        <div class="actionsLeft">
          <a class="btn btn--primary" href="${url}" target="_blank" rel="noopener noreferrer">Abrir enlace →</a>
          ${contactButtons(item)}
        </div>

        <span class="small">${host}</span>
      </div>
    </article>
  `;
}

/* Render */
function render(){
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
}

/* Tabs */
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

  // teclado: flechas izq/der
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

/* Botones rápidos de la bienvenida */
function setupWelcomeButtons(){
  $("#btnFocusPrograms")?.addEventListener("click", () => {
    setActiveTab("links");
    // Enfoca el inicio de tarjetas sin obligar scroll; si ya está visible, no “molesta”
    $("#programsTitle")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#btnOpenAbout")?.addEventListener("click", () => {
    setActiveTab("about");
  });
}

/* Init */
function init(){
  $("#year").textContent = new Date().getFullYear();
  setupTabs();
  setupWelcomeButtons();
  render();
}

init();
