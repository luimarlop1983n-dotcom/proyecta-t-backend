# Validación · 17 de septiembre de 2026

- Repositorio base: `luimarlop1983n-dotcom/proyecta-t-backend`, commit `2acda065cf10945bec238eebbd3696606c8de46d`.
- Frontend compartido recuperado de la versión local aprobada del 15/09, conservando herramientas, planes y estética.
- 30 categorías visibles; 135 registros incluidos en la release (103 fichas heredadas y 32 referencias de la actualización).
- 47 fichas formativas (46 verificadas; 1 pendiente por HTTP 403) con fuente, titulación/modalidad, fecha de comprobación y matrícula por consultar.
- Ocho pruebas del backend: límite exacto de frescura, cierre y zona horaria, importación idempotente, catálogo compartido, rutas/CORS y bloqueo de candidaturas cerradas.
- Seis pruebas de lógica/transportes frontend.
- Veintiséis recorridos de navegador en escritorio y móvil: acceso, favoritos, candidaturas, perfil, dossier, desconexión, filtros, archivo, fuentes y formación.
- APK de depuración compilado con Java 21 y SDK Android. No se ha publicado en Google Play.
- La migración se prueba con SQLite aislado; no se ejecutan pruebas de escritura contra cuentas de producción. La validación de PostgreSQL real depende del despliegue Railway.
- Algunas ofertas de la conversación no tienen evidencia suficiente de vigencia: se conservan en Por confirmar, nunca como disponibles. Incluye Noble Art y otros anuncios sin apertura comprobada.
- Comprobaciones editoriales: ficha específica y señal de solicitud/plazo abierto; los programas de formación no se etiquetan como matrícula abierta sin evidencia.

- Formación: comprobadas todas las URLs finales de programas, enlaces complementarios y directorios; retirada la academia local que redirige a 404. 36 titulaciones oficiales y 10 formaciones propias verificadas. Diferenciadas titularidad y oficialidad.
- Comparador de tres programas probado con filtros, límite de selección y limpieza; no muestra una comprobación caducada o un fallo de red como verificado.

## Descarga de la app · 01/10/2026

- Botón visible en portada, radar, formación y cuenta; destino `/descargar.html`.
- Detección de iPhone, iPad con identificación de Mac y pantalla táctil, Android y escritorio; selector manual como alternativa.
- 14 comprobaciones de descarga e instalación pasadas, además de los 26 recorridos existentes y 6 pruebas de lógica frontend. Emulación en Chrome: no son pruebas en dispositivos físicos iOS/Android.
- Descarga GET comprobada: contenido ZIP/APK real, más de 1 MB, MIME de Android y cabecera attachment. APK de prueba 1.2.1 existente; no se ha creado una app nativa para iOS.
- Página utilizable sin JavaScript, con instrucciones y descarga directa; cancelación y error del diálogo de instalación no bloquean el uso web.

## Cuenta y vista previa · 01/10/2026

Registro con nombre opcional, recuperación por SMTP con enlace de 30 minutos, hash en base de datos, consumo transaccional y revocación de sesiones. Vista previa segura del contenido en lista/editor/exportación y dossier de cuenta, incluidos cambios sin guardar.

Validación: 11 pruebas de backend, 6 pruebas de lógica frontend y 26 recorridos de cuenta/vista previa en escritorio y móvil superados. Compilación compartida web/Capacitor correcta. SMTP simulado en pruebas: envío real y verificación del remitente pendientes de configuración en Railway. Cambios aún no publicados por falta de autorización de escritura de GitHub.

## Comunidad · 01/10/2026

Contador público de sesiones web/app y opiniones de ayuda. Incrementos idempotentes y atómicos en la misma base Railway. Dos pruebas backend (incluida concurrencia) y seis recorridos de navegador móvil/escritorio superados: deduplicación, fallos y actualización visible cada diez segundos. No son visitantes únicos verificados ni una analítica resistente a bots.
