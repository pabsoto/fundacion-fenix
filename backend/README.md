# Backend - Fundación FÉNIX LPB

API NestJS del sitio público y del panel administrativo de Fundación FÉNIX LPB.

El backend incluye la estructura modular, configuración de entorno, CORS con orígenes explícitos, validación global, manejo uniforme de errores y conexión a PostgreSQL mediante TypeORM. La autenticación y los controladores funcionales todavía no están implementados.

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

La ruta ejecuta una consulta de solo lectura `SELECT 1`. Si PostgreSQL no está disponible, responde HTTP 503 con `status: "error"` y `database: "down"`, sin incluir detalles internos de la conexión.

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

Los resultados se consultan en la pestaña **Actions** del repositorio o en la sección de comprobaciones del Pull Request. Si una comprobación falla, revisa el paso que produjo el error, reproduce su comando desde `backend/`, corrige el problema y vuelve a publicar la rama para ejecutar CI otra vez.

El despliegue continuo queda pendiente hasta definir el proveedor de alojamiento, los entornos y el manejo de secretos de despliegue.
