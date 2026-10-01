import {test,expect} from '@playwright/test';
const release={web_version:'1.3.0',android:{version:'1.3.0',download_url:'/downloads/Proyecta-T-1.3.0.apk'}};
async function setup(page,{waiting=false,nativeVersion=null,noSw=false}={}){
 await page.route('**/app-release.json',r=>r.fulfill({json:release}));
 await page.addInitScript(({waiting,nativeVersion,noSw})=>{
  window.updateChecks=0;window.updateMessages=[];window.openedUpdates=[];
  if(nativeVersion){window.Capacitor={isNativePlatform:()=>true,Plugins:{App:{getInfo:async()=>({version:nativeVersion}),addListener:()=>{},minimizeApp:()=>{}},Browser:{open:async({url})=>window.openedUpdates.push(url)}}};}
  if(noSw){Object.defineProperty(navigator,'serviceWorker',{value:undefined,configurable:true});return;}
  const sw=new EventTarget();sw.controller={};const registration=new EventTarget();registration.installing=null;registration.waiting=waiting?{postMessage:msg=>window.updateMessages.push(msg)}:null;
  registration.update=async()=>{window.updateChecks++;};sw.register=async()=>registration;Object.defineProperty(navigator,'serviceWorker',{value:sw,configurable:true});
 },{waiting,nativeVersion,noSw});
 await page.goto('/estudios.html');
 await expect(page.locator('[data-app-update]')).toBeVisible();
}
test('update checks current web version and reports offline explicitly',async({page})=>{
 await setup(page);await page.locator('[data-app-update]').click();await expect(page.locator('[data-app-update-status]')).toHaveText('Tu app está actualizada.');expect(await page.evaluate(()=>window.updateChecks)).toBe(1);
 await page.evaluate(()=>Object.defineProperty(navigator,'onLine',{value:false,configurable:true}));await page.locator('[data-app-update]').click();await expect(page.locator('[data-app-update-status]')).toContainText('Sin conexión');
});
test('waiting service worker requires explicit confirmation and cancel preserves page',async({page})=>{
 await setup(page,{waiting:true});const button=page.locator('[data-app-update]');await expect(button).toHaveText('Aplicar actualización');await button.click();await expect(page.getByRole('dialog',{name:'Confirmar actualización'})).toContainText('cambios sin guardar');await page.getByRole('button',{name:'Ahora no'}).click();expect(await page.evaluate(()=>window.updateMessages)).toEqual([]);await expect(page.locator('[data-app-update-status]')).toContainText('seguir trabajando');await button.click();await page.getByRole('button',{name:'Ya he guardado, actualizar'}).click();await expect.poll(()=>page.evaluate(()=>window.updateMessages)).toEqual([{type:'SKIP_WAITING'}]);
});
test('browser without service worker remains usable',async({page})=>{await setup(page,{noSw:true});await page.locator('[data-app-update]').click();await expect(page.locator('[data-app-update-status]')).toContainText('La web está actualizada');});
test('Android checks installed version and opens newer APK only after approval',async({page})=>{
 await setup(page,{nativeVersion:'1.2.1'});await page.locator('[data-app-update]').click();await expect(page.locator('[data-app-update]')).toHaveText('Descargar actualización');expect(await page.evaluate(()=>window.openedUpdates)).toEqual([]);await page.locator('[data-app-update]').click();await page.getByRole('button',{name:'Abrir descarga APK'}).click();await expect(page.locator('[data-app-update-status]')).toContainText('Instala el APK');expect(await page.evaluate(()=>window.openedUpdates)).toEqual(['https://proyecta-t-backend-production.up.railway.app/downloads/Proyecta-T-1.3.0.apk']);
});
test('Android already current and failed network never claim a new download',async({page})=>{
 await setup(page,{nativeVersion:'1.3.0'});await page.locator('[data-app-update]').click();await expect(page.locator('[data-app-update-status]')).toContainText('actualizada. Versión 1.3.0');await page.route('**/app-release.json',r=>r.abort());await page.locator('[data-app-update]').click();await expect(page.locator('[data-app-update-status]')).toContainText('No se pudo comprobar');expect(await page.evaluate(()=>window.openedUpdates)).toEqual([]);
});
