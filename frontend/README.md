# Fundación Fénix LPB - Frontend

Frontend de la web de la Fundación Fénix LPB, ONG de esterilización de perros y gatos en La Paz, Bolivia.

## Stack

- React + Vite + TypeScript
- Tailwind CSS v4
- React Router DOM
- TanStack Query
- i18next
- Lucide React

## Instalación

```bash
npm install
```

## Variables de entorno

Copia `.env.example` a `.env` y configura las variables necesarias:

```bash
cp .env.example .env
```

`VITE_DEMO_SHOWCASE=true` activa únicamente las campañas, estadísticas e
historias de demostración guardadas en `src/data`. También permite visualizar
un QR marcado como DEMO cuando la API devuelve una URL vigente, sin habilitar
la copia de los datos bancarios. El valor de ejemplo es `false`, por lo que los
builds públicos usan las APIs reales y las historias quedan vacías mientras no
exista un endpoint oficial.

## Desarrollo

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Lint

```bash
npm run lint
```

## Pruebas

```bash
npm test
```

## Botón flotante de WhatsApp

El layout público consulta `GET /api/public/contactos` y muestra el botón
solamente cuando la respuesta contiene un canal `whatsapp` activo con una URL
HTTPS válida de WhatsApp. Durante la carga, ante errores, con una respuesta
vacía o con una URL inválida, el botón permanece oculto. Las rutas `/admin` y
`/admin/login` no usan el layout público y, por lo tanto, no lo renderizan.

El contacto oficial se administra en `public.canales_contacto`; no se configura
un número alternativo en React ni mediante variables de entorno del frontend.
