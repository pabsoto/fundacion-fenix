# HU-18 — Evidencias de seguridad e integridad

Trazabilidad: SF-18, SF-58, RNF-01 y RNF-04.  
Fecha de ejecución: 2026-11-09.  
Rama: `qa-sprint1`.  
Entorno: Windows, Node.js, Vitest; servicios externos sustituidos por dobles controlados en unitarias y E2E.

## Resultado

| Suite | Archivos | Pruebas | Resultado |
|---|---:|---:|---|
| Seguridad unitaria de backend | 12 | 117 | Aprobadas |
| Seguridad E2E de backend | 3 | 51 | Aprobadas |
| Precomprobación de accesibilidad y contacto | 2 | 10 | Aprobadas |
| Total ejecutado | 17 | 178 | Aprobadas |

No se identificaron defectos funcionales en las suites ejecutadas. Los mensajes de error sobre conexión rechazada, fallo de limpieza y autorización denegada que aparecen durante la ejecución son escenarios simulados deliberadamente; las aserciones confirmaron que el sistema falla de forma cerrada y conserva la integridad.

## Cobertura verificada

- Inicio OAuth con correlación y PKCE.
- Rechazo de callback sin cookie o con `state` inválido.
- Autorización limitada a administradores registrados y activos.
- Cookies de sesión firmadas, `HttpOnly` y sin tokens Google.
- Rechazo de sesiones ausentes, alteradas, caducadas y revocadas.
- Invalidación de la sesión después del cierre.
- Protección CSRF y validación de origen en escrituras.
- Política CORS restringida al frontend permitido.
- Lectura y modificación administrativa de donaciones protegidas.
- Auditoría transaccional de datos bancarios.
- Validación, sustitución y retiro seguro del QR.
- Compensación entre PostgreSQL y Storage ante fallos parciales.
- Contrato público sin información administrativa.

La correspondencia caso por caso se encuentra en `docs/seguridad/HU-18-matriz-pruebas.md`.

## Comandos ejecutados

### Pruebas unitarias de seguridad

```powershell
npm.cmd test -- src/common/guards/csrf.guard.spec.ts src/common/guards/sesion-admin.guard.spec.ts src/modules/administradores/services/autorizacion-administrador.service.spec.ts src/modules/administradores/services/vinculacion-google.service.spec.ts src/modules/auth/oauth/google-oauth-client.service.spec.ts src/modules/auth/oauth/google-token-verifier.service.spec.ts src/modules/auth/services/cookie-sesion.service.spec.ts src/modules/auth/services/google-auth.service.spec.ts src/modules/auth/services/sesion-admin.service.spec.ts src/modules/donaciones/donaciones-admin.service.spec.ts src/modules/donaciones/donaciones-publicas.service.spec.ts src/modules/donaciones/donaciones-qr.service.spec.ts
```

Resultado observado:

```text
Test Files  12 passed (12)
Tests       117 passed (117)
```

### Pruebas E2E de seguridad

```powershell
npm.cmd run test:e2e -- test/google-auth.e2e-spec.ts test/sesiones-admin.e2e-spec.ts test/admin-donaciones.e2e-spec.ts
```

Resultado observado:

```text
Test Files  3 passed (3)
Tests       51 passed (51)
```

### Precomprobación automatizada de HU-19

Desde `frontend/`:

```powershell
npm.cmd test -- src/components/layout/a11y.test.tsx src/components/layout/WhatsAppFloatingButton.test.tsx
```

Resultado observado:

```text
Test Files  2 passed (2)
Tests       10 passed (10)
```

Esta precomprobación no reemplaza la prueba con personas de SF-61.

## Hallazgos y correcciones

| ID | Severidad | Hallazgo | Acción | Estado |
|---|---|---|---|---|
| H-01 | Informativa | Las pruebas de rutas de error escriben mensajes esperados en el logger de NestJS | Confirmar que son fallos simulados y que las aserciones esperan denegación o reversión | Cerrado; no requiere cambio |
| H-02 | Informativa | Las suites de integración PostgreSQL dependen de una base aislada mediante `TEST_DATABASE_URL` | Mantenerlas fuera de bases productivas y ejecutarlas en el entorno de integración | Pendiente de entorno, no bloquea unitarias/E2E |

## Limitaciones

- No se contactó a Google, Supabase Storage ni PostgreSQL de producción.
- Las pruebas E2E sustituyen esas dependencias por dobles para provocar de manera determinista los escenarios de fallo.
- La validación de restricciones reales de PostgreSQL debe ejecutarse con una base desechable y `TEST_DATABASE_URL` antes de una entrega productiva.
- La prueba con usuarios de SF-61 continúa siendo una actividad humana separada.

## Conclusión

La matriz de SF-56 quedó cubierta por 168 pruebas backend aprobadas entre unitarias y E2E. No hubo defectos críticos ni cambios de código derivados de la ejecución. SF-58 dispone ahora de resultados reproducibles, alcance, hallazgos y limitaciones explícitas.

