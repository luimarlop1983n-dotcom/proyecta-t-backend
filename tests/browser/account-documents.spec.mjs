import {test,expect} from '@playwright/test';

async function dossier(page){
 await page.addInitScript(()=>localStorage.setItem('pplus_token','account-documents-fixture'));
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const content=path==='/api/me'?{name:'Luz',discipline:'Teatro',location:'Madrid',interests:'Creación'}:
   path==='/api/opportunities'?[{id:1,title:'Residencia de creación',verified:true,status:'verified',type:'Residencia',source:'https://example.org/bases',eligibility:{eligible:true,complete:true}}]:
   path==='/api/dossier'?{bio:'Mi trayectoria',motivation:'Mi propuesta',checklist:['Revisar bases']}:
   path==='/api/community'?{visits:0,helped:0}:[];
  await route.fulfill({json:content});
 });
 await page.goto('/cuenta/index.html#dossier');
 await page.locator('#dossierOpp').selectOption('1');
 await page.locator('#focus').fill('Una propuesta escénica sobre la memoria');
 await page.locator('#generate').click();
 await expect(page.locator('#draft')).toHaveValue(/Mi trayectoria/);
}

test('account downloads real Word and PDF from the current named draft',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await dossier(page);
 await expect(page.locator('#draftName')).toHaveValue('Dossier · Residencia de creación');
 await page.locator('#draftName').fill('Propuesta de Luz');
 await page.locator('#draft').fill('BIO\nÚltima edición sin guardar\n\nANTES DE ENVIAR\n☐ Revisar bases');
 await page.evaluate(()=>{
  window.testExports=[];window.testDownloads=[];
  const choose=window.ProyectaExport.choose;
  window.ProyectaExport.choose=(name,blocks)=>{window.testExports.push({name,blocks});return choose(name,blocks);};
  window.ProyectaDownload=async(blob,name)=>{const bytes=new Uint8Array(await blob.arrayBuffer());window.testDownloads.push({name,type:blob.type,size:blob.size,signature:Array.from(bytes.slice(0,5))});};
 });
 for(const format of ['docx','pdf']){
  await page.locator('#download').click();
  await page.locator('.export-dialog [name=format]').selectOption(format);
  await page.locator('.export-dialog button[type="submit"]').click();
  await expect(page.locator('.export-dialog')).toHaveCount(0);
 }
 const {exports,downloads}=await page.evaluate(()=>({exports:window.testExports,downloads:window.testDownloads}));
 expect(exports).toHaveLength(2);
 for(const entry of exports){expect(entry.name).toBe('Propuesta de Luz');expect(entry.blocks[0]).toEqual({style:'title',text:'Propuesta de Luz'});expect(entry.blocks.map(b=>b.text).join('\n')).toContain('Última edición sin guardar');}
 expect(downloads).toHaveLength(2);
 expect(downloads[0].name).toBe('Propuesta de Luz.docx');expect(downloads[0].signature.slice(0,2)).toEqual([80,75]);
 expect(downloads[1].name).toBe('Propuesta de Luz.pdf');expect(downloads[1].type).toBe('application/pdf');expect(downloads[1].signature).toEqual([37,80,68,70,45]);
 expect(downloads.every(d=>d.size>500)).toBeTruthy();
 expect(errors).toEqual([]);
});

test('account offers an import route and keeps export controls within mobile width',async({page})=>{
 await dossier(page);
 await expect(page.locator('#import-document')).toHaveAttribute('href','/radar.html#importar-documento');
 await expect(page.locator('#dossier')).toContainText('Word (.docx) o texto (.txt)');
 await page.locator('#download').click();
 expect(await page.locator('.export-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBeTruthy();
 await page.locator('.export-dialog [data-cancel]').click();
 await expect(page.locator('#draft')).toHaveValue(/Mi trayectoria/);
});
