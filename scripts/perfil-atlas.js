/* Sin credenciales ni ID de empleado en frontend: se toma de /api/perfil. */
(async function cargarPerfilDesdeSql() {
  const campos = document.querySelectorAll('.panel.mb-3 .row.g-3 .col-md-3');
  if (!campos.length) return;

  const aviso = document.createElement('div');
  aviso.className = 'alert alert-info mb-3';
  aviso.setAttribute('role', 'status');
  aviso.textContent = 'Consultando perfil laboral en SQL Server...';
  const panel = campos[0].closest('.panel');
  panel?.parentElement?.insertBefore(aviso, panel);

  const limpiarFijos = () => {
    for (const campo of campos) {
      const titulo = campo.querySelector('small')?.textContent?.trim();
      const valor = campo.querySelector('span');
      if (!valor) continue;
      if (['Correo institucional', 'Compañía', 'Fecha de ingreso', 'Supervisor', 'Departamento', 'Puesto'].includes(titulo)) {
        valor.textContent = 'Pendiente de vinculación';
      }
    }
  };

  try {
    const respuesta = await fetch('/api/perfil', { credentials: 'same-origin', cache: 'no-store' });
    const datos = await respuesta.json();
    if (!respuesta.ok || !datos.ok || !datos.perfil) throw new Error(datos.mensaje || `HTTP ${respuesta.status}`);
    const p = datos.perfil;
    const nombreCompleto = [p.nombreRecurso, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ') || p.nombreCuenta;
    const fecha = p.fechaIngreso
      ? new Date(`${p.fechaIngreso}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Sin fecha';
    const mapa = {
      'Nombre completo': nombreCompleto,
      'Núm. empleado': String(p.numeroEmpleado ?? 'Sin asignar'),
      'Departamento': 'Pendiente de catálogo',
      'Puesto': ({ gerencia: 'Gerencia', rh: 'Recursos Humanos', colaborador: 'Colaborador' })[p.rol] || 'Sin rol',
      'Correo institucional': p.correo || 'Sin correo',
      'Compañía': String(p.compania ?? 'Sin asignar'),
      'Fecha de ingreso': fecha,
      'Supervisor': 'Pendiente de vinculación'
    };
    for (const campo of campos) {
      const titulo = campo.querySelector('small')?.textContent?.trim();
      const valor = campo.querySelector('span');
      if (valor && Object.hasOwn(mapa, titulo)) valor.textContent = mapa[titulo];
    }
    const avatar = document.querySelector('.avatar-circle.avatar-xxl');
    if (avatar) avatar.textContent = (p.nombreCuenta || nombreCompleto).trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
    aviso.className = 'alert alert-success mb-3';
    aviso.textContent = 'Perfil laboral cargado desde SQL Server.';
    console.info('Perfil ATLAS cargado desde SQL Server');
  } catch (e) {
    limpiarFijos();
    aviso.className = 'alert alert-warning mb-3';
    aviso.textContent = `No se pudo cargar el perfil laboral: ${e.message}`;
    console.error('Error en perfil:', e);
  }
})();
