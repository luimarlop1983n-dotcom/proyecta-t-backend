/* Build and display the exact PDF used by download. Everything stays on this device. */
(() => {
 const loading=new Map();
 function script(src,ready){
  if(ready())return Promise.resolve();
  if(!loading.has(src))loading.set(src,new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=()=>ready()?resolve():reject(Error('No se pudo cargar el editor de documentos.'));s.onerror=()=>reject(Error('No se pudo cargar el editor. Recupera internet y vuelve a intentarlo.'));document.head.append(s);}).catch(error=>{loading.delete(src);throw error;}));
  return loading.get(src);
 }
 async function exporter(){await script('/vendor/pdf-lib.js',()=>!!globalThis.PDFLib);await script('/export-documents.js',()=>!!globalThis.ProyectaExport);return globalThis.ProyectaExport;}
 function filename(title,extension){return (String(title||'Documento').replace(/[^\p{L}\p{N} ._-]/gu,'').slice(0,120)||'Documento')+'.'+extension;}
 async function save(blob,name){
  if(globalThis.ProyectaDownload)return globalThis.ProyectaDownload(blob,name);
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 window.ProyectaPreview=(title,input,options={})=>{
  const blocks=(Array.isArray(input)?input:[{style:'body',text:String(input??'')}]).map(b=>({style:['title','heading'].includes(b.style)?b.style:'body',text:String(b.text??'')}));
  const native=!!window.Capacitor?.isNativePlatform?.();
  const embedded=!native&&navigator.pdfViewerEnabled===true&&!/Android|iPhone|iPad|iPod/.test(navigator.userAgent);
  const dialog=document.createElement('dialog');dialog.className='document-preview';dialog.setAttribute('aria-label','Vista previa del documento');
  const heading=document.createElement('h2');heading.textContent='Vista previa · '+title;
  const note=document.createElement('p');note.textContent='Se genera aquí el PDF que puedes abrir y descargar. Tu documento no se envía a ningún servidor.';
  const status=document.createElement('p');status.className='preview-status';status.setAttribute('role','status');status.textContent='Preparando vista previa PDF…';
  const layoutLabel=document.createElement('label');layoutLabel.className='preview-layout';layoutLabel.textContent='Presentación del documento';
  const layout=document.createElement('select');layout.setAttribute('aria-label','Presentación del documento');for(const [value,label] of [['classic','Clásico'],['editorial','Editorial'],['compact','Compacto']]){const option=document.createElement('option');option.value=value;option.textContent=label;layout.append(option);}layout.value=['classic','editorial','compact'].includes(options.layout)?options.layout:'classic';layoutLabel.append(layout);
  const layoutNote=document.createElement('p');layoutNote.className='preview-layout-note';
  const actions=document.createElement('div');actions.className='preview-actions';
  const pdf=document.createElement('button');pdf.type='button';pdf.textContent='Descargar PDF';pdf.disabled=true;
  const word=document.createElement('button');word.type='button';word.textContent='Descargar Word';
  const open=document.createElement('a');open.className='preview-open';open.textContent=native?'Abrir o guardar PDF':'Abrir PDF en otra pestaña';open.target='_blank';open.rel='noopener';open.hidden=true;
  const close=document.createElement('button');close.type='button';close.className='preview-close';close.textContent='Volver al documento';close.onclick=()=>dialog.close();
  actions.append(pdf,word,open,close);
  const frame=document.createElement('iframe');frame.className='preview-pdf';frame.title='Vista previa PDF real';frame.hidden=true;
  const fallback=document.createElement('details');fallback.className='preview-text';fallback.open=!embedded;
  const summary=document.createElement('summary');summary.textContent='Texto de respaldo · no muestra la maquetación PDF';
  const paper=document.createElement('article');paper.className='preview-paper';paper.setAttribute('aria-label','Contenido del documento');
  for(const block of blocks){const el=document.createElement(block.style==='title'?'h2':block.style==='heading'?'h3':'p');el.textContent=block.text;paper.append(el);}
  fallback.append(summary,paper);dialog.append(heading,note,layoutLabel,layoutNote,actions,status,frame,fallback);document.body.append(dialog);
  let blob,url,closed=false,generation=0;
  dialog.addEventListener('close',()=>{closed=true;if(url)URL.revokeObjectURL(url);dialog.remove();},{once:true});
  function fail(error){if(closed)return;status.textContent=error?.message||'No se pudo preparar el PDF. Puedes revisar el texto y descargar Word.';fallback.open=true;}
  pdf.onclick=async()=>{if(!blob)return;pdf.disabled=true;try{await save(blob,filename(title,'pdf'));status.textContent='PDF preparado para guardar. Es el mismo archivo de esta vista previa.';}catch(error){fail(error);}finally{pdf.disabled=false;}};
  word.onclick=async()=>{const selectedLayout=layout.value;word.disabled=true;layout.disabled=true;try{await script('/vendor/docx.js',()=>!!globalThis.docx);const api=await exporter();await save(await api.word(blocks,{layout:selectedLayout}),filename(title,'docx'));status.textContent='Word editable preparado para guardar.';}catch(error){fail(error);}finally{word.disabled=false;layout.disabled=false;}};
  open.onclick=async e=>{if(native){e.preventDefault();try{await save(blob,filename(title,'pdf'));status.textContent='Elige una app para abrir el PDF o guarda el archivo y ábrelo con tu visor.';}catch(error){fail(error);}}};
  dialog.showModal();close.focus();
  function regenerate(){
   const ticket=++generation,selectedLayout=layout.value;blob=null;pdf.disabled=true;open.hidden=true;frame.hidden=true;frame.removeAttribute('src');if(url){URL.revokeObjectURL(url);url=null;}status.textContent='Preparando vista previa PDF…';
   exporter().then(api=>{if(closed||ticket!==generation)return null;layoutNote.textContent=api.layouts?.[selectedLayout]?.description||'';return (api.buildPdf||api.pdf)(blocks,{layout:selectedLayout});}).then(result=>{
    if(closed||ticket!==generation||!result)return;blob=result;url=URL.createObjectURL(blob);pdf.disabled=false;open.href=url;open.hidden=false;dialog.dataset.previewLayout=selectedLayout;
    if(embedded){frame.src=url+'#view=FitH';frame.hidden=false;status.textContent='Vista PDF lista. Si tu navegador no la muestra, pulsa Abrir PDF o consulta el texto de respaldo.';}
    else status.textContent='PDF listo. Este dispositivo puede necesitar un visor externo: pulsa Abrir o guardar PDF, o descarga el archivo. Debajo tienes el texto de respaldo.';
   }).catch(error=>{if(ticket===generation)fail(error);});
  }
  layout.onchange=()=>{options.onLayoutChange?.(layout.value);regenerate();};regenerate();
  return dialog;
 };
})();
