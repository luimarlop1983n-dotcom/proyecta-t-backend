# PROYECTA+ v0.4 — Radar nacional multifuente

## Conectores incluidos
- Ministerio de Cultura: convocatorias abiertas.
- BOE: sumario oficial mediante API de datos abiertos.
- GVA Dades Obertes: dataset histórico de ayudas concedidas (no se mezcla con convocatorias abiertas).
- Semillas verificadas manualmente para requisitos excluyentes.

## Regla de producto
Una fuente histórica nunca aparece como una convocatoria abierta.
Una detección automática del BOE no se marca como verificada hasta revisar plazo y requisitos.

## Admin
```bash
curl -X POST http://127.0.0.1:8000/api/admin/seed -H "X-Admin-Token: TU_TOKEN"
curl -X POST http://127.0.0.1:8000/api/admin/sync/cultura -H "X-Admin-Token: TU_TOKEN"
curl -X POST http://127.0.0.1:8000/api/admin/sync/boe -H "X-Admin-Token: TU_TOKEN"
```

## Próximo bloque
- BDNS / InfoSubvenciones mediante endpoint público permitido/documentado.
- DOGV / ayudas GVA abiertas.
- Diputaciones y ayuntamientos.
- Fundaciones privadas y residencias.
- Cron jobs y cola de revisión editorial.
