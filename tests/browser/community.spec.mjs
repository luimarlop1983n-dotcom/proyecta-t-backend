import {test,expect} from '@playwright/test';
test('community counts visits once per session and feedback once per browser',async({page})=>{
 const sessions=new Set(),visitors=new Set();
 await page.route('**/api/community**',async route=>{
  const path=new URL(route.request().url()).pathname;let already_counted=false;
  if(path.endsWith('/visit')){const id=route.request().postDataJSON().session_id;already_counted=sessions.has(id);sessions.add(id);}
  if(path.endsWith('/helped')){const id=route.request().postDataJSON().visitor_id;already_counted=visitors.has(id);visitors.add(id);}
  await route.fulfill({json:{visits:sessions.size,helped:visitors.size,already_counted}});
 });
 await page.goto('/index.html');await expect(page.locator('[data-community-visits]')).toHaveText('1');await page.locator('[data-community-vote]').click();await expect(page.locator('[data-community-helped]')).toHaveText('1');await expect(page.locator('[data-community-vote]')).toBeDisabled();
 await page.goto('/estudios.html');await expect(page.locator('[data-community-visits]')).toHaveText('1');await expect(page.locator('[data-community-vote]')).toBeDisabled();expect(sessions.size).toBe(1);expect(visitors.size).toBe(1);
 expect(await page.locator('[data-community]').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBeTruthy();
});
test('unavailable counters and failed votes are never reported as success',async({page})=>{
 await page.route('**/api/community**',r=>r.abort());await page.goto('/index.html');await expect(page.locator('[data-community-sync]')).toContainText('no están disponibles');await expect(page.locator('[data-community-visits]')).toHaveText('—');await page.locator('[data-community-vote]').click();await expect(page.locator('#community-vote-status')).toContainText('No hemos podido confirmar');await expect(page.locator('[data-community-vote]')).toBeEnabled();expect(await page.evaluate(()=>localStorage.getItem('proyectat-community-helped-v1'))).toBeNull();
});
test('public counts refresh while visible without generating another visit',async({page})=>{
 let visits=7,posts=0;
 await page.route('**/api/community**',async route=>{if(route.request().method()==='POST')posts++;await route.fulfill({json:{visits,helped:3}});});
 await page.goto('/index.html');await expect(page.locator('[data-community-visits]')).toHaveText('7');visits=9;await expect(page.locator('[data-community-visits]')).toHaveText('9',{timeout:15000});expect(posts).toBe(1);
});
