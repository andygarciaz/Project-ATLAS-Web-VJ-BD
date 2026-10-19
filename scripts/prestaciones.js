/* Prestaciones ATLAS: saldo e historial SIEMPRE desde API; no simular solicitudes. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const money = (n) => '$' + Number(n).toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2});
  const servicios = [ 'Consulta de medicina general','Hospitalización','Cirugía','Maternidad','Medicamentos de cuadro básico','Laboratorio y radiología','Atención dental básica','Pensiones y jubilaciones' ];
  const movimientosAhorro = [
    {mes:'Ago 2026',empleado:2400,empresa:2400,acumulado:28800},
    {mes:'Jul 2026',empleado:2400,empresa:2400,acumulado:26400},
    {mes:'Jun 2026',empleado:2400,empresa:2400,acumulado:24000},
    {mes:'May 2026',empleado:2400,empresa:2400,acumulado:21600},
  ];
  // IMSS y fondo de ahorro todavía son maquetas previas: NO forman parte de esta integración.
  for (const servicio of servicios) {
    if (!$('serviciosLista')) break;
    const col=document.createElement('div'); col.className='col-md-3 col-6';
    const chip=document.createElement('div');chip.className='servicio-chip';
    const dot=document.createElement('span');dot.className='dot dot-active';chip.append(dot,document.createTextNode(' '+servicio));col.append(chip);$('serviciosLista').append(col);
  }
  for (const m of movimientosAhorro) {
    if (!$('ahorroBody')) break;
    const tr=document.createElement('tr');
    for (const [text,cls] of [[m.mes,'fw-semibold'],[money(m.empleado),'numero'],[money(m.empresa),'numero'],[money(m.acumulado),'numero texto-portal']]) {
      const td=document.createElement('td');td.className=cls;td.textContent=text;tr.append(td);
    }
    $('ahorroBody').append(tr);
  }
  if ($('saldoTotal')) $('saldoTotal').textContent=money(movimientosAhorro[0].acumulado);

  const ANIO=2026; // Año con saldo piloto confirmado; cambiar a selección de año al ampliar el módulo.
  let diasDisponibles=null;
  let enviando=false;
  const setText=(id,val)=>{if($(id)) $(id).textContent=String(val);};
  function aviso(mensaje,tipo='info') {
    const n=$('vacEstado');if(!n)return;
    n.className=`alert alert-${tipo} small`;n.textContent=mensaje;
  }
  async function obtener(url,opciones={}) {
    const resp=await fetch(url,{credentials:'same-origin',cache:'no-store',...opciones});
    const data=await resp.json().catch(()=>({}));
    if(!resp.ok || data.ok!==true) throw new Error(data.mensaje || `Error HTTP ${resp.status}`);
    return data;
  }
  function fechaCorta(fecha) {
    if(!fecha) return 'Sin fecha';
    const match=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(fecha));
    return match ? `${match[3]}/${match[2]}/${match[1]}` : String(fecha);
  }
  function td(tr,valor,clase='') {const celda=document.createElement('td');celda.className=clase;celda.textContent=String(valor);tr.append(celda);}
  function dibujarSaldo(saldo) {
    const body=$('saldoBody');body.replaceChildren();
    if(!saldo){const tr=document.createElement('tr');td(tr,'Sin saldo registrado en SQL Server');body.append(tr);diasDisponibles=null;setText('infoDisponibles','Sin datos');setText('modalSaldo','Sin datos');return;}
    diasDisponibles=Number(saldo.disponibles);
    const tr=document.createElement('tr');
    td(tr,saldo.anio??ANIO,'fw-semibold');td(tr,saldo.asignados);td(tr,saldo.disfrutados);
    td(tr,saldo.disponibles,'fw-semibold texto-portal');body.append(tr);
    setText('infoDisponibles',diasDisponibles);setText('modalSaldo',`${diasDisponibles} días`);
  }
  function dibujarHistorial(solicitudes) {
    const destino=$('historialVacaciones');destino.replaceChildren();
    if(!solicitudes.length){const vacio=document.createElement('p');vacio.className='px-4 py-3 text-secondary small mb-0';vacio.textContent='Aún no tienes solicitudes registradas.';destino.append(vacio);return;}
    for(const s of solicitudes){
      const fila=document.createElement('div');fila.className='d-flex justify-content-between align-items-center px-4 py-3 border-top gap-2';
      const principal=document.createElement('div');
      const folio=document.createElement('div');folio.className='folio numero';folio.textContent=`Solicitud #${s.idSolicitud ?? '—'}`;
      const fechas=document.createElement('small');fechas.textContent=`${fechaCorta(s.inicio)} — ${fechaCorta(s.fin)} · ${s.dias ?? 'Por calcular'} días provisionales`;
      principal.append(folio,fechas);
      const estado=document.createElement('span');
      const estadoTxt=String(s.estado||'Sin estado');
      estado.className='badge-status '+(/aprob|autoriza/i.test(estadoTxt)?'badge-autorizada':'badge-pendiente');
      estado.textContent=estadoTxt;
      fila.append(principal,estado);destino.append(fila);
    }
  }
  async function actualizarVacaciones() {
    aviso('Consultando datos reales de vacaciones...');
    const [perfil,saldo,historial]=await Promise.all([
      obtener('/api/perfil'),
      obtener(`/api/vacaciones/saldo?anio=${ANIO}`),
      obtener('/api/vacaciones/solicitudes'),
    ]);
    const p=perfil.perfil||{};
    setText('vacCompania',p.compania??'Sin vinculación');
    setText('vacEmpleado',[p.nombreRecurso,p.apellidoPaterno,p.apellidoMaterno].filter(Boolean).join(' ')||p.nombreCuenta||'Sin vinculación');
    setText('vacIngreso',fechaCorta(p.fechaIngreso));
    setText('vacSupervisor','Pendiente de vinculación');
    dibujarSaldo(saldo.saldo);
    dibujarHistorial(Array.isArray(historial.solicitudes)?historial.solicitudes:[]);
    aviso('Información consultada desde SQL Server. Las solicitudes pendientes no descuentan saldo.','success');
    recalcular();
  }
  function contarLaborables(inicio,fin) {
    const start=new Date(`${inicio}T00:00:00Z`),end=new Date(`${fin}T00:00:00Z`);let cuenta=0;
    for(let d=start;d<=end;d.setUTCDate(d.getUTCDate()+1)) if(![0,6].includes(d.getUTCDay())) cuenta++;
    return cuenta;
  }
  function mostrarError(msj) {const el=$('mensajeError');el.textContent=msj;el.classList.toggle('d-none',!msj);}
  function recalcular() {
    const ini=$('fechaInicio').value,fin=$('fechaFin').value;
    setText('diasSol',0);setText('diasFest','Por validar');setText('diasVac',0);
    $('btnEnviar').disabled=true;mostrarError('');
    if(!ini || !fin) return;
    if(fin<ini){mostrarError('La fecha final debe ser igual o posterior a la inicial.');return;}
    if(ini.slice(0,4)!==fin.slice(0,4)){mostrarError('Selecciona fechas dentro del mismo año.');return;}
    const dias=contarLaborables(ini,fin);setText('diasSol',dias);setText('diasVac',dias);
    if(dias<1 || dias>30){mostrarError('Selecciona entre 1 y 30 días hábiles.');return;}
    if(diasDisponibles===null){mostrarError('No hay saldo confirmado en SQL Server.');return;}
    if(dias>diasDisponibles){mostrarError(`Solo hay ${diasDisponibles} días disponibles.`);return;}
    if(!enviando) $('btnEnviar').disabled=false;
  }
  $('fechaInicio').addEventListener('change',()=>{ $('fechaFin').min=$('fechaInicio').value;recalcular();});
  $('fechaFin').addEventListener('change',recalcular);
  $('modalVacaciones').addEventListener('show.bs.modal',()=>{
    $('fechaInicio').value='';$('fechaFin').value='';$('fechaFin').min='';$('comentarios').value='';
    setText('modalSaldo',diasDisponibles===null?'Sin datos':`${diasDisponibles} días`);
    recalcular();
  });
  $('btnEnviar').addEventListener('click',async()=>{
    if(enviando)return;
    recalcular();if($('btnEnviar').disabled)return;
    const inicio=$('fechaInicio').value,fin=$('fechaFin').value,comentarios=$('comentarios').value.trim();
    enviando=true;$('btnEnviar').disabled=true;mostrarError('Enviando solicitud...');
    try{
      const respuesta=await obtener('/api/vacaciones/solicitudes',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({inicio,fin,comentarios})
      });
      // El backend confirmó la inserción; si falla la recarga NO se vuelve a enviar.
      mostrarError('');
      bootstrap.Modal.getInstance($('modalVacaciones'))?.hide();
      aviso(`Solicitud #${respuesta.idSolicitud} registrada como Pendiente.`, 'success');
      try{await actualizarVacaciones();}catch(error){aviso(`Solicitud #${respuesta.idSolicitud} registrada. No se pudo actualizar el historial: ${error.message}`,'warning');}
    }catch(error){mostrarError(error.message);console.error('POST vacaciones:',error);}
    finally{enviando=false;recalcular();}
  });
  actualizarVacaciones().catch(err=>{
    console.error('Prestaciones SQL:',err);aviso(`No se pudieron cargar vacaciones: ${err.message}`,'warning');
    dibujarSaldo(null);dibujarHistorial([]);$('btnSolicitar').disabled=true;
  });
})();
