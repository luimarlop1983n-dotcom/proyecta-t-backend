import {test,expect} from '@playwright/test';

test('Puck loads on the main pages and opens working section shortcuts',async({page})=>{
 for(const path of ['/','/descargar.html','/estudios.html','/cuenta/index.html','/cuenta/recuperar.html']){
  await page.goto(path);
  const launcher=page.getByRole('button',{name:'Puck: ¿qué creamos hoy? Abrir accesos'});
  await expect(launcher).toBeVisible();
  await expect.poll(()=>launcher.locator('img').evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
  const box=await launcher.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(page.viewportSize().width);
 }
 await page.getByRole('button',{name:'Puck: ¿qué creamos hoy? Abrir accesos'}).click();
 const dialog=page.getByRole('dialog',{name:'¿Qué creamos hoy?'});
 await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('link',{name:/Encuentra dónde estudiar/})).toHaveAttribute('href','/estudios.html');
 await expect(dialog.getByRole('link',{name:/Da forma a tus documentos/})).toHaveAttribute('href','/radar.html#crear-documentos');
 await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();
 await expect(page.getByRole('button',{name:'Puck: ¿qué creamos hoy? Abrir accesos'})).toBeFocused();
});

test('Puck makes room for forms and the training comparison bar',async({page})=>{
 await page.goto('/cuenta/recuperar.html');
 const puck=page.locator('[data-puck]');await expect(puck).toBeVisible();
 await page.getByLabel('Correo electrónico').focus();await expect(puck).not.toBeVisible();
 await page.getByRole('heading',{name:'Recupera tu acceso.'}).click();await expect(puck).toBeVisible();
 await page.goto('/estudios.html');await expect(page.locator('[data-puck]')).toBeVisible();
 await page.locator('[data-compare]').first().click();
 await expect(page.locator('#compare-bar')).toBeVisible();
 await expect.poll(()=>page.locator('[data-puck]').evaluate(e=>getComputedStyle(e).bottom)).toBe('102px');
 const bar=await page.locator('#compare-bar').boundingBox(),companion=await page.locator('[data-puck]').boundingBox();
 expect(companion.y+companion.height).toBeLessThan(bar.y);
});
