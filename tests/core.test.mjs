import {test} from 'node:test';
import assert from 'node:assert/strict';
import {eligibility,sourceURL,escapeHTML,filterOpportunities,createAPI,API_BASE} from '../dist/cuenta/core.js';
test('eligibility requires explicit completeness and rejects expired opportunities',()=>{
 assert.equal(eligibility({}), 'pending');
 assert.equal(eligibility({eligibility:{eligible:true,complete:true,unknown:['Edad']}}),'pending');
 assert.equal(eligibility({eligibility:{eligible:false,complete:true}}),'excluded');
 assert.equal(eligibility({deadline:'2020-01-01',eligibility:{eligible:true,complete:true}}),'excluded');
 assert.equal(eligibility({deadline:'2099-01-01',eligibility:{eligible:true,complete:true}}),'ready');
});
test('untrusted opportunity content cannot introduce HTML or executable links',()=>{
 assert.equal(sourceURL('javascript:alert(1)'),'');assert.equal(sourceURL('data:text/html,test'),'');
 assert.equal(escapeHTML('<img src=x onerror="1">'),'&lt;img src=x onerror=&quot;1&quot;&gt;');
});
test('search combines accent insensitive text, type and eligibility filters',()=>{
 const rows=[{title:'Creación escénica',type:'Beca',eligibility:{eligible:true,complete:true}},{title:'Creación',type:'Premio'}];
 assert.equal(filterOpportunities(rows,'creacion','Beca','ready').length,1);
 assert.equal(filterOpportunities(rows,'creacion','Beca','pending').length,0);
});
test('API uses public HTTPS bearer authorization and omits cookies',async()=>{
 const api=createAPI(()=> 'test-token',async(url,opts)=>{assert.equal(url,API_BASE+'/api/me');assert.equal(opts.headers.Authorization,'Bearer test-token');assert.equal(opts.headers['Content-Type'],undefined);assert.equal(opts.credentials,'omit');return new Response('{"name":"Luz"}');});
 assert.deepEqual(await api('/api/me'),{name:'Luz'});
});
test('FastAPI validation errors and HTTP failures become readable messages',async()=>{
 const api=createAPI(()=>'',async()=>new Response(JSON.stringify({detail:[{msg:'Correo inválido'}]}),{status:422}));
 await assert.rejects(api('/api/login'),{message:'Correo inválido',status:422});
});
test('logout cancels pending requests',async()=>{
 const api=createAPI(()=>'',(_url,opts)=>new Promise((_resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(new DOMException('Cancelada','AbortError')))));
 const pending=api('/api/me');api.cancel();await assert.rejects(pending,{name:'AbortError'});
});
