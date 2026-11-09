# HU-18 — Matriz de pruebas de seguridad

Trazabilidad: SF-18, SF-56, RNF-01 y RNF-04.

Fecha de revisión: 2026-11-09.  
Rama de evidencia: `qa-sprint1`.

## Objetivo

Verificar que únicamente un administrador activo y autorizado pueda consultar o modificar información privada, que las operaciones de escritura estén protegidas contra falsificación de solicitudes y que los datos oficiales conserven su integridad ante fallos parciales.

## Criterios de aprobación

- Todo caso automatizado debe terminar satisfactoriamente.
- Una solicitud anónima debe recibir `401` y una cuenta conocida pero desactivada debe recibir `403`.
- Las escrituras deben exigir sesión, origen permitido y token CSRF válido.
- El frontend público no debe recibir identificadores internos, datos de auditoría, tokens ni información de sesión.
- Un fallo de auditoría, PostgreSQL o Storage no debe dejar datos oficiales parcialmente actualizados.
- Los registros pueden contener el error simulado, pero nunca secretos, cookies o tokens completos.

## Autenticación y autorización

| ID | Riesgo | Preparación y acción | Resultado esperado | Evidencia automatizada |
|---|---|---|---|---|
| AUT-01 | Inicio OAuth falsificado | Iniciar OAuth y examinar redirección y cookie temporal | PKCE y correlación presentes; no se exponen tokens | `backend/test/google-auth.e2e-spec.ts` |
| AUT-02 | Callback sin correlación | Invocar callback sin cookie de transacción | Solicitud rechazada | `backend/test/google-auth.e2e-spec.ts` |
| AUT-03 | Manipulación de `state` | Enviar `state` ausente o diferente | Solicitud rechazada | `backend/test/google-auth.e2e-spec.ts` |
| AUT-04 | Cuenta ajena a la fundación | Completar autenticación con identidad no registrada | No se crea sesión administrativa | `google-auth.service.spec.ts` y `autorizacion-administrador.service.spec.ts` |
| AUT-05 | Cuenta desactivada | Consultar un endpoint privado con administrador inactivo | Respuesta `403` | `backend/test/sesiones-admin.e2e-spec.ts` |
| AUT-06 | Acceso anónimo | Consultar endpoints administrativos sin cookie | Respuesta `401` | `sesiones-admin.e2e-spec.ts` y `admin-donaciones.e2e-spec.ts` |

## Sesiones y privacidad

| ID | Riesgo | Preparación y acción | Resultado esperado | Evidencia automatizada |
|---|---|---|---|---|
| SES-01 | Cookie alterada | Cambiar el identificador de sesión | Respuesta `401` | `backend/test/sesiones-admin.e2e-spec.ts` |
| SES-02 | Sesión expirada | Usar una sesión fuera de su vigencia | Respuesta `401` | `sesiones-admin.e2e-spec.ts` y `sesion-admin.service.spec.ts` |
| SES-03 | Reutilización tras logout | Cerrar sesión y reutilizar la cookie | Respuesta `401` | `backend/test/sesiones-admin.e2e-spec.ts` |
| SES-04 | Fuga de información privada | Consultar la sesión actual | Solo nombre, identificador administrativo, expiración y CSRF; sin token Google | `sesiones-admin.e2e-spec.ts` y `cookie-sesion.service.spec.ts` |
| SES-05 | Redirección abierta | Proporcionar una URL externa como retorno | Se ignora la URL no permitida | `backend/test/sesiones-admin.e2e-spec.ts` |
| SES-06 | Fallo del almacén | Simular PostgreSQL no disponible | Acceso denegado con `503`; nunca se concede por omisión | `sesion-admin.guard.spec.ts` y `sesiones-admin.e2e-spec.ts` |

## CSRF, origen y CORS

| ID | Riesgo | Preparación y acción | Resultado esperado | Evidencia automatizada |
|---|---|---|---|---|
| WEB-01 | Escritura sin CSRF | Enviar `PUT` o `POST` autenticado sin token | Respuesta `403` | `csrf.guard.spec.ts`, `sesiones-admin.e2e-spec.ts` y `admin-donaciones.e2e-spec.ts` |
| WEB-02 | CSRF incorrecto | Enviar un token diferente al de sesión | Respuesta `403` | `csrf.guard.spec.ts` y `admin-donaciones.e2e-spec.ts` |
| WEB-03 | Origen hostil | Escribir desde un origen no permitido | Solicitud rechazada | `backend/test/sesiones-admin.e2e-spec.ts` |
| WEB-04 | CORS permisivo | Consultar desde un origen no permitido | No se devuelven cabeceras CORS de autorización | `backend/test/sesiones-admin.e2e-spec.ts` |
| WEB-05 | Origen legítimo bloqueado | Escribir desde el frontend configurado | Solicitud admitida con sesión y CSRF válidos | `backend/test/sesiones-admin.e2e-spec.ts` |

## Integridad de donaciones y QR

| ID | Riesgo | Preparación y acción | Resultado esperado | Evidencia automatizada |
|---|---|---|---|---|
| DON-01 | Modificación anónima | Guardar datos bancarios sin sesión | Respuesta `401`; no hay cambios | `backend/test/admin-donaciones.e2e-spec.ts` |
| DON-02 | Suplantación del responsable | Enviar un identificador administrativo en el cuerpo | El backend lo ignora o rechaza y usa la sesión | `backend/test/admin-donaciones.e2e-spec.ts` |
| DON-03 | Configuraciones activas duplicadas | Intentar operar con más de una configuración activa | Operación rechazada de forma coherente | `admin-donaciones.e2e-spec.ts` y `postgres-donaciones.integration-spec.ts` |
| DON-04 | Auditoría incompleta | Forzar un fallo al registrar auditoría | Se revierte la actualización principal | `donaciones-admin.service.spec.ts` y `admin-donaciones.e2e-spec.ts` |
| DON-05 | Archivo QR inválido | Subir contenido no admitido o demasiado grande | Solicitud rechazada; Storage y BD no cambian | `donaciones-qr.service.spec.ts` y `admin-donaciones.e2e-spec.ts` |
| DON-06 | Fallo de Storage | Simular fallo durante la subida | PostgreSQL conserva el estado anterior | `backend/test/admin-donaciones.e2e-spec.ts` |
| DON-07 | Fallo posterior a subida | Subir el archivo y forzar fallo de auditoría | Se revierte PostgreSQL y se elimina el archivo nuevo | `donaciones-qr.service.spec.ts` y `admin-donaciones.e2e-spec.ts` |
| DON-08 | Exposición de QR vencido | Consultar la configuración pública con QR vencido | El QR vencido no se publica | `donaciones-publicas.service.spec.ts` y `admin-donaciones.e2e-spec.ts` |
| DON-09 | Filtración pública | Consultar datos oficiales sin sesión | Solo se entrega el contrato público autorizado | `donaciones-publicas.service.spec.ts` |

## Persistencia real

Las siguientes comprobaciones requieren `TEST_DATABASE_URL` apuntando a una base PostgreSQL aislada. Nunca deben ejecutarse contra producción:

- Persistencia y revocación de sesiones después de reiniciar el backend.
- Restricciones, claves foráneas e índices reales.
- Ausencia de privilegios para `PUBLIC`, `anon` y `authenticated`.
- Transacciones reales de donaciones y auditoría.
- Compensación del QR cuando falla una transacción.

Evidencia: `backend/test/postgres-sesiones.integration-spec.ts` y `backend/test/postgres-donaciones.integration-spec.ts`.

## Comandos reproducibles

Desde `backend/`:

```powershell
npm.cmd test -- src/common/guards/csrf.guard.spec.ts src/common/guards/sesion-admin.guard.spec.ts src/modules/administradores/services/autorizacion-administrador.service.spec.ts src/modules/administradores/services/vinculacion-google.service.spec.ts src/modules/auth/oauth/google-oauth-client.service.spec.ts src/modules/auth/oauth/google-token-verifier.service.spec.ts src/modules/auth/services/cookie-sesion.service.spec.ts src/modules/auth/services/google-auth.service.spec.ts src/modules/auth/services/sesion-admin.service.spec.ts src/modules/donaciones/donaciones-admin.service.spec.ts src/modules/donaciones/donaciones-publicas.service.spec.ts src/modules/donaciones/donaciones-qr.service.spec.ts
npm.cmd run test:e2e -- test/google-auth.e2e-spec.ts test/sesiones-admin.e2e-spec.ts test/admin-donaciones.e2e-spec.ts
```

Para las pruebas PostgreSQL aisladas:

```powershell
$env:TEST_DATABASE_URL='postgresql://usuario:clave@localhost:5432/fenix_pruebas'
npm.cmd run test:integration
```

