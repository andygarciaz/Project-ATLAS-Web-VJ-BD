(() => {
 const body=document.getElementById('docsBody'),count=document.getElementById('contadorDocs'),filter=document.getElementById('filtroTipo');
 const docs=[];filter.replaceChildren(new Option('Todos','Todos'));
 function cell(row,val){const e=document.createElement('td');e.textContent=String(val??'—');row.append(e)}
 function render(){body.replaceChildren();const found=docs.filter(x=>filter.value==='Todos'||String(x.tipo||'Sin tipo')===filter.value);count.textContent=`${found.length} documento(s) registrado(s) en SQL Server`;
 if(!found.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=5;td.className='text-center text-secondary py-4';td.textContent='Sin documentos registrados para este filtro';tr.append(td);body.append(tr);return}
 for(const d of found){const tr=document.createElement('tr');cell(tr,d.descripcion||`Documento ${d.id}`);cell(tr,d.tipo||'Sin tipo');cell(tr,d.fecha);cell(tr,'No disponible');cell(tr,'Descarga pendiente de almacenamiento autorizado');body.append(tr)}}
 filter.addEventListener('change',render);
 (async()=>{try{const r=await fetch('/api/documentos',{credentials:'same-origin',cache:'no-store'});const j=await r.json();if(!r.ok||!j.ok)throw Error(j.mensaje||`HTTP ${r.status}`);docs.push(...j.documentos);[...new Set(docs.map(x=>x.tipo||'Sin tipo'))].forEach(t=>filter.add(new Option(t,t)));render();}catch(e){count.textContent='No se pudieron consultar documentos';body.replaceChildren();const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=5;td.className='text-danger p-3';td.textContent=e.message;tr.append(td);body.append(tr)}})();
})();