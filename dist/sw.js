const CACHE='proyectat-20261001-centres-1';
const FILES=['/descargar.html','/download.js','/','/index.html','/radar.html','/fuentes.html','/final.css','/app.css','/app.js','/api-config.js','/native.js','/vendor/docx.js','/vendor/pdf-lib.js','/export-documents.js','/documents.js','/curriculum.js','/plans.js','/planes.html','/pro-access.js','/estudios.html','/training.css','/training.js','/studies-nav.js','/documents.css','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png','/icons/apple-touch-icon.png','/offline.html','/umbral.webp','/cuenta/index.html','/cuenta/styles.css','/cuenta/core.js','/cuenta/app.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('proyectat-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
function pageKey(path){if(path==='/radar'||path==='/radar/')return '/radar.html';if(path==='/fuentes'||path==='/fuentes/')return '/fuentes.html';if(path==='/demo'||path==='/demo/'||path==='/demo.html')return '/radar.html';if(path==='/')return '/index.html';return path;}
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname==='/sw.js')return;
  if(req.mode!=='navigate'&&!FILES.includes(url.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(req,{cache:'no-store'});
      if(response.ok){event.waitUntil(cache.put(req,response.clone()));}
      return response;
    }catch{
      let cached=await cache.match(req,{ignoreSearch:true});
      if(req.mode==='navigate'){
        cached=await cache.match(pageKey(url.pathname))||cached||await cache.match('/offline.html');
        if(cached){const text=(await cached.text()).replace(/<html\b/i,'<html data-cached-page="true"');const headers=new Headers(cached.headers);for(const key of ['content-length','content-encoding','etag'])headers.delete(key);headers.set('content-type','text/html; charset=utf-8');return new Response(text,{status:200,headers});}
      }
      return cached||Response.error();
    }
  })());
});
