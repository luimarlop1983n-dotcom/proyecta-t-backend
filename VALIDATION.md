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

Validación: 11 pruebas de backend, 6 pruebas de lógica frontend y 26 recorridos de cuenta/vista previa en escritorio y móvil superados. Compilación compartida web/Capacitor correcta. SMTP simulado en pruebas: envío real y verificación del remitente pendientes de configuración en Railway. Esta entrega se publicó después de completar la autorización de GitHub.

## Comunidad · 01/10/2026

Contador público de sesiones web/app y opiniones de ayuda. Incrementos idempotentes y atómicos en la misma base Railway. Dos pruebas backend (incluida concurrencia) y seis recorridos de navegador móvil/escritorio superados: deduplicación, fallos y actualización visible cada diez segundos. No son visitantes únicos verificados ni una analítica resistente a bots.


## Puck, actualización y documentos · 1.3.0 · 01/10/2026

- Puck integrado en las páginas principales, recuperación y APK; accesos reales y separación de formularios, navegación inferior y comparador. Cuatro recorridos de escritorio/móvil aprobados.
- Botón visible de actualización: versiones públicas, comprobación del service worker, confirmación antes de recargar y descarga Android según versión instalada. Diez pruebas de navegador aprobadas, incluidas desconexión y cancelación.
- Importación local de DOCX/TXT y edición/adaptación: diez pruebas aprobadas con archivo Word comprimido real, errores, límites, falta de almacenamiento y texto malicioso inerte.
- Seis modelos individuales, paquete esencial de tres y completo de seis: ocho pruebas aprobadas. Medición local real del paquete completo: 72 ms desde pulsar crear hasta mostrar los seis documentos; no es una garantía para todos los dispositivos.
- Tres presentaciones Clásico/Editorial/Compacto: doce pruebas PDF/presentaciones aprobadas. Se comprueban archivos PDF/Word válidos, fuentes/márgenes, paginación A4, bytes idénticos entre vista previa y descarga PDF y cambios de presentación concurrentes. Vista PDF inspeccionada visualmente en Chrome.
- Cuenta conserva edición actual y ofrece Word/PDF: cuatro pruebas aprobadas. Regresión de cuenta, registro, recuperación y edición: veintiséis recorridos aprobados. Trece pruebas backend y seis de lógica frontend aprobadas.
- Service worker real instalado y activado con la nueva caché y módulos comunes. Android y móvil se comprueban por compilación y emulación; no se ha realizado una prueba en dispositivo físico ni una publicación en tienda.
- Importación conserva texto, no imágenes ni diseño original. PDF de entrada no está admitido. Fuentes PDF estándar: caracteres no compatibles muestran un error y mantienen la opción Word. Las plantillas dejan claros los datos pendientes y no inventan trayectoria ni cifras.

APK final 1.3.0 (versionCode 5), 6.553.890 bytes, compilación correcta. Firma válida y mismo certificado que 1.2.1; los assets de documentos, exportación, vista previa, actualización y Puck dentro del APK coinciden byte a byte con dist. Regeneradas dependencias npm locales y caché de compilación antigua; rutas Gradle relativas al repositorio.

Catorce pruebas de descarga e instalación aprobadas para la versión final1.3.0: entrega APK real, adaptación por dispositivo, cancelación, errores y alternativa sin JavaScript.
