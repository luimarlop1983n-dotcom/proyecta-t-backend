# Validación · 17 de septiembre de 2026

- Repositorio base: `luimarlop1983n-dotcom/proyecta-t-backend`, commit `2acda065cf10945bec238eebbd3696606c8de46d`.
- Frontend compartido recuperado de la versión local aprobada del 15/09, conservando herramientas, planes y estética.
- 30 categorías visibles; 135 registros incluidos en la release (103 fichas heredadas y 32 referencias de la actualización).
- 12 programas formativos con fuente, titulación/modalidad, fecha de comprobación y matrícula por consultar.
- Seis pruebas del backend: límite exacto de frescura, cierre y zona horaria, importación idempotente, catálogo compartido, rutas/CORS y bloqueo de candidaturas cerradas.
- Seis pruebas de lógica/transportes frontend.
- Veinte recorridos de navegador en escritorio y móvil: acceso, favoritos, candidaturas, perfil, dossier, desconexión, filtros, archivo, fuentes y formación.
- APK de depuración compilado con Java 21 y SDK Android. No se ha publicado en Google Play.
- La migración se prueba con SQLite aislado; no se ejecutan pruebas de escritura contra cuentas de producción. La validación de PostgreSQL real depende del despliegue Railway.
- Algunas ofertas de la conversación no tienen evidencia suficiente de vigencia: se conservan en Por confirmar, nunca como disponibles. Incluye Noble Art y otros anuncios sin apertura comprobada.
- Comprobaciones editoriales: ficha específica y señal de solicitud/plazo abierto; los programas de formación no se etiquetan como matrícula abierta sin evidencia.
