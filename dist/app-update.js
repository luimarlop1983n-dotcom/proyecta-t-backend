// Public release information only. No account or document data is sent.
const WEB_VERSION='1.3.0';
const PUBLIC_ORIGIN='https://proyecta-t-backend-production.up.railway.app';
function newer(a,b){
  const av=String(a).split('.').map(Number),bv=String(b).split('.').map(Number);
  for(let i=0;i<Math.max(av.length,bv.length);i++){if((av[i]||0)!==(bv[i]||0))return (av[i]||0)>(bv[i]||0);}
  return false;
}
function confirmUpdate(native){
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='app-help';dialog.setAttribute('aria-label','Confirmar actualización');
    const heading=document.createElement('h2');heading.textContent=native?'Descargar nueva versión':'Actualizar Proyecta-T';
    const note=document.createElement('p');note.textContent=native?'Se abrirá la descarga del APK en tu navegador. Guarda antes los cambios de tus documentos. Instala el archivo descargado para completar la actualización.':'Guarda antes los cambios de tus documentos. La página se volverá a cargar y los cambios sin guardar pueden perderse.';
    const apply=document.createElement('button');apply.type='button';apply.textContent=native?'Abrir descarga APK':'Ya he guardado, actualizar';
    const cancel=document.createElement('button');cancel.type='button';cancel.className='app-dismiss';cancel.textContent='Ahora no';
    let accepted=false;apply.onclick=()=>{accepted=true;dialog.close();};cancel.onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{dialog.remove();resolve(accepted);},{once:true});dialog.append(cancel,heading,note,apply);document.body.append(dialog);dialog.showModal();cancel.focus();
  });
}
function installed(worker){
  if(!worker||['installed','activated'].includes(worker.state))return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>finish(new Error('La actualización tarda más de lo esperado. Vuelve a comprobarla.')),20000);
    const change=()=>{if(['installed','activated'].includes(worker.state))finish();else if(worker.state==='redundant')finish(new Error('No se pudo descargar la actualización. Vuelve a intentarlo.'));};
    function finish(error){clearTimeout(timeout);worker.removeEventListener('statechange',change);error?reject(error):resolve();}
    worker.addEventListener('statechange',change);change();
  });
}
export function installUpdates({button,native=false}){
  const status=document.createElement('p');status.className='app-connection';status.dataset.appUpdateStatus='';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.hidden=true;button.after(status);
  const say=text=>{status.hidden=false;status.textContent=text;};
  let pending=null,reloadApproved=false,busy=false;
  const sw=!native&&navigator.serviceWorker;
  const registration=sw?sw.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>null):Promise.resolve(null);
  const available=()=>{button.textContent=native?'Descargar actualización':'Aplicar actualización';say('Hay una nueva versión disponible. Guarda tu trabajo antes de actualizar.');};
  if(sw){
    sw.addEventListener('controllerchange',()=>{if(reloadApproved)location.reload();});
    registration.then(r=>{if(!r)return;const check=()=>{if(r.waiting&&sw.controller){pending={kind:'worker',worker:r.waiting};available();}};check();r.addEventListener('updatefound',()=>{r.installing?.addEventListener('statechange',check);});});
  }
  async function release(){
    if(!navigator.onLine)throw new Error('Sin conexión. Recupera internet para comprobar y descargar la actualización.');
    const response=await fetch((native?PUBLIC_ORIGIN:'')+'/app-release.json',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error();
    const data=await response.json();
    if(!/^\d+\.\d+\.\d+$/.test(data.web_version)||!/^\d+\.\d+\.\d+$/.test(data.android?.version))throw new Error();
    return data;
  }
  button.onclick=async()=>{
    if(busy)return;busy=true;button.disabled=true;
    try{
      if(!navigator.onLine)throw new Error('Sin conexión. Recupera internet para comprobar y descargar la actualización.');
      if(pending){
        if(!await confirmUpdate(native)){say('Actualización pendiente. Puedes seguir trabajando y aplicarla cuando guardes los cambios.');return;}
        if(pending.kind==='apk'){
          const browser=window.Capacitor?.Plugins?.Browser;
          if(!browser?.open)throw new Error('No se pudo abrir el navegador. Abre la página Descargar la app desde tu navegador para actualizar.');
          await browser.open({url:pending.url});say('Descarga abierta en el navegador. Instala el APK para completar la actualización.');
        }else if(pending.kind==='worker'){
          const current=await registration;
          if(current?.waiting){reloadApproved=true;current.waiting.postMessage({type:'SKIP_WAITING'});say('Aplicando la actualización…');}
          else location.reload();
        }else location.reload();
        return;
      }
      say('Comprobando si hay una nueva versión…');const data=await release();
      if(native){
        const getInfo=window.Capacitor?.Plugins?.App?.getInfo;
        if(!getInfo)throw new Error('No se pudo leer la versión instalada. Consulta Descargar la app desde tu navegador.');
        const info=await window.Capacitor.Plugins.App.getInfo();
        if(!/^\d+\.\d+\.\d+$/.test(info.version))throw new Error('No se pudo leer la versión instalada.');
        if(newer(data.android.version,info.version)){
          const url=new URL(data.android.download_url,PUBLIC_ORIGIN);
          if(url.origin!==PUBLIC_ORIGIN||!/^\/downloads\/[^/]+\.apk$/.test(url.pathname))throw new Error();
          pending={kind:'apk',url:url.href};available();
        }else say('Tu app está actualizada. Versión '+info.version+'.');
      }else{
        const r=await registration;
        if(r){await r.update();await installed(r.installing);}
        if(r?.waiting&&sw.controller){pending={kind:'worker',worker:r.waiting};available();}
        else if(newer(data.web_version,WEB_VERSION)||document.documentElement.dataset.cachedPage==='true'){pending={kind:'reload'};available();}
        else say(r?'Tu app está actualizada.':'La web está actualizada. La consulta sin conexión no está disponible en este navegador.');
      }
    }catch(error){say(error?.message&&error.message!=='Failed to fetch'?error.message:'No se pudo comprobar la actualización. Revisa tu conexión y vuelve a intentarlo.');}
    finally{busy=false;button.disabled=false;}
  };
}
