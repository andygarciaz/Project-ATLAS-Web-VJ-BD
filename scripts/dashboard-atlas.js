// Sustituye información ficticia por sesión/perfil real y marca métricas sin datos.
(async () => {
  const contenido = document.querySelector('.main-content > .p-4');
  if (!contenido) return;
  const titulo = contenido.querySelector('h2');
  const fechaElem = contenido.querySelector('p.text-secondary.mb-1');
  const resumen = contenido.querySelector('h2 + p');
  const tarjeta = document.querySelector('.sidebar .mt-4.pt-3.border-top');
  const stats = [...contenido.querySelectorAll('.card-stat')];
  const notif = contenido.querySelector('.notif-list');
  const eventos = [...contenido.querySelectorAll('.panel')].find(el=>el.querySelector('h6')?.textContent.includes('Próximos eventos'));
  const poner = (el,txt) => { if (el) el.textContent=txt; };
  poner(fechaElem,new Intl.DateTimeFormat('es-MX',{dateStyle:'full'}).format(new Date()));
  poner(titulo,'Bienvenido/a');
  poner(resumen,'Consultando información laboral...');
  for(const stat of stats) {
    poner(stat.querySelector('.stat-value'),'Sin datos');
    const detalle=stat.querySelector('small:last-of-type');
    if(detalle) detalle.textContent='Pendiente de integración';
  }
  if(notif) notif.innerHTML='<li class="text-secondary">Notificaciones no conectadas todavía a SQL Server.</li>';
  if(eventos){const ul=eventos.querySelector('ul');if(ul) ul.innerHTML='<li class="text-secondary">Eventos pendientes de integración.</li>';}
  try {
    const [sesRes,perRes,vacRes] = await Promise.all([
      fetch('/api/sesion',{credentials:'same-origin',cache:'no-store'}),
      fetch('/api/perfil',{credentials:'same-origin',cache:'no-store'}),
      fetch(`/api/vacaciones/saldo?anio=${new Date().getFullYear()}`,{credentials:'same-origin',cache:'no-store'})
    ]);
    if(sesRes.status===401) { location.href='/paginas/index.html';return; }
    const ses=await sesRes.json();
    if(!sesRes.ok || !ses.ok || !ses.usuario) throw new Error('Sin sesión válida');
    const u=ses.usuario;
    const primerNombre=(u.nombre||'Usuario').trim().split(/\s+/)[0];
    poner(titulo,`Bienvenido/a, ${primerNombre}`);
    if(tarjeta) {
      poner(tarjeta.querySelector('.fw-semibold.small'),u.nombre||'Usuario');
      poner(tarjeta.querySelector('.text-secondary.small'),({gerencia:'Gerencia',rh:'Recursos Humanos',colaborador:'Colaborador'})[u.rol]||'Usuario');
      poner(tarjeta.querySelector('.avatar-circle'),(u.nombre||'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase());
    }
    if(perRes.ok) {
      const body=await perRes.json();const p=body.perfil;
      if(p){const ingreso=p.fechaIngreso ? new Date(`${p.fechaIngreso}T12:00:00`).toLocaleDateString('es-MX') : 'Sin fecha';
        poner(resumen,`Empleado ${p.numeroEmpleado ?? 'sin número'} · Compañía ${p.compania ?? 'sin compañía'} · Ingreso: ${ingreso} · Rol de acceso: ${u.rol}`);
      }
    }else poner(resumen,'Perfil laboral no vinculado.');
    if(vacRes.ok && stats.length>=3){const v=await vacRes.json();if(v.saldo){
      poner(stats[2].querySelector('.stat-value'),`${v.saldo.disponibles} días`);
      poner(stats[2].querySelector('small:last-of-type'),`Periodo ${v.saldo.anio}`);
    }}
  } catch(e){poner(resumen,`No se pudo cargar el Dashboard: ${e.message}`);console.error(e);}
})();
