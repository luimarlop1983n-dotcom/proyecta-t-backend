import {test,expect} from '@playwright/test';
const u={ios:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',ipad:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',android:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36'};
for(const platform of ['ios','ipad','android','desktop'])test('download adapts to '+platform,async({browser})=>{
 const context=await browser.newContext({userAgent:u[platform],viewport:{width:390,height:844},hasTouch:platform==='ipad'});if(platform==='ipad')await context.addInitScript(()=>Object.defineProperty(navigator,'maxTouchPoints',{value:5}));const page=await context.newPage();await page.goto('/descargar.html');await expect(page.locator('#download-platform')).toHaveValue(platform==='ipad'?'ios':platform);await expect(page.locator(`[data-platform="${platform==='ipad'?'ios':platform}"]`)).toBeVisible();
 if(platform==='android')await expect(page.getByRole('link',{name:'Descargar APK para Android'})).toBeVisible();else await expect(page.locator('#android-download')).toBeHidden();
 await page.locator('#download-platform').selectOption('android');await expect(page.getByRole('link',{name:'Descargar APK para Android'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await context.close();
});
test('download delivers real APK and has a no-script fallback',async({browser,request})=>{
 const r=await request.get('/downloads/Proyecta-T-1.3.0.apk');expect(r.ok()).toBeTruthy();expect(r.headers()['content-type']).toContain('android.package-archive');expect(r.headers()['content-disposition']).toContain('attachment');const bytes=await r.body();expect(bytes.length).toBeGreaterThan(1000000);expect(bytes.subarray(0,2).toString()).toBe('PK');
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto('/descargar.html');await expect(page.getByRole('link',{name:'Descargar APK para Android'})).toBeVisible();await expect(page.getByRole('heading',{name:'En iPhone: pon Proyecta-T en tu pantalla de inicio'})).toBeVisible();await context.close();
});
test('browser install cancellation and errors keep a usable fallback',async({page})=>{
 await page.goto('/descargar.html');await page.evaluate(()=>{const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=async()=>{};e.userChoice=Promise.resolve({outcome:'dismissed'});window.dispatchEvent(e);});await page.locator('#pwa-install').click();await expect(page.locator('#install-result')).toContainText('cancelada');await expect(page.getByRole('link',{name:'Usar en el navegador'})).toBeVisible();
 await page.evaluate(()=>{const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=async()=>{throw Error('Unsupported');};window.dispatchEvent(e);});await page.locator('#pwa-install').click();await expect(page.locator('#install-result')).toContainText('No se pudo');await page.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));await expect(page.locator('#app-installed')).toBeVisible();await expect(page.locator('#pwa-install')).toBeHidden();
});
test('download link is visible from main sections',async({page})=>{
 for(const url of ['/','/radar.html','/estudios.html','/cuenta/index.html']){await page.goto(url);await expect(page.locator('[data-app-install]')).toBeVisible();await expect(page.locator('[data-app-install]')).toHaveAttribute('href','/descargar.html');}
});
