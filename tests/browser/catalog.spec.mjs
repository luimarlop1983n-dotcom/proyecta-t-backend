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
 await page.goto('/estudios.html');await expect(page.locator('#training-status')).toContainText('12 programas');await page.locator('#training-area').selectOption('Tatuaje');await page.locator('#training-mode').selectOption('Online');await expect(page.locator('#training-cards .study')).toHaveCount(1);await expect(page.locator('#training-cards')).toContainText('Noble');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();expect(errors).toEqual([]);
});
test('catalog refuses to display stale data as available after network failure',async({page})=>{
 await page.goto('/radar.html');await expect(page.locator('#cards .card')).not.toHaveCount(0);
 await page.route('**/api/catalog?**',r=>r.abort());await page.locator('#catalog-notice').click();await expect(page.locator('#catalog-notice')).toContainText('No se pudo actualizar');await expect(page.locator('#cards .card')).toHaveCount(0);
});
