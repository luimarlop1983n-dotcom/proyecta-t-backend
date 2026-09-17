(() => {
  const key='proyectat-pro-request-v1';
  const clean=v=>String(v||'').trim().slice(0,160);
  function reference(){const bytes=new Uint8Array(5);crypto.getRandomValues(bytes);return 'PT-'+[...bytes].map(x=>x.toString(36).padStart(2,'0')).join('').toUpperCase();}
  function read(){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
  function save(value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
  const dialog=document.createElement('dialog');dialog.className='pro-signup';dialog.setAttribute('aria-labelledby','pro-signup-title');document.body.append(dialog);
  function open(){const current=read();dialog.innerHTML='<form><button type="button" class="pro-close" aria-label="Cerrar">×</button><div class="label">Solicitud de acceso</div><h2 id="pro-signup-title">Pro · 3,99 € por un mes</h2><div class="pro-reference" hidden><strong>Solicitud preparada</strong><br><span></span></div><label>Nombre completo<input name="name" required autocomplete="name" maxlength="100"></label><label>Correo electrónico<input name="email" type="email" required autocomplete="email" maxlength="160"></label><label class="pro-check"><input name="terms" type="checkbox" required> Entiendo que el acceso no se activa automáticamente y que debo confirmar si ya se aceptan altas antes de pagar.</label><p role="status"></p><button class="button" type="submit">Preparar mi solicitud ↗</button><p class="pro-small">Los datos quedan solo en este navegador. Antes de pagar, escribe a contacta.proyectat@gmail.com e indica tu referencia para confirmar si ya se aceptan altas.</p></form>';
    const form=dialog.querySelector('form');
    if(current){form.elements.namedItem('name').value=clean(current.name);form.elements.namedItem('email').value=clean(current.email);const saved=dialog.querySelector('.pro-reference');saved.hidden=false;saved.querySelector('span').textContent=`Referencia: ${clean(current.reference)} · ${clean(current.name)} · ${clean(current.email)}`;}
    dialog.querySelector('.pro-close').onclick=()=>dialog.close();
    form.onsubmit=e=>{e.preventDefault();const f=e.currentTarget,value={name:clean(f.elements.namedItem('name').value),email:clean(f.elements.namedItem('email').value),reference:current?.reference||reference(),status:'pending',createdAt:current?.createdAt||new Date().toISOString()};if(!save(value)){f.querySelector('[role=status]').textContent='No se pudo guardar la solicitud en este navegador.';return}const saved=dialog.querySelector('.pro-reference');saved.hidden=false;saved.querySelector('span').textContent=`Referencia: ${value.reference} · ${value.name} · ${value.email}`;f.querySelector('[role=status]').textContent='Solicitud preparada. Conserva la referencia y confirma por correo si ya se aceptan altas antes de pagar.';};
    dialog.showModal();
  }
  document.querySelector('#pro-request')?.addEventListener('click',open);
})();
