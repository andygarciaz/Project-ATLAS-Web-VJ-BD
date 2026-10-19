
const datosPersonales = [
    ["CURP", "MECC890412HDFRRL09"],
    ["RFC", "MECC890412AB3"],
    ["Fecha de nacimiento", "12 Abr 1989"],
    ["Género", "Masculino"],
    ["Estado civil", "Casado"],
    ["Tipo de sangre", "O+"],
    ["Licencia de manejo", "B — Vigente al 2028"],
    ["Teléfono celular", "55 1234 5678"],
    ["Teléfono de casa", "55 9876 5432"],
    ["Teléfono de recado", "55 1111 2222"],
];

const datosDireccion = [
    ["Calle", "Av. Insurgentes"],
    ["Número exterior", "1428"],
    ["Colonia", "Del Valle"],
    ["Municipio", "Benito Juárez"],
    ["Estado", "Ciudad de México"],
    ["CP", "03100"],
    ["País", "México"],
    ["Celular", "55 1234 5678"],
];

const datosSeguridad = [
    ["NSS (IMSS)", "54321098765"],
    ["Número de afiliación IMSS", "54321098765-0001"],
    ["Tipo de cobertura", "Familiar (titular + beneficiarios)"],
    ["Clínica asignada", "UMF No. 20"],
    ["Fecha de alta IMSS", "15 Mar 2021"],
    ["ISSSTE", "No aplica"],
    ["INFONAVIT", "Activo"],
    ["Subcuenta vivienda", "$28,800.00"],
];

function renderFilas(idContenedor, filas) {
    const cont = document.getElementById(idContenedor);
    filas.forEach(([etiqueta, valor]) => {
        const fila = document.createElement("div");
        fila.className = "fila-dato";
        fila.innerHTML = `<span>${etiqueta}</span><span>${valor}</span>`;
        cont.appendChild(fila);
    });
}


const seccionesPerfil = [
    "datosPersonales",
    "datosDireccion",
    "datosSeguridad"
];

seccionesPerfil.forEach(id => {
    const contenedor = document.getElementById(id);

    if (contenedor) {
        contenedor.textContent =
            "Información pendiente de vinculación con un empleado.";
        contenedor.classList.add("text-secondary");
    }
});

const tiposDoc = [
        { id: "ine", nombre: "INE / Credencial de elector",
        campos: ["Nombre completo", "CURP", "Fecha de nacimiento", "Género", "Calle", "Colonia", "CP"] },
        { id: "domicilio", nombre: "Comprobante de domicilio",
        campos: ["Calle", "Número exterior", "Colonia", "Municipio", "Estado", "CP", "País"] },
        { id: "acta", nombre: "Acta de nacimiento",
        campos: ["Nombre completo", "Fecha de nacimiento", "Género", "CURP", "Estado"] },
];

const MAX_MB = 10;
const EXTENSIONES = ["jpg", "jpeg", "png", "pdf"];

const modalEl = document.getElementById("modalActualizacion");
const modalAct = new bootstrap.Modal(modalEl);
const tiposDocCont = document.getElementById("tiposDoc");
const camposAuto = document.getElementById("camposAuto");
const dropzone = document.getElementById("dropzone");
const dropzoneContenido = document.getElementById("dropzoneContenido");
const archivoInput = document.getElementById("archivoInput");
const errorArchivo = document.getElementById("errorArchivo");
const accionesSolicitud = document.getElementById("accionesSolicitud");
const avisoPerfil = document.getElementById("avisoPerfil");

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const HTML_DROPZONE_VACIA = `
    <i class="bi bi-upload fs-3 text-secondary"></i>
    <div class="fw-medium mt-2">Arrastra o haz clic para subir tu documento</div>
    <small class="text-secondary">JPG, PNG o PDF — máx 10 MB</small>
`;

let tipoSeleccionado = "domicilio";
let archivo = null;

function renderTipos() {
    tiposDocCont.innerHTML = "";
    tiposDoc.forEach((t) => {
        const col = document.createElement("div");
        col.className = "col-4";
        col.innerHTML = `<button type="button" class="opcion-doc w-100 ${t.id === tipoSeleccionado ? "activo" : ""}">${t.nombre}</button>`;
        col.querySelector("button").addEventListener("click", () => {
            tipoSeleccionado = t.id;
            renderTipos();
        });
        tiposDocCont.appendChild(col);
    });

    const actual = tiposDoc.find((t) => t.id === tipoSeleccionado);
    camposAuto.innerHTML = actual.campos.map((c) => `<span class="campo-auto">${c}</span>`).join("");
}

const formatoTamano = (bytes) =>
    bytes >= 1024 * 1024 ? (bytes / (1024 * 1024)).toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB";

function mostrarError(texto) {
    errorArchivo.textContent = texto;
    errorArchivo.classList.toggle("d-none", !texto);
}

function reiniciarArchivo() {
    archivo = null;
    archivoInput.value = "";
    dropzone.classList.remove("con-archivo");
    dropzoneContenido.innerHTML = HTML_DROPZONE_VACIA;
    accionesSolicitud.classList.add("d-none");
    accionesSolicitud.classList.remove("d-flex");
    mostrarError("");
}

function recibirArchivo(f) {
    mostrarError("");
    if (!f) return;

    const ext = f.name.split(".").pop().toLowerCase();
    if (!EXTENSIONES.includes(ext)) {
        mostrarError("Formato no permitido. Sube un archivo JPG, PNG o PDF.");
        return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
        mostrarError(`El archivo pesa más de ${MAX_MB} MB.`);
        return;
    }

    archivo = f;
    dropzone.classList.add("con-archivo");
    dropzoneContenido.innerHTML = `
        <i class="bi ${ext === "pdf" ? "bi-file-earmark-pdf" : "bi-file-earmark-image"} fs-3 texto-portal"></i>
        <div class="fw-medium mt-2">${esc(f.name)}</div>
        <small class="text-secondary">${formatoTamano(f.size)} — haz clic para cambiar el archivo</small>
    `;
    accionesSolicitud.classList.remove("d-none");
    accionesSolicitud.classList.add("d-flex");
}
dropzone.addEventListener("click", () => archivoInput.click());
dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); archivoInput.click(); }
});
archivoInput.addEventListener("change", () => recibirArchivo(archivoInput.files[0]));

["dragenter", "dragover"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add("arrastrando"); })
);
["dragleave", "drop"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove("arrastrando"); })
);
dropzone.addEventListener("drop", (e) => recibirArchivo(e.dataTransfer.files[0]));

modalEl.addEventListener("show.bs.modal", () => {
    tipoSeleccionado = "domicilio";
    renderTipos();
    reiniciarArchivo();
});

document.getElementById("btnEnviarSolicitud").addEventListener("click", () => {
    const tipo = tiposDoc.find((t) => t.id === tipoSeleccionado).nombre;
    modalAct.hide();

    avisoPerfil.textContent = `Solicitud enviada con tu ${tipo.toLowerCase()}. Recursos Humanos revisará el documento y actualizará tus datos.`;
    avisoPerfil.classList.remove("d-none");
    setTimeout(() => avisoPerfil.classList.add("d-none"), 6000);
});

renderTipos();
reiniciarArchivo();