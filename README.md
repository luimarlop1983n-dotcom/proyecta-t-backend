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
