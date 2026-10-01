(() => {
  const key='proyectat-created-documents-v1';
  let records=[];
  try { const stored=JSON.parse(localStorage.getItem(key)||'[]'); if(Array.isArray(stored))records=stored.filter(d=>d&&typeof d.id==='string'&&typeof d.content==='string'&&typeof d.kind==='string'&&typeof d.updatedAt==='string'&&/^[a-zA-Z0-9-]+$/.test(d.id)); } catch {}
  function save(){try{localStorage.setItem(key,JSON.stringify(records));return true;}catch{toast('No se han podido guardar los documentos. Descárgalos para conservarlos.');return false;}}
  const dialog=document.createElement('dialog');dialog.className='documents-dialog';dialog.setAttribute('aria-labelledby','documents-title');document.body.append(dialog);
  const nav=document.createElement('button');nav.textContent='Documentos creados';nav.onclick=()=>openDocuments();document.querySelector('nav').append(nav);
  function attachAccess(id){const host=$('#workspace');if(host.querySelector('.documents-access'))return;const button=document.createElement('button');button.className='outline documents-access';button.textContent='Documentos creados ('+records.filter(d=>d.opportunityId===id).length+')';button.onclick=()=>{$('#detail-dialog').close();openDocuments(id);};host.append(button);}
  const originalWorkspace=renderWorkspace;
  renderWorkspace=function(id){originalWorkspace(id);attachAccess(id);};
  const originalDetail=showDetail;
  showDetail=function(id){originalDetail(id);attachAccess(id);};
  const documentModels={
    bundle3:{label:'Paquete esencial · 3 documentos',kinds:['Propuesta','Carta de presentación','Lista de requisitos'],detail:'Propuesta detallada, carta de presentación y lista de requisitos.'},
    bundle6:{label:'Paquete completo · 6 documentos',kinds:['Propuesta','Carta de presentación','Dossier profesional','Presupuesto','Calendario y plan de trabajo','Lista de requisitos'],detail:'Propuesta detallada, carta, dossier profesional, presupuesto, calendario y lista de requisitos.'},
    proposal:{label:'Propuesta detallada',kinds:['Propuesta'],detail:'Objetivos, metodología, equipo, recursos, impacto, riesgos y evaluación.'},
    letter:{label:'Carta de presentación',kinds:['Carta de presentación'],detail:'Motivación, encaje, aportación, evidencias y cierre profesional.'},
    dossier:{label:'Dossier profesional',kinds:['Dossier profesional'],detail:'Biografía, experiencia, formación, selección de trabajos y contacto.'},
    budget:{label:'Presupuesto',kinds:['Presupuesto'],detail:'Partidas, cantidades, costes, impuestos, financiación y condiciones por completar.'},
    timeline:{label:'Calendario y plan de trabajo',kinds:['Calendario y plan de trabajo'],detail:'Fases, fechas, responsables, entregables, dependencias y seguimiento.'},
    checklist:{label:'Lista de requisitos',kinds:['Lista de requisitos'],detail:'Elegibilidad, documentación, formato, permisos y presentación.'}
  };
  const catalogText=value=>String(value??'').replace(/&(amp|lt|gt|quot|#39);/g,entity=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[entity]));
  function draft(x,kind,idea){
    const author=profile.name||'[Nombre profesional o entidad]';
    const value=(field,fallback)=>catalogText(x[field])||fallback;
    const requirements=Array.isArray(x.requirements)&&x.requirements.length?x.requirements.map(r=>'□ '+catalogText(r)).join('\n'):'□ [Consultar los requisitos completos en las bases]';
    const context='OPORTUNIDAD Y FUENTE\nOportunidad: '+value('title','[Título de la oportunidad]')+'\nOrganización: '+value('org','[Organización por confirmar]')+'\nTipo: '+value('type','[Tipo por confirmar]')+'\nLugar: '+value('place','[Lugar o modalidad por confirmar]')+'\nEstado de apertura: '+stateOf(x)+'\nVerificación de la ficha: '+value('verification','Sin verificación disponible')+'\nÚltima comprobación de la ficha: '+value('reviewed','Sin fecha de comprobación')+'\nPlazo publicado: '+value('deadline','Sin fecha de cierre publicada')+'\nFuente: '+value('url','[Enlace a las bases por localizar]')+'\nBorrador creado: '+new Date().toLocaleDateString('es-ES')+'\n';
    const footer='\n\nREVISIÓN DEL BORRADOR\nCompleta los campos entre corchetes y elimina los apartados que no correspondan. Incluye solo hechos, experiencia y cifras comprobables. Revisa extensión, formato, estado y plazo en las bases antes de presentar. Este modelo no sustituye los formularios oficiales.';
    const sections={
      'Propuesta':`BORRADOR DE PROPUESTA DETALLADA

${context}
Autoría: ${author}
Título del proyecto: [Título breve y descriptivo]
Contacto: [Correo y teléfono profesional]
Versión: [Número de versión y fecha de revisión]

1. RESUMEN DEL PROYECTO
Idea aportada:
${idea}
[Resume en 5–8 líneas qué harás, para quién, dónde y qué resultado entregarás.]

2. CONTEXTO Y ENCAJE
Información de la ficha:
${value('description','[Consulta la descripción en las bases]')}
[Necesidad o contexto al que responde el proyecto, con fuentes si procede.]
[Relación concreta entre la propuesta y los objetivos de la convocatoria.]
[Público destinatario y criterios de acceso o participación.]

3. OBJETIVOS Y RESULTADOS
Objetivo general: [Resultado principal que buscas]
Objetivos específicos: [Objetivo, indicador verificable y resultado esperado]
Entregables: [Pieza, servicio, actividad o documento; cantidad y formato]

4. DESARROLLO Y METODOLOGÍA
[Enfoque artístico o profesional y motivos de la elección.]
[Actividades y técnicas por fase: preparación, realización y cierre.]
[Participación de destinatarios, colaboradores y sistema de coordinación.]

5. EQUIPO Y CAPACIDAD
[Nombre, función, dedicación y experiencia relevante acreditable de cada persona.]
[Colaboraciones confirmadas y recursos pendientes de confirmar.]

6. CALENDARIO Y RECURSOS
[Fecha de inicio y fin; hitos, responsables y entregables por fase.]
[Espacios, materiales, equipos, servicios y permisos necesarios.]
[Presupuesto desglosado y fuentes de financiación confirmadas o pendientes.]

7. ACCESO, DIFUSIÓN Y DERECHOS
[Medidas de accesibilidad y atención a los públicos.]
[Canales de difusión, calendario y responsables.]
[Autoría, licencias, derechos de imagen y permisos que debas comprobar.]

8. EVALUACIÓN Y CONTINGENCIAS
[Indicadores, método de recogida de evidencias y evaluación de resultados.]
[Riesgos, probabilidad, impacto, responsable y alternativa para cada uno.]

9. ANEXOS Y REQUISITOS
[Índice de anexos que realmente adjuntarás: CV, muestras, presupuesto, cronograma…]
Requisitos recogidos en la ficha:
${requirements}`,
      'Carta de presentación':`BORRADOR DE CARTA DE PRESENTACIÓN

${context}
Remitente: ${author}
Contacto: [Correo, teléfono y enlace profesional]
[Localidad y fecha]

A la atención de [Persona, departamento o equipo de selección]:

Mi nombre es ${author} y deseo presentar mi candidatura a «${value('title','[Oportunidad]')}».

Mi propuesta parte de la siguiente idea:
${idea}

[Explica tu motivación específica y la relación con los objetivos de esta oportunidad.]

[Resume dos o tres experiencias o trabajos reales relevantes: tu función, la fecha y la aportación concreta. Incluye un enlace o referencia cuando proceda.]

[Explica qué aportarías, cómo trabajarías y qué resultado propones. No afirmes que cumples requisitos que aún no has comprobado.]

[Indica disponibilidad y condiciones solicitadas en las bases, si corresponde.]

[Enumera únicamente los documentos o enlaces que realmente adjuntarás.]

Gracias por considerar mi candidatura. Quedo a su disposición para ampliar la información.

${author}
[Firma, si se solicita]`,
      'Dossier profesional':`BORRADOR DE DOSSIER PROFESIONAL

${context}
Nombre profesional o entidad: ${author}
Disciplina y especialidad: [Especialidad y ámbito de trabajo]
Ubicación y disponibilidad: [Ciudad, movilidad y modalidad]
Contacto: [Correo, teléfono y web o portfolio]

1. PRESENTACIÓN Y BIOGRAFÍA
[Biografía breve: qué haces, cómo trabajas y en qué ámbitos. Incluye solo hechos reales.]
[Declaración profesional o artística: intereses, enfoque y aportación.]

2. OBJETIVO DE ESTA VERSIÓN
Idea aportada para esta oportunidad:
${idea}
[Selecciona la parte de tu trayectoria que mejor responde a lo solicitado.]

3. EXPERIENCIA SELECCIONADA
[Por cada experiencia: fechas, organización o cliente, proyecto, función y aportación concreta.]
[Resultados verificables y referencia o enlace, si puedes compartirlos.]

4. FORMACIÓN Y ESPECIALIZACIÓN
[Por cada formación: título real, centro, fechas y estado de finalización.]
[Acreditaciones y formación complementaria relevantes; no atribuyas oficialidad sin comprobarla.]

5. MUESTRAS DE TRABAJO
[Por cada muestra: título, año, disciplina, descripción, tu función, autoría y enlace accesible.]
[Indica créditos y permisos de publicación; añade imágenes o archivos en Word si los necesitas.]

6. HABILIDADES Y RECURSOS
[Técnicas, herramientas, idiomas y nivel que puedas demostrar.]
[Equipamiento, espacios o colaboraciones disponibles y pendientes de confirmar.]

7. RECONOCIMIENTOS Y REFERENCIAS
[Premios, publicaciones o exposiciones comprobables; omite este apartado si no procede.]
[Referencias profesionales con permiso para facilitar sus datos.]

8. ANEXOS Y CONTACTO
[Enlaces al CV, portfolio y documentos que realmente adjuntarás.]
[Correo profesional y canal preferido de contacto.]`,
      'Presupuesto':`BORRADOR DE PRESUPUESTO

${context}
Proyecto: [Título del proyecto]
Responsable: ${author}
Moneda: [Moneda]
Periodo presupuestado: [Inicio y fin]
Fecha y versión: [Fecha y número de versión]

1. ALCANCE
Idea aportada:
${idea}
[Actividades y entregables cubiertos; exclusiones, si las hay.]

2. PARTIDAS DE COSTE
Completa o elimina cada partida. Añade tantas líneas como necesites.
Honorarios: [Concepto] | [Cantidad/unidad] | [Coste unitario] | [Base] | [IVA u otro impuesto aplicable] | [Total]
Materiales: [Concepto] | [Cantidad/unidad] | [Coste unitario] | [Base] | [IVA u otro impuesto aplicable] | [Total]
Equipos y alquileres: [Concepto] | [Cantidad/unidad] | [Coste unitario] | [Base] | [IVA u otro impuesto aplicable] | [Total]
Espacios y producción: [Concepto] | [Cantidad/unidad] | [Coste unitario] | [Base] | [IVA u otro impuesto aplicable] | [Total]
Desplazamientos y logística: [Concepto] | [Cantidad/unidad] | [Coste unitario] | [Base] | [IVA u otro impuesto aplicable] | [Total]
Comunicación y accesibilidad: [Concepto] | [Cantidad/unidad] | [Coste unitario] | [Base] | [IVA u otro impuesto aplicable] | [Total]
Otros costes justificados: [Concepto] | [Cantidad/unidad] | [Coste unitario] | [Base] | [IVA u otro impuesto aplicable] | [Total]

3. RESUMEN ECONÓMICO
Base total: [Sumar bases de las partidas]
Impuestos: [Tipo, base y cuantía; confirmar si procede exención]
Total del presupuesto: [Importe revisado]
Contingencias, si las bases las permiten: [Concepto e importe justificado]
No hay importes ni cálculos automáticos: completa y comprueba cantidades, operaciones e impuestos antes de compartir.

4. FINANCIACIÓN
Aportación solicitada: [Importe y fuente]
Aportación propia: [Importe y naturaleza]
Otras aportaciones: [Entidad, importe y estado: confirmada o pendiente]
Balance: [Contrastar financiación total con costes totales]

5. CONDICIONES Y JUSTIFICACIÓN
[Validez, calendario de pagos, hitos de facturación y condiciones acordadas.]
[Costes admitidos, límites y documentos justificativos exigidos en las bases.]
[Presupuestos de proveedores, referencias y fecha de cada estimación.]
[Persona responsable de revisar y aprobar el presupuesto.]`,
      'Calendario y plan de trabajo':`BORRADOR DE CALENDARIO Y PLAN DE TRABAJO

${context}
Proyecto: [Título del proyecto]
Coordinación: ${author}
Periodo previsto: [Fecha de inicio y fin]

1. OBJETIVO Y ALCANCE
Idea aportada:
${idea}
[Resultado final y entregables que delimitarán el trabajo.]

2. FASES Y HITOS
Fase 1. Preparación
[Actividad] | [Inicio] | [Fin] | [Responsable] | [Recursos] | [Entregable] | [Criterio de aceptación]
[Dependencias, permisos y decisiones necesarias antes de empezar.]

Fase 2. Desarrollo o producción
[Actividad] | [Inicio] | [Fin] | [Responsable] | [Recursos] | [Entregable] | [Criterio de aceptación]
[Hitos intermedios y revisión con las personas implicadas.]

Fase 3. Presentación o entrega
[Actividad] | [Inicio] | [Fin] | [Responsable] | [Recursos] | [Entregable] | [Criterio de aceptación]
[Canal, formato, destinatario y fecha límite de cada entrega.]

Fase 4. Cierre y evaluación
[Actividad] | [Inicio] | [Fin] | [Responsable] | [Recursos] | [Entregable] | [Criterio de aceptación]
[Evaluación, archivo de evidencias y justificación si se exige.]

3. COORDINACIÓN Y SEGUIMIENTO
[Responsable de coordinación y personas de contacto.]
[Frecuencia de revisión, canal de comunicación y registro de acuerdos.]
[Estado por tarea: pendiente, en curso, en revisión o terminada.]

4. RIESGOS Y AJUSTES
[Riesgo o dependencia crítica, impacto, responsable y alternativa.]
[Margen disponible antes del plazo y procedimiento para aprobar cambios.]

5. COMPROBACIÓN FINAL
□ Fechas compatibles con el plazo publicado y los recursos disponibles.
□ Responsables y entregables acordados.
□ Dependencias, permisos y revisiones identificados.
□ Evidencias y justificantes previstos.`,
      'Lista de requisitos':`LISTA DE REQUISITOS Y PRESENTACIÓN

${context}
Responsable de revisión: ${author}

IDEA APORTADA
${idea}

1. REQUISITOS RECOGIDOS EN LA FICHA
${requirements}

2. ELEGIBILIDAD Y CONDICIONES
□ Consultar las bases vigentes en la fuente enlazada.
□ Confirmar apertura, fecha, hora de cierre y zona horaria.
□ Comprobar edad, residencia, disciplina, trayectoria y demás criterios aplicables.
□ Revisar incompatibilidades, compromisos, costes y condiciones de participación.

3. DOCUMENTACIÓN
□ Comprobar formularios oficiales y anexos obligatorios.
□ Completar propuesta, carta, CV o dossier solo si se solicitan.
□ Revisar presupuesto, calendario y muestras de trabajo si son necesarios.
□ Aportar acreditaciones reales y los permisos o firmas exigidos.

4. FORMATO Y CALIDAD
□ Ajustar extensión, idioma, nombre de archivos y formato a las bases.
□ Eliminar campos pendientes, instrucciones internas y datos innecesarios.
□ Revisar ortografía, fechas, cifras, coherencia y datos de contacto.
□ Abrir el PDF final, comprobar todas sus páginas y probar los enlaces.
□ Comprobar derechos de autor, créditos y permisos de imagen cuando correspondan.

5. PRESENTACIÓN Y SEGUIMIENTO
□ Presentar por el canal oficial dentro del plazo.
□ Conservar copia exacta de lo enviado y el justificante de registro.
□ Anotar fechas de resolución y posibles subsanaciones.
Canal de presentación: [URL o sede oficial]
Fecha de envío: [Completar solo cuando hayas presentado]
Referencia o justificante: [Identificador real de registro]`
    };
    return sections[kind]+footer;
  }
  function openDocuments(id){
    const x=data.find(o=>o.id===id);
    dialog.innerHTML='<button class="close" aria-label="Cerrar" data-close>×</button><div class="small-label">Mi camino</div><h2 id="documents-title">Documentos creados</h2><p>'+ (x?esc(x?.title||"Oportunidad guardada"):'Crea un borrador o añade un documento propio para editarlo y adaptarlo.')+'</p><div class="document-tabs" role="tablist" aria-label="Documentos"><button role="tab" id="docs-list-tab" aria-controls="docs-panel" aria-selected="true" tabindex="0">Documentos creados</button><button role="tab" id="docs-new-tab" aria-controls="docs-panel" aria-selected="false" tabindex="-1">Crear documentos</button><button role="tab" id="docs-import-tab" aria-controls="docs-panel" aria-selected="false" tabindex="-1">Añadir mi documento</button></div><div id="docs-panel" role="tabpanel" aria-labelledby="docs-list-tab"></div><p class="storage-note">Se guardan solo en este navegador. Descárgalos para conservar una copia. Las solicitudes se presentan en la web oficial.</p>';
    const tabs=[...dialog.querySelectorAll('[role="tab"]')];
    function select(index){tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',i===index);tab.tabIndex=i===index?0:-1;});dialog.querySelector('#docs-panel').setAttribute('aria-labelledby',tabs[index].id);if(index===1)form(id);else if(index===2)importForm(id);else list(id);}
    tabs.forEach((tab,index)=>{tab.onclick=()=>select(index);tab.onkeydown=e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;tabs[next].focus();select(next);}};});
    select(0);if(!dialog.open)dialog.showModal();
  }
  function list(id){
    const rows=records.filter(d=>id===undefined||d.opportunityId===id);const panel=dialog.querySelector('#docs-panel');
    panel.innerHTML=rows.length?rows.map(d=>{const x=data.find(o=>o.id===d.opportunityId);return '<article class="document-row"><div><h3>'+esc(d.kind)+'</h3><p>'+esc(x?.title||(d.imported?"Documento propio · sin oportunidad vinculada":"Oportunidad guardada"))+'</p><span class="storage-note">Borrador · '+new Date(d.updatedAt).toLocaleDateString('es-ES')+'</span></div><div class="dialog-actions"><button class="outline" data-preview="'+esc(d.id)+'">Vista previa</button><button class="outline" data-edit="'+esc(d.id)+'">Editar</button><button class="outline" data-download="'+esc(d.id)+'">Descargar Word o PDF</button>'+(x?'<button class="detail" data-opportunity="'+x.id+'">Ver oportunidad ↗</button>':'')+'</div></article>';}).join(''):'<div class="empty"><h3>Una idea que empieza a tomar forma.</h3><p>Elige una oportunidad y cuenta tu idea para crear la propuesta, la carta y la lista de requisitos.</p><button class="primary" id="first-documents">Crear documentos ↗</button></div>';
    panel.querySelector('#first-documents')?.addEventListener('click',()=>dialog.querySelector('#docs-new-tab').click());
    panel.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editor(b.dataset.edit,id));
    panel.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>{const d=records.find(r=>r.id===b.dataset.preview);ProyectaPreview(d.kind,ProyectaExport.text(d.content));});
    panel.querySelectorAll('[data-download]').forEach(b=>b.onclick=()=>download(b.dataset.download));
    panel.querySelectorAll('[data-opportunity]').forEach(b=>b.onclick=()=>{dialog.close();showDetail(+b.dataset.opportunity);});
  }
  function form(id){
    const panel=dialog.querySelector('#docs-panel');
    panel.innerHTML='<form id="create-documents"><label class="field">Modelo de documento<select name="model" id="document-model">'+Object.entries(documentModels).map(([key,model])=>'<option value="'+key+'">'+model.label+'</option>').join('')+'</select></label><p id="document-model-description" class="storage-note" aria-live="polite"></p><label class="field">Oferta, concurso o convocatoria<select name="opportunity" required>'+data.map(x=>'<option value="'+x.id+'" '+(x.id===id?'selected':'')+'>'+esc(x?.title||"Oportunidad guardada")+'</option>').join('')+'</select></label><p id="document-source" class="storage-note"></p><label class="field">Tu idea<textarea class="notes" name="idea" maxlength="6000" required placeholder="Cuenta qué quieres proponer, para quién y qué resultado buscas."></textarea></label><p>Los modelos reúnen tu idea y la información disponible en la ficha. Completa los campos entre corchetes con datos reales y adapta la extensión a las bases. Puedes editar, ver el PDF y descargar Word o PDF. Para tu CV, utiliza «Currículums» en el menú del radar.</p><button class="primary" type="submit">Crear y adjuntar los tres documentos ↗</button><p id="document-save-state" role="status"></p></form>';
    const f=panel.querySelector('form'),button=f.querySelector('[type="submit"]');
    function model(){const selected=documentModels[f.elements.model.value];panel.querySelector('#document-model-description').textContent=selected.detail;button.textContent=f.elements.model.value==='bundle3'?'Crear y adjuntar los tres documentos ↗':selected.kinds.length===1?'Crear este documento ↗':'Crear los seis documentos ↗';}
    function source(){const x=data.find(o=>o.id===+f.elements.opportunity.value);button.disabled=!x;f.elements.idea.disabled=!x;panel.querySelector('#document-source').textContent=x?'Estado: '+stateOf(x)+' · '+catalogText(x.verification||'Sin verificación')+' · Plazo: '+catalogText(x.deadline):'No hay oportunidades cargadas. Actualiza el radar o utiliza «Añadir mi documento» para trabajar con tu propio archivo.';if(x)f.elements.idea.value=projects[x.id]?.notes||'';}
    f.elements.model.onchange=model;f.elements.opportunity.onchange=source;model();source();
    f.onsubmit=e=>{e.preventDefault();const idea=f.elements.idea.value.trim();if(!idea){f.elements.idea.setCustomValidity('Escribe tu idea para crear los documentos.');f.elements.idea.reportValidity();return;}const x=data.find(o=>o.id===+f.elements.opportunity.value);if(!x){source();return;}const selected=documentModels[f.elements.model.value]||documentModels.bundle3;const now=new Date().toISOString();const created=selected.kinds.map(kind=>({id:crypto.randomUUID(),opportunityId:x.id,kind,content:draft(x,kind,idea),updatedAt:now}));records.push(...created);if(!save()){records.splice(-created.length);panel.querySelector('#document-save-state').textContent='No se han guardado. Libera espacio en el navegador y vuelve a intentarlo.';return;}if(!projects[x.id]&&stateOf(x)==='Abierta'){projects[x.id]={checks:[false,false,false],notes:idea.slice(0,4000)};persist();render();}openDocuments(x.id);toast(created.length===1?'Documento creado y vinculado a la oportunidad':created.length+' documentos creados y vinculados a la oportunidad');};
    f.elements.idea.oninput=()=>f.elements.idea.setCustomValidity('');
  }
  function importForm(id){
    const panel=dialog.querySelector('#docs-panel');
    panel.innerHTML='<form id="import-document"><h3>Tu documento, tu siguiente versión.</h3><p>Importa el texto de un Word .docx o un .txt y revísalo en el editor. Máximo 5 MB y 30.000 caracteres. No se sube a ningún servidor.</p><label class="field">Documento propio<input type="file" name="file" accept=".docx,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" required></label><p class="storage-note">Importamos texto, no el diseño ni las imágenes. PDF de entrada no está admitido; podrás descargar tu versión terminada en Word o PDF.</p><label class="field">Título para guardar (opcional)<input name="title" maxlength="140" placeholder="Mi dossier, mi propuesta, mi carta…"></label><label class="field">Oportunidad para adaptar (opcional)<select name="opportunity"><option value="">Sin vincular: editar mi documento</option>'+data.map(x=>'<option value="'+x.id+'" '+(x.id===id?'selected':'')+'>'+esc(x.title)+'</option>').join('')+'</select></label><label class="field">Qué quieres conseguir (opcional)<textarea class="notes" name="idea" maxlength="2000" placeholder="Explica el objetivo de esta versión."></textarea></label><label class="field">Requisitos que debes cumplir (opcional)<textarea class="notes" name="requirements" maxlength="5000" placeholder="Pega aquí las condiciones, extensión, formato o puntos que te solicitan."></textarea></label><p>Conservaremos tu texto y te mostraremos una guía para adaptarlo. Tú eliges qué cambiar; no añadimos experiencia ni titulaciones.</p><button class="primary" type="submit">Importar y abrir el editor ↗</button><p id="document-import-status" role="status"></p></form>';
    const f=panel.querySelector('form'),status=panel.querySelector('#document-import-status');
    f.onsubmit=async event=>{
      event.preventDefault();const button=f.querySelector('[type="submit"]');button.disabled=true;status.textContent='Leyendo el documento en este dispositivo…';
      try{
        const {readOwnDocument}=await import('/document-import.js');
        const imported=await readOwnDocument(f.elements.file.files[0]);
        if(!f.isConnected)return;
        const opportunity=data.find(o=>o.id===+f.elements.opportunity.value);
        const d={id:crypto.randomUUID(),opportunityId:opportunity?.id??null,kind:(f.elements.title.value.trim()||imported.filename.replace(/\.[^.]+$/,'')).slice(0,140),content:imported.text,updatedAt:new Date().toISOString(),imported:true,sourceFile:imported.filename,importNote:imported.note,adaptation:{idea:f.elements.idea.value.trim(),requirements:f.elements.requirements.value.trim()}};
        records.push(d);
        if(!save()){records.pop();throw Error('No se ha podido guardar. Descarga otros documentos o libera espacio en el navegador y reintenta.');}
        editor(d.id,id);toast('Documento importado. Revisa el texto antes de descargarlo.');
      }catch(error){if(f.isConnected)status.textContent=error.message||'No se ha podido abrir el archivo. Prueba una copia en .docx o .txt.';}
      finally{button.disabled=false;}
    };
  }
  function editor(docId,id){
    const d=records.find(o=>o.id===docId),panel=dialog.querySelector('#docs-panel');
    panel.innerHTML='<h3>'+esc(d.kind)+'</h3>'+(d.imported?'<p class="storage-note">'+esc(d.importNote||'Texto importado. Revisa el contenido antes de descargar.')+'</p><details class="document-adaptation" open><summary>Guía para adaptar tu documento</summary><div id="document-adaptation-guide"></div></details>':'')+'<label class="field">Contenido del documento<textarea class="notes document-editor" maxlength="30000" id="document-content">'+esc(d.content)+'</textarea></label><p id="document-status" role="status">Puedes editar el borrador y guardar los cambios.</p><div class="dialog-actions"><button class="outline" id="document-preview">Vista previa</button><button class="primary" id="document-save">Guardar cambios</button><button class="outline" id="document-download">Descargar Word o PDF</button><button class="outline" id="document-back">Volver a documentos</button></div>';
    if(d.imported){
      const guide=panel.querySelector('#document-adaptation-guide'),x=data.find(o=>o.id===d.opportunityId);
      const add=(title,value)=>{if(!value)return;const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=title+' ';p.append(strong,document.createTextNode(value));guide.append(p);};
      add('Tu objetivo:',d.adaptation?.idea);add('Tus requisitos:',d.adaptation?.requirements);
      if(x){add('Oportunidad:',x.title);add('Información de la ficha:',x.description);add('Requisitos de la ficha:',Array.isArray(x.requirements)?x.requirements.join(' · '):'Consulta las bases.');add('Estado y plazo:',stateOf(x)+' · '+x.deadline);}
      add('Revisión:', 'Relaciona tu experiencia real con lo que piden, elimina lo que no aporte y comprueba las bases. El texto original no se ha reescrito automáticamente. Esta guía no se incluye al descargar.');
    }
    const content=panel.querySelector('#document-content'),documentStatus=panel.querySelector('#document-status');
    function pendingFields(){const count=(content.value.match(/\[[^\]\n]{1,160}\]/g)||[]).length;documentStatus.textContent=count?'Quedan '+count+' campos entre corchetes por revisar. Puedes ver y descargar el borrador, pero complétalos antes de enviarlo.':'Puedes editar el borrador y guardar los cambios.';}
    content.addEventListener('input',pendingFields);pendingFields();
    panel.querySelector('#document-preview').onclick=()=>ProyectaPreview(d.kind,ProyectaExport.text(panel.querySelector('#document-content').value));
    panel.querySelector('#document-save').onclick=()=>{const previous={content:d.content,updatedAt:d.updatedAt};d.content=panel.querySelector('#document-content').value;d.updatedAt=new Date().toISOString();if(save()){pendingFields();documentStatus.textContent='Cambios guardados. '+documentStatus.textContent;}else Object.assign(d,previous);};
    panel.querySelector('#document-download').onclick=()=>{ProyectaExport.choose(d.kind+(data.find(o=>o.id===d.opportunityId)?.title?' - '+data.find(o=>o.id===d.opportunityId).title:''),ProyectaExport.text(panel.querySelector('#document-content').value));};
    panel.querySelector('#document-back').onclick=()=>list(id);
  }
  function download(id){const d=records.find(o=>o.id===id),x=data.find(o=>o.id===d.opportunityId);ProyectaExport.choose(d.kind+(x?.title?' - '+x.title:''),ProyectaExport.text(d.content));}
  function openFromHash(){if(location.hash==='#crear-documentos')openDocuments();else if(location.hash==='#importar-documento'){openDocuments();dialog.querySelector('#docs-import-tab').click();}}
  addEventListener('hashchange',openFromHash);openFromHash();
})();
