import {test, expect} from '@playwright/test';
const savedKey = 'proyectat-created-documents-v1';
async function openImport(page) {
  await page.goto('/radar.html#importar-documento');
  await expect(page.locator('#import-document')).toBeVisible();
}
async function pickText(page, text, name = 'mi-documento.txt') {
  await page.locator('#import-document [name=file]').setInputFiles({name, mimeType: 'text/plain', buffer: Buffer.from(text)});
}
async function importChosen(page) { await page.getByRole('button', {name: 'Importar y abrir el editor'}).click(); }

test('imports local text, preserves facts and treats markup as text', async ({page}) => {
  const outgoing = [];
  page.on('request', request => { if (request.method() === 'POST') outgoing.push(request.postData() || ''); });
  await openImport(page);
  const original = 'Me llamo Ada. Estudié peluquería en 2024.\n<img src=x onerror=alert(1)>\nNo tengo experiencia en gestión.';
  await pickText(page, original);
  await page.getByLabel('Título para guardar').fill('Mi candidatura');
  await page.getByLabel('Qué quieres conseguir').fill('Solicitar prácticas en un salón');
  await page.getByLabel('Requisitos que debes cumplir').fill('Una página y disponibilidad los lunes');
  await importChosen(page);
  await expect(page.locator('#document-content')).toHaveValue(original);
  await expect(page.locator('#document-adaptation-guide')).toContainText('Solicitar prácticas');
  await expect(page.locator('#document-adaptation-guide')).toContainText('Una página');
  await expect(page.locator('.documents-dialog img')).toHaveCount(0);
  expect(outgoing.join(' ')).not.toContain('Me llamo Ada');
  await page.locator('#document-content').fill(original + '\nBusco prácticas de peluquería.');
  await page.locator('#document-save').click();
  await page.reload();
  await page.getByRole('tab', {name: 'Documentos creados', exact: true}).click();
  await expect(page.locator('.document-row')).toContainText('Mi candidatura');
  await expect(page.locator('[data-opportunity]')).toHaveCount(0);
  await page.locator('[data-edit]').click();
  await expect(page.locator('#document-content')).toHaveValue(original + '\nBusco prácticas de peluquería.');
  const rows = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), savedKey);
  expect(rows[0].opportunityId).toBeNull();
  expect(rows[0].content).not.toContain('Una página');
  expect(await page.locator('.documents-dialog[open]').evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBeTruthy();
});

test('imports a real compressed Word document and warns about format loss', async ({page}) => {
  await openImport(page);
  const bytes = await page.evaluate(async () => {
    const {Document, Packer, Paragraph, TextRun} = window.docx;
    const blob = await Packer.toBlob(new Document({sections:[{children:[new Paragraph({children:[new TextRun('Mi experiencia real: '),new TextRun({text:'dos talleres de cerámica.',bold:true})]}),new Paragraph('Formación: escuela de artes.')] }]}));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  await page.locator('#import-document [name=file]').setInputFiles({name: 'curriculum.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from(bytes)});
  await importChosen(page);
  await expect(page.locator('#document-content')).toHaveValue('Mi experiencia real: dos talleres de cerámica.\nFormación: escuela de artes.');
  await expect(page.locator('.documents-dialog[open]')).toContainText('Imágenes, diseño, encabezados, notas y comentarios no se conservan');
});

test('works without catalog and rejects PDF, damaged Word and overlong text honestly', async ({page}) => {
  await page.route('**/api/catalog?**', route => route.abort());
  await openImport(page);
  await pickText(page, '%PDF-1.7', 'documento.pdf');
  await importChosen(page);
  await expect(page.locator('#document-import-status')).toContainText('Admitimos Word .docx y texto .txt');
  await pickText(page, 'not a zip', 'documento.docx');
  await importChosen(page);
  await expect(page.locator('#document-import-status')).toContainText('No se puede leer este Word');
  await pickText(page, 'a'.repeat(30001));
  await importChosen(page);
  await expect(page.locator('#document-import-status')).toContainText('no se ha recortado nada');
  await pickText(page, 'a'.repeat(5 * 1024 * 1024 + 1));
  await importChosen(page);
  await expect(page.locator('#document-import-status')).toContainText('supera 5 MB');
  expect(await page.evaluate(key => localStorage.getItem(key), savedKey)).toBeNull();
  await pickText(page, 'Documento sin oferta.');
  await importChosen(page);
  await expect(page.locator('#document-content')).toHaveValue('Documento sin oferta.');
});

test('does not claim saving when browser storage is full', async ({page}) => {
  await openImport(page);
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(name, value) { if (name === key) throw new DOMException('Quota exceeded', 'QuotaExceededError'); return original.call(this, name, value); };
  }, savedKey);
  await pickText(page, 'Texto que debo conservar.');
  await importChosen(page);
  await expect(page.locator('#document-import-status')).toContainText('No se ha podido guardar');
  await expect(page.getByRole('button', {name: 'Importar y abrir el editor'})).toBeEnabled();
  await page.getByRole('tab', {name: 'Documentos creados', exact: true}).click();
  await expect(page.locator('.document-row')).toHaveCount(0);
});

test('keyboard reaches import tab and unfinished fields are identified', async ({page}) => {
  await page.goto('/radar.html#crear-documentos');
  await page.getByRole('tab', {name: 'Documentos creados', exact: true}).focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', {name: 'Añadir mi documento'})).toHaveAttribute('aria-selected', 'true');
  await pickText(page, 'Mi nombre es [Tu nombre].\nExperiencia: [Completa tu experiencia real].');
  await importChosen(page);
  await expect(page.locator('#document-status')).toContainText('Quedan 2 campos');
  await page.locator('#document-content').fill('Mi nombre es Ada. Experiencia: un taller de cerámica.');
  await expect(page.locator('#document-status')).not.toContainText('Quedan');
});
