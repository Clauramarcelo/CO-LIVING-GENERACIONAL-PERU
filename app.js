const $ = (sel) => document.querySelector(sel);

const state = {
  theme: localStorage.getItem("theme") || "dark"
};

const data = window.LINKS_DATA ?? [];

function setTheme(theme){
  const t = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("theme", t);
  state.theme = t;

  // Texto del botón (simple y claro)
  $("#btnTheme").innerHTML = (t === "light")
    ? `🌙 <span class="hide-sm">Tema</span>`
    : `☀️ <span class="hide-sm">Tema</span>`;
}

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

function cardTemplate(item){
  const title = escapeHTML(item.title);
  const desc = escapeHTML(item.description);
  const provider = escapeHTML(item.provider || "");
  const location = escapeHTML(item.location || "");
  const mode = escapeHTML(item.mode || "Información");

  const tags = (item.interests || [])
    .slice(0, 6)
    .map(t => `<span class="tag">${escapeHTML(t)}</span>`)
    .join("");

  const host = safeHostname(item.url);

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

      <div class="tags" aria-label="Etiquetas">
        ${tags}
      </div>

      <div class="card__actions">
        <a class="btn"
           href="${item.url}"
           target="_blank"
           rel="noopener noreferrer"
           aria-label="Abrir enlace en una nueva pestaña: ${title}">
          Abrir enlace →
        </a>
        <span class="small">${escapeHTML(host)}</span>
      </div>
    </article>
  `;
}

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

function setupTabs(){
  const tabLinks = $("#tab-links");
  const tabAbout = $("#tab-about");
  const panelLinks = $("#panel-links");
  const panelAbout = $("#panel-about");

  const activate = (which) => {
    const isLinks = which === "links";

    tabLinks.classList.toggle("is-active", isLinks);
    tabAbout.classList.toggle("is-active", !isLinks);

    tabLinks.setAttribute("aria-selected", isLinks ? "true" : "false");
    tabAbout.setAttribute("aria-selected", !isLinks ? "true" : "false");

    panelLinks.classList.toggle("is-active", isLinks);
    panelAbout.classList.toggle("is-active", !isLinks);

    // accesibilidad: mover foco al contenido
    $("#main").focus();
  };

  tabLinks.addEventListener("click", () => activate("links"));
  tabAbout.addEventListener("click", () => activate("about"));

  // navegación por teclado (izquierda/derecha)
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

function setupTheme(){
  setTheme(state.theme);
  $("#btnTheme").addEventListener("click", () => {
    setTheme(state.theme === "light" ? "dark" : "light");
  });
}

function init(){
  $("#year").textContent = new Date().getFullYear();
  setupTabs();
  setupTheme();
  render();
}

init();
