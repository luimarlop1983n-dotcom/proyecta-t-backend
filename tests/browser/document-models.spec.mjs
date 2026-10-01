import {test,expect} from '@playwright/test';
const key='proyectat-created-documents-v1';
const opportunity={id:42,title:'Arte & oficio <laboratorio>',org:'Centro cultural',summary:'Crear una pieza contemporánea.',type:'Residencia',location:'València',categories:['Artesanía'],status:'verified',verified:true,source:'https://example.org/bases?area=arte&modalidad=residencia',deadline:'2099-12-30',last_checked_at:'2026-10-01T09:00:00Z',last_activity_at:'2026-10-01T09:00:00Z',eligibility_notes:'Presentar una memoria y una muestra.'};
async function openModels(page,rows=[opportunity]){
 await page.route('**/api/catalog?**',route=>route.fulfill({json:rows}));
 await page.goto('/radar.html#crear-documentos');
 await expect(page.locator('#catalog-notice')).toContainText('Verificadas con evidencia');
 await page.getByRole('tab',{name:'Crear documentos',exact:true}).click();
}
const records=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'[]'),key);

test('default essential package still creates three editable documents',async({page})=>{
 await openModels(page);
 await expect(page.locator('#document-model')).toHaveValue('bundle3');
 await page.getByLabel('Tu idea',{exact:true}).fill('Un taller de cerámica accesible.');
 await page.getByRole('button',{name:'Crear y adjuntar los tres documentos'}).click();
 await expect(page.locator('.document-row')).toHaveCount(3);
 const rows=await records(page);
 expect(rows.map(d=>d.kind)).toEqual(['Propuesta','Carta de presentación','Lista de requisitos']);
 expect(rows[0].content).toContain('8. EVALUACIÓN Y CONTINGENCIAS');
 expect(rows.every(d=>d.content.includes('Un taller de cerámica accesible.'))).toBeTruthy();
});

test('one selected model creates only a budget with explicit pending figures',async({page})=>{
 await openModels(page);
 await page.getByLabel('Modelo de documento').selectOption('budget');
 await expect(page.locator('#document-model-description')).toContainText('cantidades');
 await page.getByLabel('Tu idea',{exact:true}).fill('Diseñar una colección de cerámica.');
 await page.getByRole('button',{name:'Crear este documento'}).click();
 await expect(page.locator('.document-row')).toHaveCount(1);
 const [budget]=await records(page);
 expect(budget.kind).toBe('Presupuesto');
 expect(budget.content).toContain('[Cantidad/unidad]');expect(budget.content).toContain('[IVA u otro impuesto aplicable]');expect(budget.content).toContain('No hay importes ni cálculos automáticos');
 await page.locator('[data-edit]').click();
 await expect(page.locator('#document-content')).toHaveValue(budget.content);
 await expect(page.locator('#document-status')).toContainText('campos entre corchetes');
});

test('complete package creates all six models with source provenance and no fabricated experience',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await openModels(page);
 await page.getByLabel('Modelo de documento').selectOption('bundle6');
 await page.getByLabel('Tu idea',{exact:true}).fill('Un laboratorio creativo con muestras públicas.');
 await page.getByRole('button',{name:'Crear los seis documentos'}).click();
 await expect(page.locator('.document-row')).toHaveCount(6);
 const rows=await records(page);
 expect(rows.map(d=>d.kind)).toEqual(['Propuesta','Carta de presentación','Dossier profesional','Presupuesto','Calendario y plan de trabajo','Lista de requisitos']);
 for(const doc of rows){
  expect(doc.content).toContain('Arte & oficio <laboratorio>');expect(doc.content).not.toContain('&amp;');
  expect(doc.content).toContain(opportunity.source);expect(doc.content).toContain('2026-10-01');expect(doc.content).toContain('2099-12-30');expect(doc.content).toContain('Verificación de la ficha: Verificada');
  expect(doc.content).toContain('Un laboratorio creativo con muestras públicas.');expect(doc.content.length).toBeLessThan(30000);
 }
 expect(rows.find(d=>d.kind==='Dossier profesional').content).toContain('[Por cada experiencia:');
 expect(rows.find(d=>d.kind==='Calendario y plan de trabajo').content).toContain('[Responsable]');
 expect(rows.find(d=>d.kind==='Lista de requisitos').content).toContain('Presentar una memoria y una muestra.');
 expect(errors).toEqual([]);
});

test('empty catalog disables model creation while own document import remains available',async({page})=>{
 await openModels(page,[]);
 await expect(page.locator('#create-documents [type=submit]')).toBeDisabled();
 await expect(page.locator('#document-source')).toContainText('No hay oportunidades cargadas');
 await page.getByLabel('Modelo de documento').selectOption('dossier');
 await expect(page.locator('#create-documents [type=submit]')).toBeDisabled();
 await page.getByRole('tab',{name:'Añadir mi documento',exact:true}).click();
 await expect(page.locator('#import-document [name=file]')).toBeEnabled();
});
