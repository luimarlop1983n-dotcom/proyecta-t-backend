import {test,expect} from '@playwright/test';
const origin=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
async function setup(page,{fail=false,auth=false}={}) {
 let favorites=[],apps=[],me={name:'Luz',discipline:'Teatro',location:'Madrid',interests:'Creación',birth_year:1990};
 const opps=[{id:1,verified:true,status:'verified',title:'Residencia de creación',org:'Centro cultural',type:'Residencia',location:'Madrid',deadline:'2099-12-30',amount:'3.000 €',source:'https://example.org/bases',source_name:'Bases',summary:'Un lugar para crear.',match:92,eligibility:{eligible:true,complete:true,unknown:[]}},{id:2,title:'Premio joven',type:'Premio',source:'javascript:alert(1)',eligibility:{eligible:true,complete:false,unknown:['Año de nacimiento']}},{id:3,title:'<img src=x onerror=alert(1)>',type:'Beca',eligibility:{eligible:false,complete:true,reasons:['Edad máxima']}}];
 if(auth)await page.addInitScript(()=>localStorage.setItem('pplus_token','fixture-token'));
 await page.route(origin+'/api/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname,method=req.method();let body={ok:true},status=200;
 if(fail&&path==='/api/opportunities'){await route.abort('failed');return;}
 if(['/api/login','/api/signup'].includes(path)){body={token:'fixture-token'};}
 if(path==='/api/me'){if(method==='PUT')me=req.postDataJSON();body=me;}
 if(path==='/api/opportunities')body=opps;
 if(path==='/api/favorites')body=favorites;
 if(path==='/api/favorites/1')favorites=method==='POST'?[1]:[];
 if(path==='/api/applications')body=apps;
 if(path==='/api/applications/1')apps=[{opportunity_id:1,verified:true,status:'verified',title:opps[0].title,status:'En preparación'}];
 if(path==='/api/applications/1/sent')apps[0].status='Enviada';
 if(path==='/api/dossier')body={bio:'Mi trayectoria',motivation:'Mi propuesta',checklist:['Revisar bases']};
 await route.fulfill({status,json:body});});
}
test('registration, favorites, candidature, dossier, profile and logout',async({page})=>{
 await setup(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/cuenta/index.html');await page.getByRole('button',{name:'Crear cuenta',exact:true}).click();
 await page.getByLabel('Nombre profesional').first().fill('Luz');await page.getByLabel('Correo electrónico').fill('luz@example.com');await page.getByLabel('Contraseña',{exact:true}).fill('creative-test-password');await page.getByRole('button',{name:'Crear cuenta →'}).click();
 await expect(page.locator('#hello')).toHaveText('Luz');await expect(page.locator('#eligibleCount')).toHaveText('1');
 await page.locator('.bottomNav').getByRole('button',{name:'Radar',exact:true}).click();
 await page.locator('#typeFilter').selectOption('Premio');await expect(page.locator('#opps .card')).toHaveCount(1);await page.locator('#typeFilter').selectOption('');
 await page.locator('#opps').getByRole('button',{name:'Añadir a favoritos: Residencia de creación'}).click();
 await page.locator('.bottomNav').getByRole('button',{name:'Mi selección'}).click();await expect(page.locator('#favoritesList .card')).toHaveCount(1);
 await page.locator('#favoritesList').getByRole('button',{name:'Preparar candidatura'}).click();await expect(page.locator('#appsList')).toBeVisible();
 await page.getByRole('button',{name:'Ya la he enviado'}).click();await expect(page.locator('#appsList .chip')).toHaveText('Enviada');
 await page.locator('.bottomNav').getByRole('button',{name:'Dossier',exact:true}).click();await page.locator('#dossierOpp').selectOption('1');await page.locator('#focus').fill('Una obra sobre la memoria');await page.getByRole('button',{name:'Crear borrador'}).click();await expect(page.locator('#draft')).toContainText('');await expect(page.locator('#draft')).toHaveValue(/Mi trayectoria/);
 await page.locator('.bottomNav').getByRole('button',{name:'Perfil',exact:true}).click();await page.locator('#pName').fill('Luz Creativa');await page.getByRole('button',{name:'Guardar perfil'}).click();await expect(page.locator('#hello')).toHaveText('Luz Creativa');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.getByRole('button',{name:'Cerrar sesión'}).click();await expect(page.locator('#auth')).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('pplus_token'))).toBeNull();await expect(page.locator('#draft')).toHaveValue('');expect(errors).toEqual([]);
});
test('network errors preserve session and can be retried',async({page})=>{
 await setup(page,{fail:true,auth:true});await page.goto('/cuenta/index.html');await expect(page.locator('#loadError')).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('pplus_token'))).toBe('fixture-token');await expect(page.locator('#product')).toBeVisible();
 await page.unroute(origin+'/api/**');await setup(page,{auth:false});await page.getByRole('button',{name:'Reintentar'}).click();await expect(page.locator('#loadError')).toBeHidden();await expect(page.locator('#eligibleCount')).toHaveText('1');
});
test('safe content, deep links and browser back navigation',async({page})=>{
 await setup(page,{auth:true});await page.goto('/cuenta/index.html#radar');await expect(page.locator('#radar')).toBeVisible();await expect(page.locator('#opps img')).toHaveCount(0);await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);await page.locator('.bottomNav').getByRole('button',{name:'Perfil',exact:true}).click();await page.goBack();await expect(page.locator('#radar')).toBeVisible();
});
test('expired session returns to login',async({page})=>{
 await setup(page,{auth:true});await page.route(origin+'/api/me',route=>route.fulfill({status:401,json:{detail:'Sesión inválida'}}));await page.goto('/cuenta/index.html');await expect(page.locator('#msg')).toContainText('caducado');await expect(page.locator('#auth')).toBeVisible();
});
test('public navigation exposes the shared account and layout fits screen',async({page},info)=>{
 await page.goto('/index.html');await expect(page.getByRole('link',{name:'Mi espacio →'})).toBeVisible();
 await page.getByRole('link',{name:'Mi espacio →'}).click();await expect(page.locator('#authForm')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:`../../outputs/proyecta-t-${info.project.name}.png`,fullPage:true});
});
test('downloads work on web and use file sharing on Android',async({page})=>{
 await page.goto('/cuenta/index.html');const download=page.waitForEvent('download');await page.evaluate(()=>window.ProyectaDownload(new Blob(['Mi dossier'],{type:'text/plain'}),'dossier.txt'));expect((await download).suggestedFilename()).toBe('dossier.txt');
 await page.addInitScript(()=>{window.nativeCalls=[];window.Capacitor={isNativePlatform:()=>true,Plugins:{App:{addListener:()=>{}},Filesystem:{writeFile:async o=>{window.nativeCalls.push(o);return{uri:'content://test/dossier.txt'};}},Share:{share:async o=>{window.nativeCalls.push(o);}}}};});
 await page.reload();await page.evaluate(()=>window.ProyectaDownload(new Blob(['Mi dossier'],{type:'text/plain'}),'dossier.txt'));const calls=await page.evaluate(()=>window.nativeCalls);expect(calls[0].directory).toBe('CACHE');expect(calls[1].files).toEqual(['content://test/dossier.txt']);
});
test('delayed requests keep controls safe and failures stop the loading state',async({page})=>{
 await setup(page,{auth:true,fail:true});await page.route(origin+'/api/me',async route=>{await new Promise(r=>setTimeout(r,400));await route.fulfill({json:{name:'Luz',discipline:'',location:'',interests:''}});});
 await page.goto('/cuenta/index.html');await expect(page.locator('#loadError')).toBeVisible();await expect(page.locator('#best')).toContainText('No hemos podido cargar');await expect(page.locator('#generate')).toBeDisabled();await expect(page.locator('#profileGuide')).toBeVisible();await page.getByRole('button',{name:'Completar mi perfil'}).click();await expect(page.locator('#perfil')).toBeVisible();
});
test('mobile login and enlarged text remain usable',async({page},info)=>{
 await page.goto('/cuenta/index.html');
 if(info.project.name==='mobile'){const box=await page.locator('#authBtn').boundingBox();expect(box.y+box.height).toBeLessThan(844);}
 await page.setViewportSize({width:360,height:900});await page.addStyleTag({content:'html{font-size:200% !important}'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
