# Manual de instalación, configuración y uso

Sistema web de Fundación FÉNIX LPB: sitio público y panel administrativo. Trazabilidad: SF-87 (HU-20).

## 1. Requisitos

- Node.js 24 y npm.
- Una base PostgreSQL (Supabase) y un proyecto de Supabase Storage con dos buckets: uno público (QR de donaciones) y uno privado (fotos de entregas).
- Un cliente OAuth de Google para el acceso del panel.

## 2. Instalación

```bash
cd backend && npm ci
cd ../frontend && npm ci
```

## 3. Configuración

Copia los archivos de ejemplo y completa los valores reales solo en tu `.env` local (nunca en Git):

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

En PowerShell usa `Copy-Item`.

Variables principales del backend (detalle completo en `backend/README.md`):

| Variable | Uso |
|---|---|
| `DATABASE_URL`, `DATABASE_CA_CERT_PATH` | Conexión segura a PostgreSQL |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Acceso a Storage (solo backend) |
| `SUPABASE_STORAGE_BUCKET`, `SUPABASE_STORAGE_BUCKET_PRIVADO` | Buckets público y privado |
| `CORS_ALLOWED_ORIGINS`, `AUTH_REDIRECT_URL` | Origen del frontend |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `GOOGLE_OAUTH_STATE_SECRET` | Inicio de sesión con Google |

Variables del frontend: `VITE_API_URL` (por defecto `http://localhost:3000/api`), `VITE_GOOGLE_CLIENT_ID` y `VITE_DEMO_SHOWCASE` (debe ser `false` en producción; con `true` muestra datos de demostración).

## 4. Base de datos

Las migraciones no se aplican solas al iniciar. Desde `backend/`:

```bash
npm run build
npm run db:migrate
```

La primera cuenta administradora debe aprovisionarse y vincularse con `npm run auth:link` (ver `backend/README.md`, sección de primera vinculación). No existe registro público de administradores.

## 5. Puesta en marcha

```bash
cd backend && npm run start:dev     # API en http://localhost:3000/api
cd frontend && npm run dev          # sitio en http://localhost:5173
```

Producción: `npm run build` y `npm run start:prod` en el backend; `npm run build` en el frontend y servir `dist/`.

## 6. Uso del panel administrativo

Entrar en `/admin` e iniciar sesión con la cuenta de Google autorizada. Una cuenta no autorizada es rechazada.

- **Campañas:** crear (puede guardarse como borrador sin lugar ni fecha; para publicar son obligatorios lugar y fecha), editar, filtrar por año y mes, registrar perros, gatos, machos y hembras (perros + gatos debe igualar machos + hembras) y adjuntar fotos (imagen de hasta 5 MB; se pueden quitar y reordenar).
- **Cerrar campaña:** requiere al menos una esterilización. Al cerrarla, sus cifras cuentan en el contador público y deja de ser editable. Para corregir, se reabre la campaña o se usa la corrección de cifras, que reemplaza los valores y queda auditada.
- **Animales y adopciones:** registro interno con foto de la entrega en almacenamiento privado. No se publica un catálogo de animales.
- **Donaciones:** datos bancarios y QR.
- **Resumen:** cifras del panel.

## 7. Uso del sitio público

Muestra el historial de campañas con la más reciente seleccionada, el detalle de cada una (fecha, lugar, fotos y cifras), el contador acumulado, la información de adopciones con enlace a WhatsApp, donaciones y redes sociales. Solo se ven campañas publicadas o cerradas.

## 8. Verificación

```bash
cd backend && npm test && npm run test:e2e
cd frontend && npm test && npm run lint && npm run check:i18n
```

Resultados y matriz de pruebas: `sprint-2-evidencias.md` y `sprint-2-matriz-pruebas.md`.
