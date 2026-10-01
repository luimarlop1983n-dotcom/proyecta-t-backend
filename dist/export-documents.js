/* Local document generation; no personal data leaves the browser. */
(() => {
  const normal=text=>String(text||'').replace(/[□☐]/g,'[ ]').replace(/\t/g,'    ');
  const layouts={
    classic:{label:'Clásico',description:'Limpio y neutral. Solicitudes, cartas y documentos institucionales.',regular:'Helvetica',bold:'HelveticaBold',wordFont:'Arial',margin:54,title:22,heading:13,body:11,leading:1.45,gap:8,color:'20252D'},
    editorial:{label:'Editorial',description:'Tipografía con serif y violeta discreto. Dossieres y proyectos creativos.',regular:'TimesRoman',bold:'TimesRomanBold',wordFont:'Times New Roman',margin:58,title:26,heading:14,body:11.5,leading:1.45,gap:10,color:'45325D'},
    compact:{label:'Compacto',description:'Espacio optimizado, sin perder legibilidad. Currículums y memorias extensas.',regular:'Helvetica',bold:'HelveticaBold',wordFont:'Arial',margin:40,title:18,heading:12,body:10.5,leading:1.3,gap:5,color:'20252D'}
  };
  const layoutName=options=>Object.hasOwn(layouts,options?.layout)?options.layout:'classic';
  const textColor='182234';
  async function word(blocks,options={}){
    const c=layouts[layoutName(options)],{Document,Packer,Paragraph,TextRun}=docx;
    const children=blocks.map(b=>{const style=['title','heading'].includes(b.style)?b.style:'body';return new Paragraph({spacing:{after:c.gap*20,line:Math.round(c.leading*240)},keepNext:style!=='body',widowControl:true,children:normal(b.text).split('\n').map((line,i)=>new TextRun({text:line,...(i?{break:1}:{}),font:c.wordFont,size:c[style]*2,bold:style!=='body',color:style==='body'?textColor:c.color}))});});
    const margin=c.margin*20;
    return Packer.toBlob(new Document({sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:margin,right:margin,bottom:margin,left:margin}}},children}]}));
  }
  async function pdf(blocks,options={}){
    const c=layouts[layoutName(options)],{PDFDocument,StandardFonts,rgb}=PDFLib,file=await PDFDocument.create();
    file.setSubject('Presentación '+c.label+' · Proyecta-T');
    const regular=await file.embedFont(StandardFonts[c.regular]),bold=await file.embedFont(StandardFonts[c.bold]);
    const color=hex=>rgb(...hex.match(/../g).map(v=>parseInt(v,16)/255));
    let page,y;const newPage=()=>{page=file.addPage([595.28,841.89]);y=841.89-c.margin;};newPage();
    for(const b of blocks){
      const style=['title','heading'].includes(b.style)?b.style:'body',font=style==='body'?regular:bold,size=c[style],step=size*c.leading;
      const text=normal(b.text);try{font.encodeText(text.replace(/\n/g,''));}catch{throw new Error('Este PDF contiene caracteres que esta fuente no admite. Elige Word para conservarlos.');}
      const lines=[];
      for(const paragraph of text.split('\n')){
        if(!paragraph){lines.push('');continue;}
        let line='';for(const character of paragraph){if(font.widthOfTextAtSize(line+character,size)>595.28-c.margin*2&&line){const split=line.lastIndexOf(' ');if(split>0){lines.push(line.slice(0,split));line=line.slice(split+1)+character;}else{lines.push(line);line=character;}}else line+=character;}lines.push(line);
      }
      if(style!=='body'&&y<c.margin+step*3)newPage();
      for(const line of lines){if(y<c.margin+step)newPage();if(line)page.drawText(line,{x:c.margin,y,font,size,color:color(style==='body'?textColor:c.color)});y-=step;}y-=c.gap;
    }
    return new Blob([await file.save()],{type:'application/pdf'});
  }
  function choose(name,blocks,options={}){
    const dialog=document.createElement('dialog');dialog.className='documents-dialog export-dialog';
    dialog.innerHTML='<form><h2 id="export-title">Descargar documento</h2><label class="field">Formato<select name="format"><option value="docx">Word (.docx) · editable</option><option value="pdf">PDF (.pdf) · para compartir</option></select></label><label class="field">Presentación del documento<select name="layout"><option value="classic">Clásico</option><option value="editorial">Editorial</option><option value="compact">Compacto</option></select></label><p data-layout-description></p><p>Se descargará una copia de este documento. Puedes seguir editando el documento al cerrar esta ventana.</p><p role="status"></p><div class="dialog-actions"><button class="primary" type="submit">Descargar</button><button class="outline" type="button" data-preview>Vista previa</button><button class="outline" type="button" data-cancel>Cancelar</button></div></form>';
    dialog.setAttribute('aria-labelledby','export-title');document.body.append(dialog);
    const layout=dialog.querySelector('[name=layout]'),description=dialog.querySelector('[data-layout-description]');layout.value=layoutName(options);const updateDescription=()=>{description.textContent=layouts[layout.value].description;};layout.onchange=updateDescription;updateDescription();
    dialog.addEventListener('close',()=>dialog.remove());dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();dialog.querySelector('[data-preview]').onclick=()=>ProyectaPreview(name,blocks,{layout:layout.value,onLayoutChange:value=>{layout.value=value;updateDescription();}});
    dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();const button=dialog.querySelector('[type=submit]'),status=dialog.querySelector('[role=status]');button.disabled=true;layout.disabled=true;status.textContent='Preparando tu documento…';try{const format=dialog.querySelector('[name=format]').value,settings={layout:layout.value},blob=await (format==='pdf'?pdf(blocks,settings):word(blocks,settings));await window.ProyectaDownload(blob,(name||'Documento').replace(/[^\p{L}\p{N} ._-]/gu,'').slice(0,120)+'.'+format);dialog.close();globalThis.toast?.('Descarga preparada');}catch(error){status.textContent=error.message||'No se pudo preparar la descarga. Vuelve a intentarlo.';}finally{button.disabled=false;layout.disabled=false;}};
    dialog.showModal();
  }
  globalThis.ProyectaExport={word,pdf,buildPdf:pdf,choose,layouts,text:content=>String(content).split('\n').map((text,i)=>({text,style:i===0?'title':text.length>0&&text===text.toUpperCase()&&!text.startsWith('[')?'heading':'body'}))};
})();
