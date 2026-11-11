# Sprint 2 — Evidencias de ejecución

Fecha de ejecución: 2026-11-11.  
Base: `origin/main` (commit `a850fda`), sin cambios de código.  
Comandos ejecutados desde cada carpeta (`backend/` y `frontend/`).

| Comando | Resultado |
|---|---|
| `npm test` (backend, unitarias) | 26 archivos, **278 pruebas aprobadas** |
| `npm run test:e2e` (backend) | 9 archivos, **169 pruebas aprobadas** |
| `npm test` (frontend) | 24 archivos, **84 pruebas aprobadas** |
| `npm run check:i18n` (frontend) | Aprobado: `es.json` y `en.json` tienen las mismas claves |
| `npm run lint` (frontend) | Sin errores |
| `npm run build` (frontend) | Compila sin errores |

## No ejecutadas en esta corrida

- `npm run test:integration` del backend: requiere una base PostgreSQL de pruebas. Los archivos `postgres-*.integration-spec.ts` existen y cubren cierre de campañas, fotos, animales y esquema base. Quien tenga acceso a esa base debe ejecutarlas y anotar el resultado aquí antes de la entrega.
- Prueba manual del carrusel (SF-121), ver `sprint-2-matriz-pruebas.md`.

## Incidencias

Ninguna incidencia detectada por las pruebas automatizadas. Limpieza realizada durante SF-86: se retiraron del repositorio los archivos de herramienta `.tsupgrader/` y se agregó la regla al `.gitignore`.
