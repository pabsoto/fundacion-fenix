# Sprint 2 — Matriz de pruebas de aceptación, seguridad e integración

Trazabilidad: SF-28 (HU-20), SF-85, SF-86 y las subtareas de prueba del sprint 2.

Cada fila indica la prueba automatizada que respalda la subtarea. Los resultados de la última ejecución están en `sprint-2-evidencias.md`.

## Criterios de aprobación

- Todo caso automatizado termina satisfactoriamente.
- Las rutas administrativas rechazan sin sesión (`401`), con administrador desactivado (`403`) y sin token CSRF (`403`).
- La API pública nunca expone borradores ni datos administrativos.
- El contador público suma únicamente campañas en estado `cerrada` (vista `v_contador_esterilizaciones`).

## Campañas y administración (RF-07, RF-13, RF-03)

| Subtarea | Qué se prueba | Evidencia automatizada |
|---|---|---|
| SF-34 Creación y edición de campañas | Crear borrador o campaña publicada, recuperarla, editarla y publicar un borrador; validación de lugar y fecha al publicar | `backend/test/admin-campanas.e2e-spec.ts` (crear y recuperar, editar), `campanas-admin.service.spec.ts`, `frontend/src/pages/admin/CampanaFormModal.test.tsx` |
| SF-66 Carga de fotografías | Foto válida (201), no imagen (415), mayor a 5 MB (413), sin archivo (400), campaña inexistente (404), sin sesión o CSRF | `backend/test/admin-campanas-fotos.e2e-spec.ts`, `fotos-campana.service.spec.ts`, `postgres-fotos-campana.integration-spec.ts`, `CampanaFormModalFotos.test.tsx` |
| SF-70 Consistencia de cifras por campaña | Totales calculados desde los cuatro contadores, rechazo de negativos, perros+gatos = machos+hembras en el límite máximo | `admin-campanas.e2e-spec.ts` (contadores), `campanas-admin.service.spec.ts` |
| SF-71 Reglas de cierre | Solo se cierra una campaña publicada, una sola vez, con al menos una esterilización; una cerrada no se edita salvo reapertura | `campanas-admin.service.spec.ts` (cerrar y reabrir), `admin-campanas.e2e-spec.ts` (cerrar y corregir cifras), `postgres-cerrar-campana.integration-spec.ts` |
| SF-73 Acumulación y correcciones sin duplicados | Un segundo cierre se bloquea; la corrección reemplaza las cifras (no las suma) y se audita | `admin-campanas.e2e-spec.ts`, `campanas-admin.service.spec.ts` |
| SF-76 Filtros, sumas y estados sin resultados | Suma de un mes, de un año, febrero bisiesto, periodo vacío en cero | `campanas-admin.service.spec.ts`, `admin-campanas.e2e-spec.ts` (consulta de cifras), `frontend/src/services/admin/cifras-campanas.test.ts`, `AdminCampanasPage.test.tsx` |
| SF-84 Recálculo y casos sin campañas | Sin campañas cerradas el contador queda en cero; al cerrar suma, al reabrir deja de sumar | `postgres-cerrar-campana.integration-spec.ts`, `impacto-publico.service.spec.ts` |
| SF-101 Privacidad y validaciones de adopciones | Registro de adopción con datos del adoptante, rechazo de datos en animal no adoptado, rechazo de adopción anterior al ingreso, borrado de fotos en Storage, acceso solo administrativo | `animales-admin.service.spec.ts`, `fotos-animal.service.spec.ts`, `admin-animales-resumen.e2e-spec.ts`, `postgres-animales.integration-spec.ts` |

## Sitio público (RF-02, RF-11, RF-14)

| Subtarea | Qué se prueba | Evidencia automatizada |
|---|---|---|
| SF-79 Visibilidad y orden del historial | Solo campañas publicadas o cerradas con fecha; orden por fecha descendente; la más reciente se selecciona aunque su año no sea el calendario | `backend/test/campanas-publicas.e2e-spec.ts`, `impacto-publico.service.spec.ts`, `frontend/src/sections/campaigns/Campaigns.test.tsx` |
| SF-81 Acceso y contenido del detalle | Detalle anónimo sin datos internos, 404 para borrador o campaña sin fecha, 400 para id no UUID | `campanas-publicas.e2e-spec.ts`, `impacto-publico.service.spec.ts` |
| SF-63 Navegación a redes y WhatsApp | Enlaces a las redes y a WhatsApp con destino público y apertura segura; textos de la API en español e inglés | `frontend/src/components/layout/ContactFooter.test.tsx`, `useInstitutionalContent.test.tsx`, `WhatsAppFloatingButton.test.tsx` |

## Seguridad e integración (SF-85)

| Área | Evidencia automatizada |
|---|---|
| Autenticación, sesiones, CSRF y CORS | Ver `docs/seguridad/HU-18-matriz-pruebas.md` (se mantiene vigente) |
| Contrato OpenAPI y rutas de la aplicación | `backend/test/app.e2e-spec.ts` |
| Base de datos real (migraciones, vistas, restricciones) | Pruebas `backend/test/postgres-*.integration-spec.ts` (`npm run test:integration`, requieren una base PostgreSQL de pruebas) |
| Accesibilidad y usabilidad | `docs/usabilidad/` (HU-19) y `frontend/src/components/layout/a11y.test.tsx` |

## Pruebas manuales pendientes

Estas pruebas dependen de una persona y no están automatizadas:

| Subtarea | Qué falta |
|---|---|
| SF-121 Carrusel en móvil y escritorio con imágenes mixtas | Revisar en un navegador una campaña con fotos verticales y horizontales (más de 3 fotos para activar el carrusel). Depende de SF-117. |
