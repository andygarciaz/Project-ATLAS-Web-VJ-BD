// Añadir en asistencia.html: <script src="../scripts/solicitudes-vacaciones-atlas.js"></script>
(async function () {
  const panel=document.createElement('section');
  panel.className='panel mt-4';
  panel.innerHTML=`<h5>Solicitar vacaciones (SQL Server)</h5>
    <p class="text-secondary small">Solicitud pendiente de revisión. Las fechas y días hábiles son provisionales; los festivos dependen de la política de RH.</p>
    <form id="atlas-sol-vac" class="d-grid gap-2" style="max-width:600px">
      <label>Fecha de inicio <input class="form-control" type="date" name="inicio" required></label>
      <label>Fecha de fin <input class="form-control" type="date" name="fin" required></label>
      <label>Comentarios (opcional) <textarea class="form-control" name="comentarios" maxlength="255"></textarea></label>
      <button class="btn btn-primary" type="submit">Enviar solicitud</button>
    </form><p id="atlas-sol-estado" role="status" class="mt-2"></p>
    <h6 class="mt-3">Mis solicitudes</h6><div id="atlas-sol-lista">Cargando...</div>`;
  const root=document.querySelector('main .p-4')||document.querySelector('main');
  if(!root) return;
  root.append(panel);
  const state=panel.querySelector('#atlas-sol-estado');
  const list=panel.querySelector('#atlas-sol-lista');
  async function cargar(){
    try{
      const r=await fetch('/api/vacaciones/solicitudes',{credentials:'same-origin',cache:'no-store'});
      const d=await r.json();
      if(!r.ok) throw Error(d.mensaje||'No se pudieron consultar solicitudes');
      list.replaceChildren();
      if(!d.solicitudes?.length){list.textContent='Aún no tienes solicitudes.';return;}
      const ul=document.createElement('ul');ul.className='list-group';
      for(const x of d.solicitudes){const li=document.createElement('li');li.className='list-group-item';
        li.textContent=`Solicitud #${x.idSolicitud}: ${x.inicio} a ${x.fin} — ${x.estado} (${x.dias??'por revisar'} días)`;ul.append(li);}
      list.append(ul);
    }catch(e){list.textContent=e.message;}
  }
  panel.querySelector('form').addEventListener('submit',async e=>{
    e.preventDefault();
    const formulario = e.currentTarget;
    const f=new FormData(e.currentTarget);const button=e.currentTarget.querySelector('button');button.disabled=true;
    state.textContent='Enviando...';
    try{
      const r=await fetch('/api/vacaciones/solicitudes',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(f))});
      const d=await r.json();if(!r.ok)throw Error(d.mensaje||'No se pudo registrar');
      state.textContent=`Solicitud #${d.idSolicitud} creada como pendiente. Días provisionales: ${d.diasProvisionales}.`;
      formulario.reset();await cargar();
    }catch(err){state.textContent=err.message;}finally{button.disabled=false;}
  });
  await cargar();
})();
