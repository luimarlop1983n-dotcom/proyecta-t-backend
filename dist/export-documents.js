/* Local document generation; no personal data leaves the browser. */
(() => {
  const normal=text=>String(text||'').replace(/□/g,'[ ]').replace(/\t/g,'    ');
  async function word(blocks){
    const {Document,Packer,Paragraph,TextRun}=docx;
    const children=blocks.flatMap(b=>normal(b.text).split('\n').map(line=>new Paragraph({spacing:{after:b.style==='title'?240:120},children:[new TextRun({text:line,font:'Calibri',size:b.style==='title'?40:b.style==='heading'?26:22,bold:b.style==='title'||b.style==='heading',color:b.style==='body'?'182234':'45325D'})]})));
    return Packer.toBlob(new Document({sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:964,right:964,bottom:964,left:964}}},children}]}));
  }
  async function pdf(blocks){
    const {PDFDocument,StandardFonts,rgb}=PDFLib, file=await PDFDocument.create();
    const regular=await file.embedFont(StandardFonts.Helvetica),bold=await file.embedFont(StandardFonts.HelveticaBold);
    let page,y;const newPage=()=>{page=file.addPage([595.28,841.89]);y=790;};newPage();
    for(const b of blocks){
      const font=b.style==='body'?regular:bold,size=b.style==='title'?22:b.style==='heading'?13:11,step=size*1.45;
      const text=normal(b.text);try{font.encodeText(text.replace(/\n/g,''));}catch{throw new Error('Este PDF contiene caracteres que esta fuente no admite. Elige Word para conservarlos.');}
      const lines=[];
      for(const paragraph of text.split('\n')){
        if(!paragraph){lines.push('');continue;}
        let line='';for(const character of paragraph){if(font.widthOfTextAtSize(line+character,size)>493&&line){const split=line.lastIndexOf(' ');if(split>0){lines.push(line.slice(0,split));line=line.slice(split+1)+character;}else{lines.push(line);line=character;}}else line+=character;}lines.push(line);
      }
      if(b.style!=='body'&&y<70+step*2)newPage();
      for(const line of lines){if(y<51+step)newPage();if(line)page.drawText(line,{x:51,y,font,size,color:b.style==='body'?rgb(.094,.133,.204):rgb(.27,.196,.365)});y-=step;}y-=8;
    }
    return new Blob([await file.save()],{type:'application/pdf'});
  }
  function choose(name,blocks){
    const dialog=document.createElement('dialog');dialog.className='documents-dialog export-dialog';
    dialog.innerHTML='<form><h2 id="export-title">Descargar documento</h2><label class="field">Formato<select name="format"><option value="docx">Word (.docx) · editable</option><option value="pdf">PDF (.pdf) · para compartir</option></select></label><p>Se descargará una copia de este documento. El original seguirá vinculado a tu oportunidad.</p><p role="status"></p><div class="dialog-actions"><button class="primary" type="submit">Descargar</button><button class="outline" type="button">Cancelar</button></div></form>';
    dialog.setAttribute('aria-labelledby','export-title');document.body.append(dialog);
    dialog.addEventListener('close',()=>dialog.remove());dialog.querySelector('[type=button]').onclick=()=>dialog.close();
    dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();const button=dialog.querySelector('[type=submit]'),status=dialog.querySelector('[role=status]');button.disabled=true;status.textContent='Preparando tu documento…';try{const format=dialog.querySelector('select').value,blob=await (format==='pdf'?pdf(blocks):word(blocks));await window.ProyectaDownload(blob,(name||'Documento').replace(/[^\p{L}\p{N} ._-]/gu,'').slice(0,120)+'.'+format);dialog.close();toast('Descarga preparada');}catch(error){status.textContent=error.message||'No se pudo preparar la descarga. Vuelve a intentarlo.';}finally{button.disabled=false;}};
    dialog.showModal();
  }
  globalThis.ProyectaExport={word,pdf,choose,text:content=>String(content).split('\n').map((text,i)=>({text,style:i===0?'title':text.length>0&&text===text.toUpperCase()&&!text.startsWith('[')?'heading':'body'}))};
})();
