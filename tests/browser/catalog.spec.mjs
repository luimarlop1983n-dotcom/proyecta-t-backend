import {test,expect} from '@playwright/test';
test('live catalog categories, stale archive, tools and training',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/radar.html');await expect(page.locator('#catalog-notice')).toContainText('Verificadas con evidencia');
 await expect(page.locator('#cards .card')).not.toHaveCount(0);
 for(const area of ['Tatuaje','Peluquería','Estética','Maquillaje','Estilismo/Moda','Joyería','Artesanía','Sonido','Iluminación'])await expect(page.locator(`[data-area="${area}"]`)).toBeVisible();
 await page.locator('[data-area="Peluquería"]').click();await expect(page.locator('#cards')).toContainText('Milano');
 await page.locator('#cards [data-detail]').first().click();await expect(page.locator('#detail-dialog')).toBeVisible();await expect(page.locator('#detail-dialog')).toContainText('Verificada');await page.locator('#detail-dialog [data-close]').first().click();
 await page.locator('[data-area="Tatuaje"]').click();await expect(page.locator('#cards .card')).toHaveCount(0);
 await page.locator('[data-collection="check"]').click();await expect(page.locator('#cards')).toContainText('Noble');
 await page.locator('[data-area="Fotografía"]').click();await page.locator('[data-collection="archive"]').click();await expect(page.locator('#cards')).toContainText('anuncio antiguo');
 await page.getByRole('button',{name:'Documentos creados',exact:true}).click();await expect(page.locator('.documents-dialog[open]')).toBeVisible();await page.locator('.documents-dialog [data-close]').first().click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.goto('/estudios.html');await expect(page.locator('#training-status')).toContainText('62 programas');await page.locator('#training-area').selectOption('Tatuaje');await page.locator('#training-mode').selectOption('Online');await expect(page.locator('#training-cards .study')).toHaveCount(1);await expect(page.locator('#training-cards')).toContainText('Noble');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();expect(errors).toEqual([]);
});
test('catalog refuses to display stale data as available after network failure',async({page})=>{
 await page.goto('/radar.html');await expect(page.locator('#cards .card')).not.toHaveCount(0);
 await page.route('**/api/catalog?**',r=>r.abort());await page.locator('#catalog-notice').click();await expect(page.locator('#catalog-notice')).toContainText('No se pudo actualizar');await expect(page.locator('#cards .card')).toHaveCount(0);
});
test('training combines community, modality, title and provider independently',async({page})=>{
 await page.goto('/estudios.html');await expect(page.locator('#training-overview')).toContainText('62 programas verificados');
 await page.locator('#training-region').selectOption('Cataluña');await page.locator('#training-mode').selectOption('Presencial');await page.locator('#training-credential').selectOption('Oficial');await page.locator('#training-provider').selectOption('Privado');
 await expect(page.locator('#training-cards .study')).toHaveCount(3);await expect(page.locator('#training-cards')).toContainText('Taller de Músics');
 await page.locator('#training-reset').click();await page.locator('#training-mode').selectOption('Online');await page.locator('#training-area').selectOption('Joyería');await expect(page.locator('#training-cards .study')).toHaveCount(2);
 await page.locator('#training-search').fill('resina');await expect(page.locator('#training-cards .study')).toHaveCount(1);
 await page.locator('#training-reset').click();await page.locator('#training-search').fill('UNIR');await expect(page.locator('#training-cards .study')).toHaveCount(0);await page.locator('#training-pending').check();await expect(page.locator('#training-cards .study')).toHaveCount(1);await expect(page.locator('#training-cards')).toContainText('Pendiente de revalidación');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
test('training comparison survives filtering and limits selection to three',async({page})=>{
 await page.goto('/estudios.html');await expect(page.locator('#training-overview')).toContainText('62 programas');
 for(const id of ['apr-pel','apr-est','apr-dir'])await page.locator(`[data-compare="${id}"]`).click();
 await page.locator('[data-compare="apr-bien"]').click();await expect(page.locator('#training-status')).toContainText('hasta 3');await expect(page.locator('#compare-table thead th')).toHaveCount(4);
 await page.locator('#training-mode').selectOption('Online');await expect(page.locator('#compare-table')).toContainText('Peluquería y Cosmética Capilar');await page.locator('#compare-clear').click();await expect(page.locator('#training-compare')).toBeHidden();
});
test('training does not label expired or failed refresh data as verified',async({page})=>{
 await page.route('**/api/training',async route=>{const res=await route.fetch();const rows=await res.json();rows.forEach(r=>{r.last_checked_at='2020-01-01T00:00:00Z';r.status='verified';});await route.fulfill({json:rows});});
 await page.goto('/estudios.html');await expect(page.locator('#training-overview')).toContainText('0 programas verificados');await expect(page.locator('#training-cards .study')).toHaveCount(0);await page.locator('#training-pending').check();await expect(page.locator('#training-cards .study')).not.toHaveCount(0);
 await page.unroute('**/api/training');await page.route('**/api/training',r=>r.abort());await page.locator('#training-retry').click();await expect(page.locator('#training-status')).toContainText('No se pudo actualizar');await expect(page.locator('#training-cards .study')).toHaveCount(0);
});
