(() => {
  const cap=window.Capacitor;
  window.ProyectaDownload=async(blob,name)=>{
    if(cap?.isNativePlatform?.()){
      const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});
      const path='exports/'+Date.now()+'-'+name.replace(/[^a-zA-Z0-9._-]/g,'_');
      const file=await cap.Plugins.Filesystem.writeFile({path,data,directory:'CACHE',recursive:true});
      await cap.Plugins.Share.share({title:name,files:[file.uri],dialogTitle:'Guardar o compartir documento'});
      return;
    }
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  };
  if(!cap?.isNativePlatform?.())return;
  document.addEventListener('click',async event=>{
    const link=event.target.closest('a[href]');if(!link)return;
    const url=new URL(link.href,location.href);
    if(url.origin!==location.origin&&/^https?:$/.test(url.protocol)){
      event.preventDefault();
      try{await cap.Plugins.Browser.open({url:url.href});}catch{location.href=url.href;}
    }
  });
  cap.Plugins.App.addListener('backButton',({canGoBack})=>{
    const openDialog=document.querySelector('dialog[open]');
    if(openDialog){openDialog.close();return;}
    if(location.hash&&location.hash!=='#inicio'){if(canGoBack)history.back();else location.hash='inicio';return;}
    if(!location.pathname.includes('/cuenta/')){location.href='/cuenta/index.html';return;}
    cap.Plugins.App.minimizeApp();
  });
})();
