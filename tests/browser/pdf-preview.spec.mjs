import {test,expect} from '@playwright/test';
async function prepare(page){
 await page.goto('/radar.html');await page.waitForFunction(()=>!!window.ProyectaPreview&&!!window.ProyectaExport);
 await page.evaluate(()=>{window.ProyectaDownload=async(blob,name)=>{window.savedPreview={name,type:blob.type,bytes:Array.from(new Uint8Array(await blob.arrayBuffer()))};};});
}
test('PDF preview downloads the exact displayed PDF bytes and generates multiple A4 pages',async({page})=>{
 await prepare(page);await page.evaluate(()=>{Object.defineProperty(navigator,'pdfViewerEnabled',{value:true,configurable:true});ProyectaPreview('Mi dossier',[{style:'title',text:'MI PROYECTO'},{style:'body',text:'☐ Leer bases\n'+('Trayectoria y aportación profesional. '.repeat(180))}]);});
 await expect(page.locator('.preview-pdf')).toBeVisible();await expect(page.locator('.preview-status')).toContainText('Vista PDF lista');
 const original=await page.locator('.preview-pdf').evaluate(async frame=>{const bytes=new Uint8Array(await(await fetch(frame.src.split('#')[0])).arrayBuffer());const pdf=await PDFLib.PDFDocument.load(bytes);return{bytes:Array.from(bytes),pages:pdf.getPageCount(),width:pdf.getPage(0).getWidth()};});
 expect(original.pages).toBeGreaterThan(1);expect(original.width).toBeCloseTo(595.28,1);expect(String.fromCharCode(...original.bytes.slice(0,4))).toBe('%PDF');await page.getByRole('button',{name:'Descargar PDF',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.savedPreview?.bytes)).toEqual(original.bytes);
 await page.getByRole('button',{name:'Descargar Word',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.savedPreview?.name)).toBe('Mi dossier.docx');const word=await page.evaluate(()=>window.savedPreview);expect(word.bytes.slice(0,2)).toEqual([80,75]);
});
test('native preview clearly offers external PDF and safe text fallback',async({page})=>{
 await prepare(page);await page.evaluate(()=>{window.Capacitor={isNativePlatform:()=>true};ProyectaPreview('Mi documento','Texto actual sin guardar\n<img src=x onerror=alert(1)>');});
 await expect(page.locator('.preview-status')).toContainText('visor externo');await expect(page.locator('.preview-pdf')).toBeHidden();await expect(page.locator('.preview-paper')).toContainText('Texto actual sin guardar');await expect(page.locator('.preview-paper img')).toHaveCount(0);await page.getByRole('link',{name:'Abrir o guardar PDF'}).click();await expect.poll(()=>page.evaluate(()=>window.savedPreview?.type)).toBe('application/pdf');expect(await page.locator('.document-preview').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBeTruthy();
});
test('unsupported PDF characters keep Word available and identify the PDF failure',async({page})=>{
 await prepare(page);await page.evaluate(()=>ProyectaPreview('Proyecto',[{style:'body',text:'Un proyecto con 漢字'}]));await expect(page.locator('.preview-status')).toContainText('Elige Word');await expect(page.getByRole('button',{name:'Descargar PDF',exact:true})).toBeDisabled();await expect(page.locator('.preview-paper')).toBeVisible();await page.getByRole('button',{name:'Descargar Word',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.savedPreview?.name)).toBe('Proyecto.docx');
});
