(() => {
 const select=document.querySelector('#download-platform');if(!select)return;
 const ua=navigator.userAgent;
 const ios=/iPad|iPhone|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1);
 select.value=ios?'ios':/Android/i.test(ua)?'android':'desktop';
 const render=()=>{document.querySelectorAll('[data-platform]').forEach(el=>el.hidden=el.dataset.platform!==select.value);const apk=document.querySelector('#android-download'),web=document.querySelector('#web-install');apk.hidden=select.value!=='android';if(select.value==='android')web.before(apk);else web.after(apk);};
 select.addEventListener('change',render);render();
 const share=document.querySelector('#share-app');share.hidden=false;share.onclick=async()=>{const url=location.origin+'/descargar.html';const result=document.querySelector('#share-result');try{if(navigator.share)await navigator.share({title:'Proyecta-T',text:'Descarga o instala Proyecta-T',url});else if(navigator.clipboard){await navigator.clipboard.writeText(url);result.textContent='Enlace copiado.';}else result.textContent=url;}catch(e){if(e.name!=='AbortError')result.textContent='Puedes compartir este enlace: '+url;}};
})();
