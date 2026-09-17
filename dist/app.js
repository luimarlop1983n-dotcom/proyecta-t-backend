(() => {
  if(!/^https?:$/.test(location.protocol))return;
  const native=!!window.Capacitor?.isNativePlatform?.();
  if(native && !new URLSearchParams(location.search).has('portada') && /^\/(index.html)?$/.test(location.pathname)){location.replace('/cuenta/index.html');return;}
  const account=document.createElement('a');account.href='/cuenta/index.html';account.textContent='Mi espacio →';account.className='account-link';
  const accountNav=document.querySelector('header');if(accountNav)accountNav.append(account);
  const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  document.documentElement.classList.toggle('app-standalone',standalone());
  const tools=document.createElement('div');tools.className='app-tools';tools.setAttribute('aria-label','Instalación y conexión');
  tools.innerHTML='<button class="app-install" data-app-install>Instalar app</button><p class="app-connection" role="status" hidden></p><button data-app-refresh hidden>Comprobar novedades</button><button data-app-update hidden>Actualizar app</button>';
  const header=document.querySelector('header');if(header)header.after(tools);else document.querySelector('main').before(tools);
  const install=tools.querySelector('[data-app-install]'),status=tools.querySelector('.app-connection'),refresh=tools.querySelector('[data-app-refresh]'),update=tools.querySelector('[data-app-update]');
  install.hidden=native||standalone();let promptEvent,registration,reloadForUpdate=false;
  function connection(){
    const cached=document.documentElement.dataset.cachedPage==='true';
    status.hidden=navigator.onLine&&!cached;
    status.textContent=!navigator.onLine?'Sin conexión. Estás consultando una copia del catálogo; recupera internet para comprobar bases y enviar solicitudes.':'Estás consultando una copia guardada. Comprueba novedades para cargar el catálogo actual.';
    refresh.hidden=!navigator.onLine||!cached;
  }
  connection();addEventListener('offline',connection);addEventListener('online',connection);refresh.onclick=()=>location.reload();
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e;});
  addEventListener('appinstalled',()=>{install.hidden=true;promptEvent=null;});
  const help=document.createElement('dialog');help.className='app-help';help.setAttribute('aria-labelledby','app-help-title');
  help.innerHTML='<button class="app-dismiss" aria-label="Cerrar instrucciones">×</button><h2 id="app-help-title">Proyecta-T, a mano.</h2><p>Instálala con su icono y abre directamente tu radar.</p><ul><li><strong>iPhone o iPad:</strong> abre esta web en Safari, pulsa Compartir y elige «Añadir a pantalla de inicio».</li><li><strong>Android:</strong> abre esta web en Chrome. En su menú, elige «Instalar aplicación» o «Añadir a pantalla de inicio».</li><li><strong>Ordenador:</strong> en Chrome o Edge, busca la opción de instalar en la barra de direcciones. En Safari, utiliza Archivo → Añadir al Dock, si está disponible.</li></ul><p>Si estás dentro de otra aplicación, abre el enlace en Safari o Chrome. Tus favoritos y notas se guardan en el dispositivo y navegador donde los creaste; no se sincronizan entre dispositivos.</p><button class="app-help-done">Entendido</button>';
  document.body.append(help);help.querySelectorAll('button').forEach(b=>b.onclick=()=>help.close());
  help.addEventListener('click',e=>{if(e.target===help){const r=help.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)help.close();}});
  install.onclick=async()=>{
    if(!promptEvent){help.showModal();return;}
    const event=promptEvent;promptEvent=null;
    try{await event.prompt();const choice=await event.userChoice;if(choice.outcome==='accepted')install.hidden=true;}catch{help.showModal();}
  };
  if(!native && 'serviceWorker' in navigator){
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloadForUpdate)location.reload();});
    update.onclick=()=>{if(registration?.waiting){reloadForUpdate=true;registration.waiting.postMessage({type:'SKIP_WAITING'});}};
    navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(r=>{
      registration=r;if(r.waiting)update.hidden=false;
      r.addEventListener('updatefound',()=>{const worker=r.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)update.hidden=false;});});
    }).catch(()=>{status.hidden=false;status.textContent='La consulta sin conexión no está disponible en este navegador. Puedes seguir usando el radar con internet.';});
  }
})();
