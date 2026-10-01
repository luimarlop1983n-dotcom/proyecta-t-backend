import {createAPI} from './core.js';
const $=s=>document.querySelector(s),api=createAPI(()=>''),secret=new URLSearchParams(location.hash.slice(1)).get('reset')||'';
// Keep recovery secrets out of URL history, referrers and analytics.
if(secret)history.replaceState(null,'',location.pathname);
const resetting=!!secret;
$('#email-fields').hidden=resetting;$('#recovery-email').required=!resetting;$('#reset-fields').hidden=!resetting;
for(const el of [$('#new-password'),$('#confirm-password')])el.required=resetting;
if(resetting){$('#recovery-title').textContent='Elige tu nueva contraseña.';$('#recovery-help').textContent='Un último paso para volver a tu espacio.';$('#recover-button').textContent='Guardar contraseña';}
$('#show-new').onclick=()=>{const show=$('#new-password').type==='password';for(const el of [$('#new-password'),$('#confirm-password')])el.type=show?'text':'password';$('#show-new').textContent=show?'Ocultar contraseñas':'Mostrar contraseñas';$('#show-new').setAttribute('aria-pressed',String(show));};
$('#recovery').onsubmit=async e=>{e.preventDefault();const button=$('#recover-button'),status=$('#recovery-status');if(button.disabled)return;
 if(resetting&&$('#new-password').value!==$('#confirm-password').value){status.textContent='Las contraseñas no coinciden. Revísalas.';$('#confirm-password').focus();return;}
 button.disabled=true;status.textContent=resetting?'Guardando…':'Solicitando el enlace…';
 try{const result=await api(resetting?'/api/password/reset':'/api/password/forgot',{method:'POST',body:JSON.stringify(resetting?{token:secret,password:$('#new-password').value}:{email:$('#recovery-email').value.trim()})});status.textContent=result.message;
 if(resetting){try{localStorage.removeItem('pplus_token');}catch{}$('#reset-fields').hidden=true;button.hidden=true;$('#recovery-next').focus();}else{button.textContent='Volver a enviar enlace';}}
 catch(error){status.textContent=error.status===503?'La recuperación por correo no está disponible ahora. Inténtalo más tarde.':error.message;if(resetting){$('#recovery-next').href='./recuperar.html';$('#recovery-next').textContent='Solicitar otro enlace →';}}
 finally{button.disabled=false;}
};
