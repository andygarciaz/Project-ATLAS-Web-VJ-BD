let YO = "Usuario";

async function cargarIdentidadComunidad() {
    try {
        const respuesta = await fetch("/api/sesion");

        if (!respuesta.ok) {
            throw new Error("No hay sesión activa");
        }

        const datos = await respuesta.json();

        if (!datos.ok || !datos.usuario?.nombre) {
            throw new Error("No se encontró el usuario");
        }

        YO = datos.usuario.nombre;

    } catch (error) {
        console.error("Error al obtener identidad:", error);
    }
}

cargarIdentidadComunidad();

const cumpleHoy = { nombre: "Laura Gómez", depto: "Recursos Humanos" };

const proximosCumples = [
    { nombre: "Roberto Fuentes",  depto: "Operaciones", dias: 3 },
    { nombre: "Sofía Pacheco",    depto: "Ventas",      dias: 7 },
    { nombre: "Miguel Hernández", depto: "Tecnología",  dias: 12 },
];

const otrasPersonas = ["Ana Ríos", "Jorge Palacios"];

const felicitaciones = [];
async function cargarFelicitacionesSQL() {
    try {
        const res = await fetch('/api/felicitaciones', { credentials:'same-origin', cache:'no-store' });
        const datos = await res.json();
        if (!res.ok || !datos.ok) throw new Error(datos.mensaje || `HTTP ${res.status}`);
        felicitaciones.splice(0,felicitaciones.length,...datos.felicitaciones.map(f=>({
            de:f.de, para:f.para, cuando:String(f.fecha||'').replace('T',' '), mensaje:f.mensaje
        })));
        renderMuro();
    }catch(e){ console.error('Felicitaciones SQL:',e); mostrarErrorFelicitaciones('No fue posible cargar las felicitaciones almacenadas.'); }
}
function mostrarErrorFelicitaciones(mensaje) {
    let aviso=document.getElementById('atlasErrorFelicitaciones');
    if(!aviso){ aviso=document.createElement('p'); aviso.id='atlasErrorFelicitaciones'; aviso.className='small text-danger';
      document.getElementById('muroFelicitaciones').before(aviso); }
    aviso.textContent=mensaje;
}
let noticias = [
    { tipo: "Evento", clase: "tag-evento", titulo: "Evento de integración Q3 — confirma tu asistencia", fecha: "01 Sep 2026", abierta: true,
      cuerpo: "El próximo 13 de septiembre realizaremos nuestro evento trimestral de integración en las instalaciones de Eslabón. Habrá dinámicas, comida y actividades de equipo. Confirma tu participación antes del 5 de septiembre." },
    { tipo: "Comunicado", clase: "tag-comunicado", titulo: "Nueva política de trabajo híbrido — vigente a partir de octubre", fecha: "28 Ago 2026", abierta: false,
      cuerpo: "A partir de octubre se aplicará el nuevo esquema de trabajo híbrido. Consulta con tu supervisor los días de asistencia presencial que te corresponden." },
    { tipo: "Reconocimiento", clase: "tag-reconocimiento", titulo: "Reconocimiento al equipo de Tecnología — Q2 2026", fecha: "15 Ago 2026", abierta: false,
      cuerpo: "Felicitamos al equipo de Tecnología por el cumplimiento de sus objetivos durante el segundo trimestre de 2026." },
    { tipo: "Capacitación", clase: "tag-capacitacion-rosa", titulo: "Apertura de inscripciones — programa de capacitación Q4", fecha: "10 Ago 2026", abierta: false,
      cuerpo: "Ya están abiertas las inscripciones para los cursos del último trimestre del año. Regístrate desde tu portal antes de que se llenen los lugares." },
    { tipo: "Beneficio", clase: "tag-beneficio", titulo: "Beneficio escolar 2026-2027 — apoyo de útiles para hijos de empleados", fecha: "05 Ago 2026", abierta: false,
      cuerpo: "Los empleados con hijos en edad escolar pueden solicitar el apoyo de útiles. Entrega tu solicitud en Recursos Humanos." },
];

let fechasEspeciales = [
    { titulo: "Aniversario de la empresa", fecha: "15 Sep 2026", texto: "12 años de Desarrollo Eslabón. Celebramos juntos." },
    { titulo: "Día de la Independencia",   fecha: "16 Sep 2026", texto: "Día de descanso oficial. Que disfrutes el día." },
    { titulo: "Evento de integración Q3",  fecha: "13 Sep 2026", texto: "Evento presencial. Confirma tu asistencia antes del 5 de septiembre." },
    { titulo: "Cierre de nómina Sep",      fecha: "25 Sep 2026", texto: "Fecha límite de captura de incidencias." },
];

const iniciales = (n) => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const modalEl = document.getElementById("modalFelicitacion");
const modalFel = new bootstrap.Modal(modalEl);
const destinatario = document.getElementById("destinatario");
const mensajeFel = document.getElementById("mensajeFel");
const btnEnviarFel = document.getElementById("btnEnviarFel");

[cumpleHoy.nombre, ...proximosCumples.map((p) => p.nombre), ...otrasPersonas].forEach((n) => {
    destinatario.add(new Option(n, n));
});

function abrirFelicitar(nombre) {
    destinatario.value = nombre || cumpleHoy.nombre;
    mensajeFel.value = "";
    btnEnviarFel.disabled = true;
    modalFel.show();
}

mensajeFel.addEventListener("input", () => {
    btnEnviarFel.disabled = mensajeFel.value.trim() === "";
});

btnEnviarFel.addEventListener('click', async () => {
    const mensaje=mensajeFel.value.trim();
    if (!mensaje || YO==='Usuario') { mostrarErrorFelicitaciones('Primero carga tu identidad de sesión.');return; }
    btnEnviarFel.disabled=true;
    try {
       const res=await fetch('/api/felicitaciones',{
          method:'POST',credentials:'same-origin',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({para:destinatario.value,mensaje})
       });
       const respuesta=await res.json();
       if(!res.ok || !respuesta.ok) throw new Error(respuesta.mensaje||`HTTP ${res.status}`);
       await cargarFelicitacionesSQL();
       modalFel.hide();
    }catch(e){mostrarErrorFelicitaciones('No se guardó la felicitación: '+e.message);}
    finally{btnEnviarFel.disabled=false;}
});

document.getElementById("btnNuevaFel").addEventListener("click", () => abrirFelicitar());
document.getElementById("btnFelicitarHoy").addEventListener("click", () => abrirFelicitar(cumpleHoy.nombre));

document.getElementById("cumpleHoyTitulo").textContent = `${cumpleHoy.nombre} cumple años hoy`;
document.getElementById("cumpleHoyDepto").textContent = cumpleHoy.depto;

const proximosCont = document.getElementById("proximosCumples");
proximosCumples.forEach((p) => {
    const col = document.createElement("div");
    col.className = "col-md-4";
    col.innerHTML = `
        <div class="panel">
            <div class="d-flex align-items-center gap-3 mb-3">
                <div class="avatar-circle avatar-lg">${iniciales(p.nombre)}</div>
                <div>
                    <div class="fw-semibold">${p.nombre}</div>
                    <small class="text-secondary">${p.depto}</small>
                </div>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <span class="pill-dias">En ${p.dias} días</span>
                <button class="btn btn-link btn-sm p-0 enlace-portal">Felicitar</button>
            </div>
        </div>
    `;
    col.querySelector("button").addEventListener("click", () => abrirFelicitar(p.nombre));
    proximosCont.appendChild(col);
});

const muro = document.getElementById("muroFelicitaciones");

function renderMuro() {
    muro.innerHTML = "";
    felicitaciones.forEach((f) => {
        const card = document.createElement("div");
        card.className = "panel mb-3";
        card.innerHTML = `
            <div class="d-flex align-items-center gap-2 mb-2">
                <div class="avatar-circle avatar-sm">${esc(f.de[0])}</div>
                <span class="small fw-semibold">${esc(f.de)} → ${esc(f.para)}</span>
                <small class="text-secondary">· ${esc(f.cuando)}</small>
            </div>
            <div class="text-secondary">${esc(f.mensaje)}</div>
        `;
        muro.appendChild(card);
    });
}
renderMuro();
cargarFelicitacionesSQL();
const listaNoticias = document.getElementById("listaNoticias");

function renderNoticias() {
    listaNoticias.innerHTML = "";
    noticias.forEach((n) => {
        const card = document.createElement("div");
        card.className = "panel mb-3";

        const fila = document.createElement("div");
        fila.className = "d-flex align-items-center gap-3";

        const tag = document.createElement("span");
        tag.className = "tag-doc " + (n.clase || "tag-comunicado");
        tag.textContent = n.tipo || "Noticia";

        const titulo = document.createElement("span");
        titulo.className = "fw-semibold flex-grow-1";
        titulo.textContent = n.titulo;

        const fecha = document.createElement("small");
        fecha.className = "text-secondary numero text-nowrap";
        fecha.textContent = n.fecha || "";

        const boton = document.createElement("button");
        boton.className = "btn btn-link btn-sm p-0 enlace-portal";
        boton.textContent = n.abierta ? "Cerrar" : "Leer";
        boton.addEventListener("click", () => {
            n.abierta = !n.abierta;
            renderNoticias();
        });

        fila.append(tag, titulo, fecha, boton);
        card.appendChild(fila);

        if (n.abierta) {
            const cuerpo = document.createElement("p");
            cuerpo.className = "text-secondary mt-3 mb-0";
            cuerpo.textContent = n.cuerpo;
            card.appendChild(cuerpo);
        }
        listaNoticias.appendChild(card);
    });
}
renderNoticias();

const listaFechas = document.getElementById("listaFechas");

function renderFechas() {
    listaFechas.innerHTML = "";
    fechasEspeciales.forEach((f) => {
        const col = document.createElement("div");
        col.className = "col-md-6";

        const panel = document.createElement("div");
        panel.className = "panel h-100";

        const cab = document.createElement("div");
        cab.className = "d-flex justify-content-between align-items-center mb-2";
        const t = document.createElement("span");
        t.className = "fw-semibold";
        t.textContent = f.titulo;
        const d = document.createElement("span");
        d.className = "event-date numero";
        d.textContent = f.fecha || "";
        cab.append(t, d);

        const texto = document.createElement("div");
        texto.className = "text-secondary";
        texto.textContent = f.texto;

        panel.append(cab, texto);
        col.appendChild(panel);
        listaFechas.appendChild(col);
    });
}
renderFechas();

function fechaBonita(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return iso || "";
    const [a, m, d] = iso.split("-");
    const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${d} ${meses[Number(m) - 1]} ${a}`;
}

(async function cargarDelServidor() {
    try {
        const lista = await api('/noticias');

        if (Array.isArray(lista) && lista.length) {
            noticias = lista.map((n, i) => ({
                tipo: "Noticia",
                clase: "tag-comunicado",
                titulo: n.titulo,
                fecha: fechaBonita(String(n.fecha || "").slice(0, 10)),
                abierta: i === 0,
                cuerpo: n.contenido || n.resumen || "",
            }));
            renderNoticias();
        }
    } catch (e) {
        console.error("No se pudieron cargar las noticias:", e);
    }
})();
