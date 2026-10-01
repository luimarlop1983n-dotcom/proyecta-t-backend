/* Render user text as text nodes, never as HTML. */
window.ProyectaPreview=(title,blocks)=>{
 const dialog=document.createElement('dialog');dialog.className='document-preview';
 const heading=document.createElement('h2');heading.textContent='Vista previa · '+title;
 const note=document.createElement('p');note.textContent='Revisa el contenido antes de descargarlo. El formato final puede variar entre Word y PDF.';
 const paper=document.createElement('article');paper.className='preview-paper';paper.setAttribute('aria-label','Contenido del documento');
 for(const block of blocks){const el=document.createElement(block.style==='title'?'h2':block.style==='heading'?'h3':'p');el.textContent=block.text;paper.append(el);}
 const close=document.createElement('button');close.type='button';close.className='primary';close.textContent='Volver al documento';close.onclick=()=>dialog.close();
 dialog.append(heading,note,paper,close);dialog.setAttribute('aria-label','Vista previa del documento');document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();close.focus();
};
