// Versión SQL: no inventa días. Sustituye la fuente de datos simulada del calendario.
(async function () {
 const raiz=document.querySelector('.main-content .p-4'); if(!raiz)return;
 // Ocultar todos los componentes de demostración anteriores: no equivalen a registros SQL.
 const panelDemo=raiz.querySelector('.panel.mb-3'); if(panelDemo) panelDemo.hidden=true;
 const resumenDemo=document.getElementById('resumenMes')?.closest('.row.g-3.mb-3');if(resumenDemo) resumenDemo.hidden=true;
 const calendarioDemo=document.getElementById('calendarioDias')?.closest('.panel');if(calendarioDemo) calendarioDemo.hidden=true;
 const cont=document.createElement('section');cont.className='panel mb-4';
 const h=document.createElement('h6');h.className='fw-bold';h.textContent='Registros de asistencia (SQL Server)';cont.append(h);
 const status=document.createElement('p');status.className='text-secondary';status.textContent='Consultando...';cont.append(status);
 const tabla=document.createElement('div');cont.append(tabla);raiz.prepend(cont);
 const fecha=new Date(),selAnio=document.getElementById('selAnio'),selMes=document.getElementById('selMes');
 if(selAnio){selAnio.replaceChildren();for(let y=fecha.getFullYear()-1;y<=fecha.getFullYear()+1;y++){const o=new Option(String(y),String(y));selAnio.add(o);}selAnio.value=String(fecha.getFullYear());}
 if(selMes){selMes.replaceChildren();for(let m=1;m<=12;m++){const o=new Option(new Intl.DateTimeFormat('es-MX',{month:'long'}).format(new Date(2026,m-1,1)),String(m));selMes.add(o);}selMes.value=String(fecha.getMonth()+1);}
 async function consultar(){const anio=Number(selAnio?.value ?? fecha.getFullYear()),mes=Number(selMes?.value ?? fecha.getMonth()+1);tabla.replaceChildren();status.textContent='Consultando SQL Server...';
 try {
   const [a,v]=await Promise.all([
    fetch(`/api/asistencia?anio=${anio}&mes=${mes}`,{credentials:'same-origin',cache:'no-store'}),
    fetch(`/api/vacaciones/saldo?anio=${anio}`,{credentials:'same-origin',cache:'no-store'})
   ]);
   if(a.status===401){location.href='/paginas/index.html';return;}
   const da=await a.json();if(!a.ok||!da.ok)throw Error(da.mensaje||'Error HTTP');
   const dv=v.ok?await v.json():null;
   status.textContent=`${da.registros.length} registros reales de ${mes}/${anio}. Vacaciones disponibles: ${dv?.saldo?.disponibles ?? 'sin saldo registrado'}.`;
   if(!da.registros.length) {tabla.textContent='No existen registros de asistencia para este periodo en SQL Server.';return;}
   const t=document.createElement('table');t.className='table table-sm';
   const encabezados=['Fecha','Tipo','Entrada','Salida','Horas extra'];
   const thead=t.createTHead().insertRow();for(const x of encabezados){const c=document.createElement('th');c.textContent=x;thead.append(c);}
   const tbody=t.createTBody();for(const r of da.registros){const fila=tbody.insertRow();
    for(const valor of [r.fecha,r.tipo,r.entrada??'—',r.salida??'—',String(r.horasExtras??0)])fila.insertCell().textContent=valor;
   }tabla.append(t);
 }catch(e){status.textContent=`No se pudo consultar asistencia: ${e.message}`;console.error(e);}
 }
 document.getElementById('btnConsultar')?.addEventListener('click', consultar);
 await consultar();
})();
