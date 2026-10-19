(() => {
 const $=id=>document.getElementById(id);
 const money=x=>Number(x).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
 function element(tag,content,cls){const e=document.createElement(tag);if(cls)e.className=cls;if(content!==undefined)e.textContent=String(content);return e}
 function panel(message){const p=element('div',undefined,'panel p-4');p.append(element('p',message,'mb-0 text-secondary'));return p}
 async function load(path){const r=await fetch(path,{credentials:'same-origin',cache:'no-store'});const j=await r.json();if(!r.ok||!j.ok)throw Error(j.mensaje||`HTTP ${r.status}`);return j}
 function entry(k,v){const d=element('div',undefined,'d-flex justify-content-between border-bottom py-2 gap-3');d.append(element('span',k,'text-secondary'),element('strong',v??'No registrado'));return d}
 async function imss(){const tab=$('tab-imss');if(!tab)return;tab.replaceChildren(panel('Consultando IMSS en SQL Server...'));try{
 const {imss:i}=await load('/api/prestaciones/imss');tab.replaceChildren();if(!i){tab.append(panel('Sin registros IMSS para la cuenta vinculada.'));return}
 const p=element('section',undefined,'panel p-4');p.append(element('h5','Datos IMSS vinculados al empleado','mb-3'));
 for(const [k,v] of [['NSS',i.nss],['Número de afiliación',i.numeroAfiliacion],['Modalidad',i.modalidad],['Clínica',i.clinica],['Cobertura',i.cobertura],['Cuota patronal',i.cuotaPatronal==null?null:money(i.cuotaPatronal)],['Cuota obrera',i.cuotaObrera==null?null:money(i.cuotaObrera)],['Salario base de cotización',i.salarioBase==null?null:money(i.salarioBase)]])p.append(entry(k,v));
 p.append(element('p','La afiliación vigente debe verificarse con RH o el IMSS; estos datos no acreditan vigencia.','small text-secondary mt-3 mb-0'));tab.append(p);
 }catch(e){tab.replaceChildren(panel('No se pudo consultar IMSS: '+e.message))}}
 async function ahorro(){const tab=$('tab-ahorro');if(!tab)return;tab.replaceChildren(panel('Consultando fondo de ahorro...'));try{
 const {movimientos:rows}=await load('/api/prestaciones/ahorro');tab.replaceChildren();if(!rows.length){tab.append(panel('Aún no hay aportaciones registradas para este empleado en SQL Server.'));return}
 const p=element('section',undefined,'panel p-4');p.append(element('h5','Movimientos reales de fondo de ahorro','mb-3'));
 const t=element('table',undefined,'table table-sm');const h=element('thead');const hr=element('tr');['Periodo','Empleado','Empresa','Acumulado'].forEach(x=>hr.append(element('th',x)));h.append(hr);t.append(h);const b=element('tbody');rows.forEach(x=>{const tr=element('tr');[`${x.mes}/${x.anio}`,money(x.empleado),money(x.empresa),money(x.acumulado)].forEach(v=>tr.append(element('td',v)));b.append(tr)});t.append(b);p.append(t);tab.append(p);
 }catch(e){tab.replaceChildren(panel('No se pudo consultar fondo de ahorro: '+e.message))}}
 imss();ahorro();
})();