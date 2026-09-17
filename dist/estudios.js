(() => {
const areas=['Todas','Artes plásticas','Artes visuales','Fotografía','Ilustración','Joyería','Artesanía','Diseño','Moda y textil','Tatuaje','Peluquería creativa','Pódcast','Música','Audiovisual','Artes escénicas','Danza','Teatro','Literatura','Gastronomía','Arquitectura','Arte digital','Interdisciplinar'];
const routes={
'Artes plásticas':['Bellas Artes; Conservación y Restauración; ciclos de Artes Plásticas y Diseño','Facultades públicas de Bellas Artes y Escuelas de Arte'],
'Artes visuales':['Bellas Artes; Diseño; Conservación y Restauración','Universidad de las Artes de Berlín o Central Saint Martins'],
'Fotografía':['Técnico Superior de Artes Plásticas y Diseño en Fotografía','EFTI y escuelas superiores de arte autorizadas'],
'Ilustración':['Técnico Superior de Artes Plásticas y Diseño en Ilustración','Escuelas de arte, BAU e IED'],
'Joyería':['Ciclos de Joyería de Arte, Orfebrería y Platería','Escuelas de arte especializadas y workshops de firmas reconocidas'],
'Artesanía':['Ciclos de Artes Plásticas y Diseño según oficio','Escuelas de arte, Fundesarte y centros de oficios'],
'Diseño':['Grado en Enseñanzas Artísticas Superiores de Diseño o grado universitario oficial','IED, Elisava y escuelas superiores de diseño'],
'Moda y textil':['Diseño de Moda; ciclos de Modelismo, Estilismo o Textil','IED, EASD y Central Saint Martins'],
'Tatuaje':['Formación higiénico-sanitaria exigida por la comunidad autónoma; dibujo y técnicas aplicadas','Estudios con artistas de trayectoria y prácticas con protocolos sanitarios'],
'Peluquería creativa':['FP de Técnico en Peluquería y Cosmética Capilar o Estilismo y Dirección de Peluquería','Academias profesionales de marcas y campeonatos del sector'],
'Pódcast':['FP de Sonido para Audiovisuales y Espectáculos; Comunicación Audiovisual o Periodismo','Escuela de Radio y Pódcast de referencia y formación de productoras/plataformas'],
'Música':['Enseñanzas profesionales o superiores de Música; Producción de Audiovisuales y Espectáculos','Conservatorios superiores y Berklee Valencia'],
'Audiovisual':['FP de Realización, Producción, Sonido o Animaciones 3D; Comunicación Audiovisual','ECAM, ESCAC y centros especializados'],
'Artes escénicas':['Enseñanzas superiores de Arte Dramático; Producción de Espectáculos','RESAD y escuelas superiores autonómicas'],
'Danza':['Enseñanzas profesionales o superiores de Danza','Conservatorios superiores y compañías con programas formativos'],
'Teatro':['Título Superior de Arte Dramático: Interpretación, Dirección o Escenografía','RESAD, Institut del Teatre y escuelas superiores autonómicas'],
'Literatura':['Grados oficiales en Lengua y Literatura; máster oficial en Escritura o Edición','Escuela de Letras, talleres de autores y editoriales reconocidas'],
'Gastronomía':['FP de Cocina y Gastronomía o Dirección de Cocina; grados universitarios oficiales','Basque Culinary Center y escuelas de hostelería reconocidas'],
'Arquitectura':['Grado y Máster habilitante en Arquitectura','Escuelas de arquitectura acreditadas y programas internacionales'],
'Arte digital':['FP de Animaciones 3D, Videojuegos y Entornos Interactivos; Bellas Artes o Diseño','U-tad, escuelas de animación y laboratorios de creación digital'],
'Interdisciplinar':['Bellas Artes, Diseño o Humanidades con itinerario combinado; máster oficial afín','Programas de residencias, medialabs y posgrados transdisciplinares']};
const official='https://educagob.educacionfpydeportes.gob.es/ensenanzas/artisticas.html', fp='https://www.todofp.es/', ruct='https://www.educacion.gob.es/ruct/home';
let profile=[];try{const p=JSON.parse(localStorage.getItem('proyectat-beta-profile')||'{}');profile=Array.isArray(p.disciplines)?p.disciplines:[]}catch{}
const select=document.querySelector('#study-area');select.innerHTML=areas.map(a=>'<option>'+a+'</option>').join('');
function render(useProfile=false){const choice=select.value;let shown=Object.keys(routes).filter(a=>choice==='Todas'||a===choice);if(useProfile&&profile.length)shown.sort((a,b)=>profile.includes(b)-profile.includes(a));document.querySelector('#study-summary').textContent=useProfile&&profile.length?'Primero mostramos las áreas de tu perfil: '+profile.join(' · ')+'.':'Explora '+shown.length+' áreas formativas.';document.querySelector('#study-cards').innerHTML=shown.map(a=>{const recommended=profile.includes(a);const link=['Peluquería creativa','Pódcast','Audiovisual','Gastronomía','Arte digital'].includes(a)?fp:['Arquitectura','Literatura'].includes(a)?ruct:official;return '<article class="study '+(recommended?'recommended':'')+'"><div class="badge">'+(recommended?'Recomendada por tu perfil · ':'')+'Ruta oficial</div><h2>'+a+'</h2><h3>Qué puedes estudiar</h3><p>'+routes[a][0]+'.</p><a href="'+link+'" target="_blank" rel="noopener">Comprobar estudios oficiales ↗</a><h3>Formación de referencia</h3><p>'+routes[a][1]+'. Comprueba si el programa concreto expide un título oficial o propio.</p></article>'}).join('');}
select.onchange=()=>render(false);document.querySelector('#study-profile').onclick=()=>render(true);render(true);
})();
