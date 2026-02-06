const cards = document.getElementById("cards");
const data = window.LINKS_DATA;

/* Render tarjetas */
function render(){
  cards.innerHTML = "";
  data.forEach(item=>{
    cards.innerHTML += `
      <article class="card">
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <a class="btn" href="${item.url}" target="_blank">
          Ver información
        </a>
      </article>
    `;
  });
}

/* Tabs */
const tabs = {
  "tab-programas":"panel-programas",
  "tab-inscripcion":"panel-inscripcion",
  "tab-nosotros":"panel-nosotros"
};

Object.keys(tabs).forEach(tab=>{
  document.getElementById(tab).onclick = () =>{
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("is-active"));
    document.querySelectorAll(".panel").forEach(p=>p.classList.remove("is-active"));

    document.getElementById(tab).classList.add("is-active");
    document.getElementById(tabs[tab]).classList.add("is-active");
  };
});

/* Bot de voz */
document.getElementById("btnVoice").addEventListener("click",()=>{
  const msg = new SpeechSynthesisUtterance(
    "Bienvenido a Co Living Generacional. " +
    "Este espacio fue creado para acompañarte con respeto. " +
    "Aquí encontrarás programas confiables que pueden ayudarte " +
    "en tu búsqueda de nuevas oportunidades."
  );
  msg.lang = "es-ES";
  msg.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(msg);
});

render();

