(() => {
  if(!/^https?:$/.test(location.protocol))return;
  const native=!!window.Capacitor?.isNativePlatform?.();
  if(native && !new URLSearchParams(location.search).has('portada') && /^\/(index.html)?$/.test(location.pathname)){location.replace('/cuenta/index.html');return;}
  import('/community.js').catch(()=>{});
  import('/puck.js').catch(()=>{});
  const account=document.createElement('a');account.href='/cuenta/index.html';account.textContent='Mi espacio →';account.className='account-link';
  const accountNav=document.querySelector('header');if(accountNav&&!location.pathname.startsWith('/cuenta/'))accountNav.append(account);
  const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  document.documentElement.classList.toggle('app-standalone',standalone());
  const tools=document.createElement('div');tools.className='app-tools';tools.setAttribute('aria-label','Instalación y conexión');
  tools.innerHTML='<a class="app-install" data-app-install href="/descargar.html">Descargar la app ↓</a><p class="app-connection" role="status" hidden></p><button data-app-refresh hidden>Comprobar novedades</button><button data-app-update>Actualizar app</button>';
  const header=document.querySelector('header');if(header)header.after(tools);else document.querySelector('main').before(tools);
  const install=tools.querySelector('[data-app-install]'),status=tools.querySelector('.app-connection'),refresh=tools.querySelector('[data-app-refresh]'),update=tools.querySelector('[data-app-update]');
  install.hidden=native||standalone()||location.pathname==='/descargar.html';let promptEvent;
  function connection(){
    const cached=document.documentElement.dataset.cachedPage==='true';
    status.hidden=navigator.onLine&&!cached;
    status.textContent=!navigator.onLine?'Sin conexión. Estás consultando una copia del catálogo; recupera internet para comprobar bases y enviar solicitudes.':'Estás consultando una copia guardada. Comprueba novedades para cargar el catálogo actual.';
    refresh.hidden=!navigator.onLine||!cached;
  }
  connection();addEventListener('offline',connection);addEventListener('online',connection);refresh.onclick=()=>update.click();
  const pwa=document.querySelector('#pwa-install'),result=document.querySelector('#install-result'),installed=document.querySelector('#app-installed');
  if(installed)installed.hidden=!standalone()&&!native;
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e;if(pwa&&!standalone()&&!native)pwa.hidden=false;});
  addEventListener('appinstalled',()=>{install.hidden=true;promptEvent=null;if(pwa)pwa.hidden=true;if(installed)installed.hidden=false;if(result)result.textContent='Proyecta-T instalada.';});
  if(pwa)pwa.onclick=async()=>{
    if(!promptEvent){result.textContent='Sigue las instrucciones de tu navegador que aparecen debajo.';return;}
    const event=promptEvent;promptEvent=null;pwa.hidden=true;
    try{await event.prompt();const choice=await event.userChoice;result.textContent=choice.outcome==='accepted'?'Solicitud de instalación aceptada.':'Instalación cancelada. Puedes seguir usando la web o instalarla desde el menú del navegador.';}
    catch{result.textContent='No se pudo abrir la instalación. Sigue las instrucciones que aparecen debajo.';}
  };
  import('/app-update.js').then(module=>module.installUpdates({button:update,native})).catch(()=>{update.onclick=()=>{status.hidden=false;status.textContent='No se puede comprobar la actualización. Recupera internet y vuelve a abrir esta página.';};});
})();
