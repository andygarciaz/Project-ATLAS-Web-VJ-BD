// Panel adicional independiente: evita modificar el administrador antiguo basado en localStorage.
(async function () {
  const destino = document.getElementById('tab-noticias');
  if (!destino) return;

  let usuario;
  try {
    const respuesta = await fetch('/api/sesion', { credentials: 'same-origin' });
    const datos = await respuesta.json();
    usuario = datos.usuario;
  } catch (error) {
    console.warn('No se pudo verificar el rol para publicar noticias:', error);
    return;
  }
  if (!['rh', 'gerencia'].includes(usuario?.rol)) return;

  const panel = document.createElement('section');
  panel.className = 'panel mb-4';
  panel.innerHTML = `
    <h6 class="fw-bold mb-3">Publicar comunicado (SQL Server)</h6>
    <form id="atlasFormNoticia">
      <div class="mb-3">
        <label class="form-label" for="atlasTituloNoticia">Titulo</label>
        <input class="form-control" id="atlasTituloNoticia" maxlength="150" required>
      </div>
      <div class="mb-3">
        <label class="form-label" for="atlasContenidoNoticia">Contenido</label>
        <textarea class="form-control" id="atlasContenidoNoticia" maxlength="2000" rows="3" required></textarea>
      </div>
      <button class="btn btn-primary btn-portal" type="submit">Guardar y publicar</button>
      <p id="atlasEstadoNoticia" class="small mt-2 mb-0" role="status" aria-live="polite"></p>
    </form>`;
  destino.insertBefore(panel, destino.firstChild);

  const form = document.getElementById('atlasFormNoticia');
  const estado = document.getElementById('atlasEstadoNoticia');
  const boton = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    boton.disabled = true;
    estado.className = 'small mt-2 mb-0 text-secondary';
    estado.textContent = 'Guardando en SQL Server...';
    try {
      const respuesta = await fetch('/api/noticias', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: document.getElementById('atlasTituloNoticia').value.trim(),
          contenido: document.getElementById('atlasContenidoNoticia').value.trim()
        })
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.mensaje || `Error HTTP ${respuesta.status}`);
      estado.className = 'small mt-2 mb-0 text-success';
      estado.textContent = `Noticia guardada correctamente (ID ${datos.id}). Actualiza la pagina para ver el feed.`;
      form.reset();
    } catch (error) {
      estado.className = 'small mt-2 mb-0 text-danger';
      estado.textContent = error.message;
    } finally {
      boton.disabled = false;
    }
  });
})();
