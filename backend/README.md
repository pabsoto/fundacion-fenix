# Backend - Fundación FÉNIX LPB

API NestJS del sitio público y del panel administrativo de Fundación FÉNIX LPB.

El backend incluye la estructura modular, configuración de entorno, CORS con orígenes explícitos, validación global, manejo uniforme de errores, conexión a PostgreSQL mediante TypeORM, la autenticación administrativa mediante Google OAuth 2.0 / OpenID Connect y **sesiones administrativas persistentes en servidor** con cookies seguras, cierre de sesión y guards de protección. El CRUD de administradores y el resto de controladores funcionales todavía no están implementados.

## Requisitos

- Node.js 24 o una versión LTS compatible con las dependencias declaradas.
- npm 11 o compatible.

## Configuración local

Desde `backend/`:

```bash
npm install
cp .env.example .env
npm run start:dev
```

En PowerShell, la copia del archivo de entorno puede hacerse con:

```powershell
Copy-Item .env.example .env
```

`CORS_ALLOWED_ORIGINS` acepta una lista separada por comas. Cada valor debe ser un origen completo y explícito, por ejemplo:

```dotenv
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://administracion.ejemplo.org
```

No se admite `*` porque la aplicación habilita credenciales CORS para las futuras cookies de autenticación.

### PostgreSQL de Supabase

Configura en `.env` la URI del **Session pooler** de Supabase. Para desarrollo local se utiliza el puerto 5432:

```dotenv
DATABASE_URL=postgresql://usuario:TU_PASSWORD@host:5432/postgres
DATABASE_CA_CERT_PATH=C:/ruta/segura/prod-supabase.cer
```

La aplicación siempre usa TLS con verificación del certificado del servidor. Si Node.js informa `SELF_SIGNED_CERT_IN_CHAIN`, descarga el certificado raíz desde **Supabase Dashboard > Database Settings > SSL Configuration > Download Certificate** y asigna su ruta absoluta a `DATABASE_CA_CERT_PATH`. Conserva el certificado fuera del repositorio; `backend/certs/` también está ignorado por Git.

No uses `rejectUnauthorized: false` ni un modo SSL que omita la verificación. La documentación oficial de Supabase explica la configuración `verify-full`: https://supabase.com/docs/guides/platform/ssl-enforcement

No agregues `ssl`, `sslmode`, `sslrootcert`, `sslcert` ni `sslkey` a `DATABASE_URL`. El driver `pg` da prioridad a esos parámetros y puede reemplazar el objeto TLS proporcionado por la aplicación. El backend los rechaza y carga exclusivamente la CA indicada por `DATABASE_CA_CERT_PATH`, manteniendo `rejectUnauthorized: true` y la verificación del hostname.

TypeORM está configurado con `synchronize: false`, `dropSchema: false`, `migrationsRun: false` e `installExtensions: false`. El archivo `src/database/typeorm.datasource.ts` queda preparado como DataSource para migraciones futuras, pero esta etapa no crea ni ejecuta migraciones.

## Comandos

```bash
npm run start:dev  # desarrollo con recarga
npm run build      # compilación
npm run lint       # análisis estático
npm test           # pruebas unitarias
npm run test:e2e   # pruebas HTTP de integración
npm run test:integration  # pruebas contra PostgreSQL aislado (opcional)
npm run auth:link  # vinculación inicial de identidad Google (tras compilar)
```

## Comprobación de salud

Con la aplicación ejecutándose:

```text
GET http://localhost:3000/api/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "database": "up",
  "timestamp": "2026-10-21T00:00:00.000Z"
}
```

La ruta ejecuta una consulta de solo lectura `SELECT 1`. Si PostgreSQL no está disponible, responde HTTP 503 con
`status: "error"` y `database: "down"`, sin incluir detalles internos de la
conexión.

TypeORM está configurado con `manualInitialization: true`, de modo que la
conexión se establece explícitamente en `src/main.ts` al arrancar, antes de
escuchar. Así la base de datos está disponible desde la primera petición (los
endpoints de sesión la necesitan). Si la base de datos no estuviera disponible
en el arranque, la aplicación arrancaría igualmente y esta ruta informs del
estado. Si PostgreSQL no está disponible, responde HTTP 503 con `status: "error"` y `database: "down"`, sin incluir detalles internos de la conexión.

## Integración continua

El workflow `.github/workflows/ci.yml` comprueba el backend cuando se abre o actualiza un Pull Request hacia `develop` o `main`, cuando se publica un cambio en esas ramas y cuando se inicia manualmente desde GitHub Actions.

La integración continua usa Node.js 24, instala las dependencias reproducibles con `npm ci` y ejecuta, en orden:

```bash
npm run lint
npm run build
npm test
npm run test:e2e
```

Estas mismas comprobaciones pueden ejecutarse localmente desde `backend/`. Las pruebas E2E sustituyen el `DataSource` de TypeORM y no se conectan a Supabase. El workflow utiliza variables ficticias de entorno, no ejecuta migraciones y no necesita secretos del repositorio.

Las pruebas del flujo de Google OIDC **nunca contactan con Google**: el cliente OIDC y el verificador de ID tokens se sustituyen por dobles de prueba, y las claves públicas se generan localmente para verificar firmas reales sin realizar ninguna llamada externa. Las credenciales ficticias viven únicamente en `vitest.config.e2e.ts` y están aisladas del flujo real de autenticación.

Los resultados se consultan en la pestaña **Actions** del repositorio o en la sección de comprobaciones del Pull Request. Si una comprobación falla, revisa el paso que produjo el error, reproduce su comando desde `backend/`, corrige el problema y vuelve a publicar la rama para ejecutar CI otra vez.

El despliegue continuo queda pendiente hasta definir el proveedor de alojamiento, los entornos y el manejo de secretos de despliegue.

---

# Autenticación administrativa con Google OAuth 2.0 / OpenID Connect

Esta sección documenta la Etapa 4 (SF-35 y validación de identidad administrativa de SF-36). El sistema tiene **únicamente dos cuentas administrativas**, previamente registradas en PostgreSQL. No existe registro público ni contraseñas propias.

## Biblioteca OIDC seleccionada

Se usa **[`openid-client`](https://github.com/panva/openid-client) v6** (mantenida por panva, proyecto de referencia de OpenID Connect) y **[`jose`](https://github.com/panva/jose) v6** para la verificación criptográfica.

Justificación:

- `openid-client` es la implementación de referencia de OIDC para Node.js, con mantenimiento activo y compatible con NestJS 12 (funciona con módulos ES nativos, igual que el proyecto, y con `module: nodenext`).
- Implementa el *Authorization Code Grant* con PKCE, validación del `state` de la respuesta y canje del código en el *token endpoint* contra los metadatos descubiertos del proveedor, sin depender de URL fijas ni de parches.
- Permite usar la autenticación de cliente `client_secret_post`, que es la que acepta Google para clientes OAuth de tipo aplicación web.
- `jose` permite verificar la firma del ID token contra el JWKS oficial de Google y exponer de forma explícita y auditable cada comprobación (`iss`, `aud`, `exp`, `nonce`, `email_verified`, `sub`, `azp`) sin delegarlas en una caja negra, y sustituir el JWKS remoto por un conjunto local durante las pruebas.

La verificación del ID token **no** se delega en la biblioteca: se realiza en `src/modules/auth/oauth/google-token-verifier.service.ts`.

## Endpoints

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/auth/google` | Inicia la autenticación y redirige (302) a Google. |
| `GET` | `/api/auth/google/callback` | Recibe y valida la respuesta de Google, crea la sesión y redirige al frontend. |

La ruta del callback incluye el prefijo global `api` del backend, por lo que la URI de redirección registrada en Google Cloud Console debe ser exactamente:

```text
https://<host-del-backend>/api/auth/google/callback
```

No fue necesario ajustar ni el método ni la ruta. El callback es un `GET` porque Google responde mediante una redirección del navegador al *authorization endpoint* con los parámetros `code` y `state` en la cadena de consulta.

### Respuesta del callback

Desde la **Etapa 5** el callback crea la sesión de aplicación, establece la
cookie de sesión y **redirige (302)** al frontend administrativo
configurado en `AUTH_REDIRECT_URL`:

```text
Location: https://administracion.fundacionfenix.org/admin
```

La respuesta del callback ya no es un JSON: es una redirección. La URL de
destino **nunca** se toma de la petición: se usa siempre la configurada en el
servidor, cuyo origen está en la lista de orígenes CORS permitidos. La URL no
contiene tokens, códigos OAuth ni el identificador de sesión.

Los errores (por ejemplo, `state` inválido, `error=access_denied` de Google o
una identidad no autorizada) se devuelven con el formato uniforme del backend
(`statusCode`, `error`, `message`, `timestamp`, `path`), sin cadena de
consulta, para no filtrar el código de autorización.

## Variables de entorno

```dotenv
# Credenciales del cliente OAuth de Google (tipo aplicación web)
GOOGLE_CLIENT_ID=TU_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=TU_CLIENT_SECRET

# Debe coincidir exactamente con la URI registrada en Google Cloud Console
GOOGLE_CALLBACK_URL=https://api.fundacionfenix.org/api/auth/google/callback

# Secreto de al menos 32 caracteres para firmar la cookie de la transacción OAuth
GOOGLE_OAUTH_STATE_SECRET=<valor aleatorio de 32 o más caracteres>

# Opcionales
GOOGLE_OAUTH_TRANSACTION_TTL_SECONDS=600        # 60-900, por defecto 600
GOOGLE_OAUTH_ISSUER=https://accounts.google.com
GOOGLE_OAUTH_JWKS_URI=https://www.googleapis.com/oauth2/v3/certs

# Procedimiento aislado de vinculación inicial (herramienta de línea de comandos)
GOOGLE_LINK_AUTHORIZATION_TOKEN=<secreto de autorización>
GOOGLE_LINK_CLI_PORT=3005
```

- Las credenciales se colocan **exclusivamente** en `backend/.env` (ignorado por Git). `.env.example` contiene valores ficticios.
- Si se declara **alguna** variable de Google, todas las obligatorias deben estar presentes y ser válidas: las configuraciones parciales se rechazan al arrancar.
- Si no se declara ninguna, el flujo de Google queda deshabilitado y los endpoints devuelven `503`. En `NODE_ENV=production` la aplicación **no arranca** sin la configuración de Google.
- Los permisos solicitados son únicamente `openid`, `email` y `profile`. No se solicitan permisos de Gmail, Drive ni Calendar, y no se solicita `access_type=offline`.

## Configuración en Google Cloud Console

1. Abre [Google Cloud Console](https://console.cloud.google.com/) y selecciona (o crea) el proyecto de la Fundación FÉNIX LPB.
2. En el menú hamburguesa ve a **APIs & Services → Google Auth Platform**. Si el panel no existe, actívalo con **Setup Google Auth Platform** y completa nombre, correo de soporte y correo de la Fundación.
3. En la pestaña **Clients**, pulsa **Create client**.
4. Selecciona **Web application** (cliente OAuth de tipo aplicación web). Usa un nombre descriptivo, por ejemplo `FENIX Panel Administrativo`.
5. En **Authorized redirect URIs** añade **exactamente** la URI configurada en `GOOGLE_CALLBACK_URL`:
   - producción: `https://api.fundacionfenix.org/api/auth/google/callback`
   - desarrollo local: `http://localhost:3000/api/auth/google/callback`
   - Para el procedimiento de vinculación inicial: `http://127.0.0.1:3005/callback` (ver más abajo).
   Google exige coincidencia exacta de esquema, host, puerto y ruta.
6. Pulsa **Create**. Copia el **Client ID** y el **Client secret** y colócalos en `backend/.env` como `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
7. En la pestaña **Test users** añade las cuentas de Google de las dos personas administradoras (y, si hace falta, la de la persona responsable técnica que ejecutará el procedimiento de vinculación). Google limita el flujo a los usuarios de prueba mientras la aplicación esté en estado «Testing».
8. En la pestaña **Data Access** comprueba que la aplicación no ha solicitado permisos fuera de `openid`, `email` y `profile`.

La aplicación no necesita ningún secreto de Google en la integración continua: `openid-client` descubre los metadatos de Google en tiempo de ejecución y las pruebas no contactan con Google.

## Medidas de seguridad implementadas

- **`state` aleatorio y validado**: 32 bytes aleatorios (`randomState`) guardados en un almacén de transacciones en memoria del servidor. La respuesta de Google sólo se acepta si el `state` corresponde a una transacción vigente. Es la protección frente a CSRF del flujo OAuth.
- **`nonce`**: 32 bytes aleatorios enviados en la solicitud de autorización y exigidos en el claim `nonce` del ID token. Impide reutilizar un ID token de una autenticación anterior.
- **PKCE**: se genera un `code_verifier` aleatorio, se envía su `code_challenge` S256 en la solicitud de autorización y el verificador se envía en el canje del código.
- **Vinculación con el navegador**: además del `state`, se entrega una cookie `HttpOnly`, `SameSite=Lax` y firmada (`fenix_oauth_tx`) con un valor aleatorio que también se guarda en la transacción. Si la respuesta no llega desde el mismo navegador que inició el flujo, se rechaza. La firma usa `GOOGLE_OAUTH_STATE_SECRET`.
- **Origen y correlación de la respuesta**: se comprueba que la petición se recibió en la ruta configurada y que el `state` coincide con una transacción viva.
- **Un solo uso**: la transacción se elimina del almacén al consumirse. Una respuesta repetida de Google no puede canjearse dos veces (además, el código de autorización es de un solo uso en Google).
- **Caducidad**: la transacción expira a los `GOOGLE_OAUTH_TRANSACTION_TTL_SECONDS` (600 s por defecto) y se purga automáticamente.
- **Verificación del ID token** (`google-token-verifier.service.ts`): firma criptográfica contra el JWKS oficial de Google, `iss` en {`https://accounts.google.com`, `accounts.google.com`}, `aud` igual a `GOOGLE_CLIENT_ID`, `exp` y `nbf` vigentes, `nonce` idéntico al de la transacción, `azp` (si existe) igual al cliente, `email_verified = true` y presencia de `sub`.
- **Sin fugas**: no se devuelven ID tokens, access tokens, refresh tokens ni códigos de autorización en las respuestas ni en URLs de redirección. El filtro global de errores elimina la cadena de consulta de la ruta informada.
- **Sin sustitutos de autorización**: no se usa `hd` ni el dominio del correo como criterio de autorización, y nunca se acepta un correo o un `google_sub` enviado por el frontend como prueba de identidad.

## Autorización de los administradores

La tabla existente `public.administradores` es la única fuente de verdad. `src/modules/administradores/services/autorizacion-administrador.service.ts` ejecuta, **después** de verificar la identidad de Google:

1. Localiza al administrador por el correo verificado (normalizado a minúsculas).
2. Comprueba que el correo está autorizado (la cuenta existe en PostgreSQL) y verificado por Google.
3. Comprueba `activo = true`.
4. Comprueba que el `sub` de Google coincide con `google_sub` cuando ya existe una vinculación.
5. Rechaza cuentas inexistentes, inactivas o vinculadas a otra identidad.
6. Devuelve una representación interna mínima (`id`, `nombre`, `email`, `googleSub`, `vinculado`), sin datos sensibles.

No se crean administradores automáticamente al recibir un login de Google. Desde la Etapa 5, `ultimo_acceso` sí se actualiza en PostgreSQL cuando se establece la sesión.

## Primera vinculación de identidad (`google_sub = NULL`)

Algunos administradores pueden tener `google_sub = NULL`. La vinculación inicial **no** se realiza de forma automática durante el inicio de sesión: se ejecuta con una herramienta de línea de comandos aislada, que exige un segundo factor de autorización.

Procedimiento (desde `backend/`, con la compilación al día: `npm run build`):

1. **Fase de verificación (no escribe nada)**. La persona administradora abre la URL que muestra el comando, inicia sesión con su cuenta de Google y el script verifica la identidad (firma, `iss`, `aud`, `exp`, `nonce`, `email_verified`) y comprueba que la cuenta existe, está activa y no tiene vinculación:

   ```bash
   npm run auth:link -- --email=administrador@fundacionfenix.org
   ```

   El script imprime el `sub` de Google y los datos de la cuenta administrativa aprobada.

2. **Revisión humana**. La persona responsable técnica compara el `sub` impreso con la identidad de Google esperada (por ejemplo, verificando en la sesión de Google que la cuenta realmente pertenece a la persona autorizada). El valor `sub` es un identificador estable de Google y no un dato que el usuario pueda elegir.

3. **Fase de confirmación (escribe `google_sub`)**. Requiere el secreto `GOOGLE_LINK_AUTHORIZATION_TOKEN` en el entorno, el valor `--sub` revisado y la flag `--confirm`:

   ```bash
   GOOGLE_LINK_AUTHORIZATION_TOKEN=<secreto> npm run auth:link -- --email=administrador@fundacionfenix.org --sub=<SUB> --confirm
   ```

   El script vuelve a verificar la identidad de Google en esa misma ejecución, por lo que el `sub` confirmado corresponde a una autenticación verificada en ese momento.

Garantías de la operación:

- No se sobrescribe una vinculación existente (`google_sub IS NULL` es condición obligatoria).
- No se vincula un `sub` que ya pertenece a otra cuenta administrativa.
- No se vincula una identidad cuyo correo no coincida con el correo registrado.
- La escritura es condicional (`WHERE id = ? AND google_sub IS NULL`), por lo que dos ejecuciones simultáneas no pueden pisarse.
- La fase de verificación no modifica ningún registro.

La herramienta reutiliza `GOOGLE_CALLBACK_URL` por defecto, evitando una URI
adicional distinta de la que ya utiliza el backend. Si se define
`GOOGLE_LINK_CALLBACK_URL`, debe ser una URL HTTP de loopback y estar registrada
exactamente en las URI de redirección autorizadas del cliente OAuth de Google.

Si la cuenta tiene `google_sub = NULL` y alguien intenta iniciar sesión desde el navegador, el callback responde `403` con el mensaje de que la cuenta requiere el procedimiento de vinculación inicial. No se concede ningún acceso.

## Qué queda pendiente para la Etapa 5

Este bloque describe el trabajo **pendiente** de la Etapa 5. Todo lo listado
está implementado y documentado en la sección siguiente.

- [x] Sesión persistente de aplicación (cookie `HttpOnly`, `Secure`, `SameSite`), emisión y rotación del identificador de sesión.
- [x] Endpoint de cierre de sesión y guards de acceso al panel administrativo.
- [x] Actualización de `ultimo_acceso` al establecer la sesión.
- [x] Redirección al frontend tras el login y renovación del identificador de sesión.
- [x] Sustitución de la respuesta intermedia `autorizado_sin_sesion` por la creación real de la sesión.
- [ ] Aplicar la migración `public.sesiones_admin` en Supabase (requiere autorización).

---

# Sesiones administrativas y protección del panel (Etapa 5)

Esta sección documenta la Etapa 5 (SF-36 y SF-46). Reutiliza los módulos
`auth` y `administradores` de la Etapa 4: **no** se añade una segunda
estrategia de autenticación ni se sustituye `openid-client`/`jose`.

## Estrategia de sesión elegida

**Sesión opaca persistida en servidor** (tabla `public.sesiones_admin`).

- El identificador de sesión es un valor aleatorio de 256 bits generado con
  `randomBytes` (`node:crypto`): criptográficamente seguro y opaco para el
  navegador.
- En PostgreSQL **sólo se almacena el resumen SHA-256** del identificador.
  Un volcado de la tabla no permite autenticarse. El valor en claro viaja
  únicamente en la cookie.
- La validez se persiste, de modo que las sesiones **sobreviven a un
  reinicio del backend** y pueden revocarse en cualquier momento.
- **No se emiten JWT**: una sesión revocada debe ser rechazada de inmediato,
  cosa que un token autocontenido no permite sin una lista de revocación
  adicional. Tampoco se usa un `Map` en memoria como almacenamiento
  definitivo: el almacén de transacciones OAuth sigue estando en memoria
  (es efímero por diseño), pero las sesiones de aplicación no.

Caducidades:

| Concepto | Variable | Por defecto |
| :--- | :--- | :--- |
| Caducidad por inactividad | `SESSION_IDLE_TIMEOUT_SECONDS` | 1800 s (30 min) |
| Caducidad máxima absoluta | `SESSION_ABSOLUTE_TIMEOUT_SECONDS` | 43200 s (12 h) |
| Intervalo de renovación del identificador | `SESSION_ROTATION_INTERVAL_SECONDS` | 300 s |

La renovación (rotación) del identificador se produce de forma transparente:
el guard emite un identificador nuevo cuando el vigente envejece, y el
anterior deja de ser válido de inmediato. El token anti-CSRF **no** cambia
en la rotación, para no invalidar el valor que el frontend mantiene en
memoria.

La aplicación **nunca** reutiliza un identificador previo: cada
autenticación crea una sesión nueva, lo que evita ataques de fijación de
sesión.

## Tabla nueva y migración

Se requiere **una tabla nueva**: `public.sesiones_admin`. No se modifica
ninguna tabla existente.

Migración TypeORM versionada:
`src/database/migrations/1730000000000-CrearTablaSesionesAdmin.ts`.

SQL equivalente para aplicar desde el editor SQL de Supabase:
`sql/crear-sesiones-admin.sql`.

> **PENDIENTE DE AUTORIZACIÓN.** La migración **no** se ha aplicado en la
> base de datos de Supabase. Hasta que se aplique, la autenticación con
> sesión no funciona contra Supabase: el callback de Google responde `503`
> porque la tabla de sesiones no existe. TypeORM sigue configurado con
> `synchronize: false`, `migrationsRun: false` e `installExtensions: false`;
> la migración se aplica de forma explícita y controlada.

Columnas:

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `uuid` | Identificador de la sesión. |
| `administrador_id` | `uuid` | Administrador propietario (clave foránea a `administradores`, `ON DELETE CASCADE`). |
| `token_hash` | `text` | Resumen SHA-256 del identificador de sesión (único). |
| `csrf_token` | `text` | Token anti-CSRF ligado a la sesión. |
| `creada_en` | `timestamptz` | Instante de creación. |
| `token_emitido_en` | `timestamptz` | Instante en que se emitió el identificador vigente. |
| `ultima_actividad_en` | `timestamptz` | Última petición válida (reinicia la caducidad por inactividad). |
| `expira_en` | `timestamptz` | Caducidad máxima absoluta. |
| `revocada_en` | `timestamptz` | Instante de revocación (`null` si está activa). |
| `motivo_revocacion` | `text` | `logout` u otro motivo. |

Restricciones e índices: clave primaria `sesiones_admin_pkey`, unicidad de
`token_hash` (`sesiones_admin_token_hash_key`), clave foránea
`fk_sesiones_admin_administrador`, comprobaciones
`ck_sesiones_admin_expira_posterior_creacion`,
`ck_sesiones_admin_revocation_coherente`,
`ck_sesiones_admin_token_hash_formato` y
`ck_sesiones_admin_csrf_token_formato`, e índices
`ix_sesiones_admin_administrador_id` e `ix_sesiones_admin_expira_en`.

### Protecciones frente al acceso desde el frontend

Ni `public.sesiones_admin` ni `public.migrations` (el historial de
migraciones de TypeORM) son accesibles desde el frontend ni desde los roles
públicos de Supabase:

- `Row Level Security` **activado** y **sin ninguna política** en las dos
  tablas (`pg_policies` devuelve 0 filas).
- Sin privilegios de lectura ni de escritura para `PUBLIC`, `anon`,
  `authenticated` ni `service_role` (verificado empíricamente: una conexión
  con esos roles recibe `permission denied for table ...`).
- Privilegios de escritura sólo para el propietario de cada tabla y para el
  rol `postgres` — que es la cuenta con la que el backend se conecta a
  través del pooler, verificado con `current_user`.
- La secuencia `public.migrations_id_seq` está protegida con la misma
  política: los permisos por defecto de Supabase también afectan a las
  secuencias.
- La clave foránea `ON DELETE CASCADE` garantiza que no queden sesiones
  huérfanas apuntando a una cuenta eliminada.

`service_role` **no** tiene acceso a ninguna de las dos tablas: el backend se
conecta a PostgreSQL directamente y no usa la Data API de Supabase, así que
no lo necesita. Es una desviación deliberada respecto a las demás tablas del
esquema `public`, que sí lo tienen.

Esto es especialmente importante porque en Supabase los **permisos por
defecto** del esquema `public` otorgan `SELECT/INSERT/UPDATE/DELETE` a `anon`
y `authenticated` en toda tabla nueva. Sin las revocaciones explícitas de las
migraciones, la Data API (`/rest/v1/sesiones_admin`, `/rest/v1/migrations`)
expondría los resúmenes de los identificadores de sesión y permitiría
manipular el historial de migraciones.

### Protección del historial de migraciones

TypeORM crea `public.migrations` por su cuenta la primera vez que se ejecuta
una migración: **fuera** de la transacción de la migración y **sin ninguna
protección**. Para evitarlo, el script `db:migrate` crea y protege esa tabla
**antes** de aplicar las migraciones, dentro de una única transacción:

- el esquema es exactamente el que TypeORM espera (`id SERIAL`,
  `timestamp bigint`, `name varchar`, clave primaria
  `PK_8c82d7f526340ab734260ea46be`), de modo que TypeORM la reconoce y la
  utiliza sin cambios;
- la creación y todas las protecciones ocurren en la misma transacción: la
  tabla nunca es visible para otra sesión en un estado desprotegido, **no hay
  ventana de exposición**;
- las sentencias son idempotentes: si la tabla ya existe, sólo se corrigen
  sus privilegios;
- el script **aborta** si la tabla no ha quedado protegida.

El espejo en SQL para revisión es `sql/proteger-migrations.sql`.

TypeORM sólo crea además la tabla `typeorm_metadata` si el proyecto tiene
vistas o columnas generadas. Este proyecto no tiene ninguna de las dos
cosas, así que esa tabla no llega a existir (se comprueba en la verificación).

### Procedimiento oficial de aplicación

**Uno solo: la migración TypeORM**, ejecutada con el script del proyecto:

```bash
cd backend
npm run build
npm run db:migrate                 # simulación (sólo lectura): lista lo pendiente
npm run db:migrate -- --confirmar  # aplica las migraciones pendientes
```

El script:

- no escribe nada sin `--confirmar`;
- muestra la base de datos de destino con la contraseña oculta;
- comprueba que `synchronize` y `migrationsRun` siguen en `false`;
- **crea y protege `public.migrations` antes de aplicar las migraciones** y
  aborta si no queda protegida;
- registra la migración aplicada en `public.migrations`, que es el historial
  que TypeORM usa para saber qué falta;
- es idempotente: si la migración ya está aplicada, no hace nada.

`sql/crear-sesiones-admin.sql` es el **espejo exacto** de la migración
TypeORM (lo verifica `src/database/migrations/migraciones-equivalencia.spec.ts`,
que falla si ambas versiones se separan) y `sql/proteger-migrations.sql` es el
espejo exacto del módulo que protege el historial. Si se aplican a mano, hay
que ejecutar después `npm run db:migrate -- --confirmar` para reconciliar el
historial de TypeORM: el DDL es idempotente (`IF NOT EXISTS`), de modo que esa
segunda ejecución no altera las tablas y sólo registra la migración.

> No debe usarse `npx typeorm migration:run` directamente: esa vía crearía
> `public.migrations` sin protección.

### Verificación posterior a la aplicación

`sql/verificar-migraciones.sql` contiene consultas de **sólo lectura** para
comprobar, después de aplicar las migraciones:

1. existencia y propietario de `sesiones_admin` y de `migrations`;
2. estado de Row Level Security y número de políticas de ambas;
3. permisos efectivos de `anon`, `authenticated` y `service_role` sobre
   ambas;
4. permisos de `PUBLIC` sobre ambas (vía `aclexplode`);
5. permisos sobre la secuencia `migrations_id_seq`;
6. acceso desde la cuenta PostgreSQL que usa el backend;
7. historial de migraciones de TypeORM;
8. columnas, restricciones e índices de ambas tablas;
9. comprobación de que las tablas existentes siguen intactas.

### Reversión

Si la migración falla y hay que revertirla, la operación afecta **sólo** a
`public.sesiones_admin`:

```sql
DROP TABLE IF EXISTS public.sesiones_admin;
```

o, con el CLI de TypeORM sobre el mismo `DataSource`:

```bash
npx typeorm migration:revert -- -d dist/database/typeorm.datasource.js
```

La tabla de sesiones es la **dependiente** de la relación: su clave foránea
apunta *a* `administradores`, de modo que eliminarla no afecta a
`administradores` ni a ninguna otra tabla (verificado: `administradores` y sus
filas permanecen intactas). Al revertir se borra también la fila
correspondiente del historial de migraciones.

La tabla `public.migrations` **no** se elimina al revertir: es el historial
de TypeORM y debe conservarse. Si hubiera que retirarla, se haría de forma
explícita y sólo después de confirmar que no queda ninguna migración
pendiente.

## Cookies seguras

| Atributo | Desarrollo local | Producción |
| :--- | :--- | :--- |
| `HttpOnly` | `true` | `true` |
| `Secure` | `false` sólo con `SESSION_COOKIE_SECURE=false` explícito | `true` (obligatorio) |
| `SameSite` | `lax` | `lax` (o `none` si el frontend y el backend están en sitios distintos) |
| `Path` | `/api` | `/api` |
| `Domain` | no definido (cookie «host-only») | no definido, salvo `SESSION_COOKIE_DOMAIN` |
| Caducidad | la de inactividad de la sesión | la de inactividad de la sesión |

- `SESSION_COOKIE_SECURE=false` en producción **impide el arranque** de la
  aplicación: una cookie de producción nunca se debilita para resolver un
  problema de desarrollo.
- `SameSite=None` exige `Secure=true`; está pensado para un despliegue entre
  sitios distintos (por ejemplo `api.fundacionfenix.org` y
  `administracion.fundacionfenix.org`). En ese escenario el token anti-CSRF
  es **obligatorio**, no opcional.
- La cookie **no contiene** tokens de Google, código de autorización ni datos
  del administrador: sólo el identificador opaco de la sesión.

## Variables de entorno de sesión

```dotenv
# Frontend administrativo al que se redirige tras autenticarse.
# Su origen debe estar incluido en CORS_ALLOWED_ORIGINS.
AUTH_REDIRECT_URL=http://localhost:5173/admin

SESSION_COOKIE_NAME=fenix_session
SESSION_COOKIE_PATH=/api
# SESSION_COOKIE_DOMAIN=
SESSION_COOKIE_SAMESITE=lax
# SESSION_COOKIE_SECURE=true      # false sólo en desarrollo local
SESSION_IDLE_TIMEOUT_SECONDS=1800
SESSION_ABSOLUTE_TIMEOUT_SECONDS=43200
SESSION_ROTATION_INTERVAL_SECONDS=300
```

## Endpoints

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/auth/google` | Inicia el flujo y redirige a Google. |
| `GET` | `/api/auth/google/callback` | Valida la respuesta de Google, crea la sesión, establece la cookie y redirige al frontend permitido. |
| `GET` | `/api/auth/me` | Información mínima del administrador autenticado. `401` si no hay sesión. |
| `POST` | `/api/auth/logout` | Revoca la sesión en el servidor y elimina la cookie. `204`. |
| `GET` | `/api/admin/health` | Comprobación privada: sólo para un administrador autenticado y autorizado. |

### `GET /api/auth/me`

```json
{
  "autenticado": true,
  "administrador": { "id": "…", "nombre": "…" },
  "csrfToken": "…",
  "expiraEn": "2026-10-22T12:00:00.000Z"
}
```

No expone `google_sub`, correo, tokens ni el identificador de sesión. La
respuesta lleva `Cache-Control: no-store`.

### `POST /api/auth/logout`

Invalida la sesión en el servidor y elimina la cookie con los mismos
atributos con los que se emitió. Está protegido frente a CSRF. Si no hay
sesión activa responde `401` (el frontend debe tratarlo como un cierre ya
realizado).

## Guards

`src/common/guards/sesion-admin.guard.ts` (`SesionAdminGuard`) comprueba, en
este orden:

1. que la petición incluye la cookie de sesión;
2. que la sesión existe, no está revocada y no ha caducado (ni por
   inactividad ni por tiempo máximo absoluto);
3. que la cuenta administrativa asociada **existe y sigue activa**
   (`activo = true` en PostgreSQL).

`src/common/guards/csrf.guard.ts` (`CsrfGuard`) protege las operaciones que
modifican datos: exige la cabecera `X-CSRF-Token` con el token ligado a la
sesión (comparación en tiempo constante) y comprueba que el origen de la
petición, si lo hay, está en la lista de orígenes CORS permitidos.

Distinción de respuestas:

| Situación | Respuesta |
| :--- | :--- |
| Sin cookie, sesión desconocida, alterada, caducada o revocada | `401` |
| La cuenta administrativa está desactivada o ya no existe la cuenta de la sesión | `403` (desactivada) / `401` (inexistente) |
| PostgreSQL no está disponible | `503` |

La autorización **falla de forma segura**: si la base de datos no responde,
no se concede acceso por defecto.

No existe columna `rol` en `administradores` y no se han inventado roles: la
autorización es «la cuenta existe, está activa y fue aprobada previamente».
Las dos cuentas administrativas autorizadas acceden en igualdad de
condiciones.

## CORS

La configuración existente se mantiene y refuerza:

- `CORS_ALLOWED_ORIGINS` con orígenes **explícitos** (nunca `*`).
- `credentials: true` (necesario para las cookies de sesión).
- `X-CSRF-Token` añadida a `allowedHeaders`.
- Peticiones desde orígenes no autorizados: el navegador no recibe
  `Access-Control-Allow-Origin`, y el guard CSRF rechaza las operaciones de
  escritura cuyo `Origin` no esté permitido.

La cookie de correlación del flujo OAuth (`fenix_oauth_tx`) se mantiene sin
cambios: las pruebas E2E verifican que el callback sigue funcionando con
ella.

## Pruebas

- `npm test`: pruebas unitarias de configuración, servicio de sesiones,
  cookies, guards y flujo de Google (las de la Etapa 4 se conservan).
- `npm run test:e2e`: pruebas HTTP con dobles de prueba. **Nunca** se
  conecta con Supabase.
- `npm run test:integration`: pruebas contra una instancia PostgreSQL
  **aislada** (contenedor local). Comprueban restricciones reales, índices,
  cascadas y persistencia entre reinicios del backend. Se omiten si no se
  define `TEST_DATABASE_URL`.

```bash
# Ejemplo con un PostgreSQL aislado en Docker
docker run -d --name fenix-postgres-test -e POSTGRES_PASSWORD=fenix_test \
  -e POSTGRES_USER=fenix -e POSTGRES_DB=fenix_test -p 55432:5432 postgres:16-alpine
# …aplicar sql/esquema-pruebas-aisladas.sql y la migración de sesiones…
TEST_DATABASE_URL=postgresql://fenix:fenix_test@localhost:55432/fenix_test \
  TEST_DATABASE_CA_CERT_PATH=/ruta/al/ca.crt npm run test:integration
```

## Contrato con el frontend

El contrato que necesita el frontend está en
[`../docs/contratos/contrato-autenticacion-frontend.md`](../docs/contratos/contrato-autenticacion-frontend.md).

El contrato de los endpoints institucionales públicos está en
[`../docs/contratos/contrato-contenido-publico-frontend.md`](../docs/contratos/contrato-contenido-publico-frontend.md).

Resumen: el login se inicia navegando a `GET /api/auth/google`; la sesión se
consulta con `GET /api/auth/me`; el logout es `POST /api/auth/logout`; las
peticiones deben enviarse con `credentials: 'include'`; las operaciones de
escritura deben incluir `X-CSRF-Token`; un `401` significa que hay que
volver al login; y **no** se guarda ningún token de autenticación en
`localStorage` ni en `sessionStorage`.
