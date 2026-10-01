# Proyecta-T · web, Android y Railway

Frontend editorial nocturno compartido en `dist/`. FastAPI sirve esos mismos archivos en Railway y `npm run build` los copia a `www/` para Capacitor. No editar `www/` ni los assets generados de Android.

## Desarrollo

Backend: Python 3.12 recomendado, `pip install -r requirements.txt`, `uvicorn app.main:app --host 127.0.0.1 --port 8765`. Por defecto utiliza SQLite local. En producción conservar `DATABASE_URL` de PostgreSQL y `ADMIN_TOKEN` de Railway.

Frontend: Node 22+, `npm ci`, `npm run build`, `npm test`. Las pruebas de navegador usan Chrome instalado y el backend local en el puerto 8765: `npm run test:browser`. Puede configurarse `TEST_BASE_URL`. Backend: `python -m unittest tests.test_backend tests.test_training -v` (base temporal aislada).

Android: Java 21, SDK 35 y `ANDROID_HOME`; ejecutar `npm run android:build`. El APK de depuración queda en `android/app/build/outputs/apk/debug/app-debug.apk`. No es una publicación en Google Play.

## Datos y frescura

- Catálogo público: `/api/catalog`; cuenta: `/api/opportunities`. Mismos registros e IDs de base de datos, con afinidad orientativa añadida en la cuenta.
- Taxonomía completa: `/api/categories`. Formación: `/api/training`, filtrable por `category`, `region` y `mode`.
- `include_inactive=true` permite consultar archivo y referencias por confirmar. El catálogo público por defecto devuelve solo verificadas recientes.
- La actividad se calcula en cada consulta: más de 30 días sin señal documentada excluye la oferta de Disponibles. No depende de un cron ni de una visita administrativa.
- Un cierre explícito o un plazo vencido prevalece sobre la verificación. Fechas sin hora cierran al finalizar el día en Europe/Madrid; se deben revisar las bases para horas específicas.
- Una importación o redeploy nunca renueva la evidencia. No se usa un HTTP 200 como prueba de contratación.
- Las interfaces refrescan el catálogo cada minuto mientras están visibles. Sin red no presentan datos previos como disponibles; no se cachean respuestas de la API.
- `app/data/catalog.json` incluye enlace, categorías, evidencia y fechas. Las referencias no confirmadas permanecen como tales; no se inventan vacantes.
- La formación confirma existencia del programa, no matrícula abierta, plazas o equivalencia de un título privado. Tras 30 días se etiqueta pendiente de revalidación.

## Migración y Railway

El Dockerfile mantiene el arranque Uvicorn con `$PORT`. `railway.json` utiliza ese Dockerfile y `/api/health` como comprobación. No se requiere Node dentro del contenedor: `dist/` está versionado.

Se crean dos tablas adicionales (`opportunity_evidence` y `catalog_releases`); no se eliminan ni alteran usuarios, sesiones, oportunidades, favoritos o candidaturas existentes. La importación `2026-09-17-v1` es transaccional y se ejecuta una vez. En PostgreSQL se serializa con un bloqueo asesor. Los registros se identifican por `external_key`; los IDs preexistentes permanecen.

El catálogo anterior se conserva íntegro, con sus 103 IDs públicos locales. Los favoritos y documentos públicos siguen siendo locales al navegador; los de la cuenta están en Railway. No se fusionan automáticamente selecciones locales con cuentas, porque requieren identidad y correspondencia explícitas. Los documentos huérfanos se conservan y se pueden descargar.

Para una nueva revisión editorial, actualizar la evidencia real en el catálogo y utilizar un nuevo identificador de release en `import_catalog`; no cambiar fechas para aparentar actividad. Una release debe revisarse y probarse antes de llevarla a producción.

## Rutas

`/`, `/radar.html`, `/radar/`, `/demo`, `/cuenta/index.html`, `/estudios.html`, `/fuentes.html`, `/planes.html` y recursos estáticos. `/static/index.html` redirige a la cuenta compartida para conservar el acceso antiguo. El CSV se genera con estados actuales en `/api/catalog.csv`.

Se conservan autenticación Bearer y CORS sin cookies para Android. No hay secretos en el frontend. El dossier es un borrador; no envía solicitudes ni garantiza elegibilidad. Las bases determinan requisitos y condiciones.

## Validación del 17/09/2026

Ver `VALIDATION.md` para las pruebas y límites de esta entrega. El sitio de Sites anterior tiene un despliegue independiente: este repositorio actualiza la web servida por Railway y los assets de Android.

## Formación revisada

47 fichas: 46 verificadas y una pendiente por bloqueo HTTP 403. 36 programas oficiales y 10 propios/no oficiales verificados, con centros en 11 comunidades y 10 opciones online. Filtros independientes de modalidad, comunidad, titulación y titularidad; búsqueda sin acentos y comparación de hasta tres programas. Las opciones a distancia con presencialidad desconocida se distinguen de online. Los directorios ministeriales enlazan la oferta de todas las comunidades.

`docs/training-link-audit.json` conserva las respuestas y redirecciones comprobadas el 17/09/2026, incluido el enlace 404 descartado. La revisión de contenido se realiza aparte: una respuesta HTTP 200 no prueba oficialidad, matrícula abierta ni calidad. No renovar `last_activity_at` con un simple chequeo HTTP.

## Descargar e instalar

`/descargar.html` ofrece instalación web según dispositivo, selección manual, enlace para seguir en el navegador y descarga Android. iPhone/iPad usan Añadir a pantalla de inicio; no se anuncia una app de App Store. Windows, Mac y Linux usan instalación web cuando el navegador la ofrece o un acceso directo. El evento de instalación se consume solo tras pulsar el botón, con alternativa visible al cancelar o fallar.

`GET /downloads/Proyecta-T-1.2.1.apk` devuelve el APK de prueba existente mediante FileResponse, con MIME Android y Content-Disposition attachment. El archivo está en `releases/` para incluirlo en el despliegue Docker sin copiarlo dentro de los recursos de Capacitor ni de la caché offline. Android mínimo: API 23. No es una versión de tienda ni un release firmado para producción.

SHA-256 APK: `7e37de3e53384645dcea62840bc81d277c8f489af180f6d15895b06a19da8468`.

Instrucciones contrastadas el 01/10/2026 con Apple (https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/27/ios/27) y Chrome (https://support.google.com/chrome/answer/9658361?co=genie.platform%3DDesktop&hl=en). La compatibilidad real depende del sistema, navegador y permisos del dispositivo; el uso web siempre se ofrece como alternativa.

### Recuperación de contraseña

Configurar en Railway `PUBLIC_APP_URL` con el origen HTTPS público (sin barra final), `SMTP_HOST`, `SMTP_PORT` (587 con STARTTLS o 465 con TLS), `SMTP_USER`, `SMTP_PASSWORD` y `SMTP_FROM` de un remitente autorizado por el proveedor. No guardar secretos en el repositorio. Sin configuración, el formulario informa de que el correo no está disponible; no simula un envío.

El enlace caduca a los 30 minutos, se almacena solo su hash y se consume de forma transaccional. El cambio invalida todas las sesiones y enlaces de recuperación del usuario. Las tablas nuevas se crean sin modificar cuentas existentes. Las solicitudes tienen límites persistentes por correo y dirección de conexión. El envío se procesa después de la respuesta genérica para no revelar si existe una cuenta; si SMTP falla se revoca el enlace y se registra un error sin datos personales. Configurar supervisión de entrega y probar con un buzón propio antes de anunciar la recuperación como disponible en producción. No se han enviado correos reales en las pruebas locales.

Referencia de diseño: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html

Registro: correo y contraseña, nombre opcional y perfil posterior. Vista previa: documentos guardados, editor, exportación y dossier de cuenta; renderiza texto de forma segura y no envía el contenido a ningún servicio. La vista previa es del contenido, no una reproducción exacta de la paginación de Word/PDF.
