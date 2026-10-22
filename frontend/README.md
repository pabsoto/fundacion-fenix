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

## Botón flotante de WhatsApp

El botón usa `VITE_WHATSAPP_PHONE` y `VITE_WHATSAPP_MESSAGE`, configurados en
[`.env.example`](./.env.example). Copia ese archivo a `.env` y actualiza esos
valores para cambiar el número o el mensaje. El número oficial debe incluir el
código de país y solo dígitos (`59170544491`); el mensaje se codifica al
construir el enlace `wa.me`. El enlace abre WhatsApp directamente: no guarda
mensajes ni usa endpoints, registro, cookies o tracking. El componente se
monta una vez en el layout público, no se muestra en rutas administrativas y se
renderiza en `document.body` para mantener su posición fija durante el scroll.

### Checklist de validación manual

- [ ] Comprobar la posición y el tamaño en móvil (360 px), tablet y desktop.
- [ ] Confirmar que el botón no tapa controles importantes ni contenido del
  footer en cada tamaño.
- [ ] Navegar con Tab y verificar el foco visible y el nombre accesible.
- [ ] Abrir el enlace y confirmar que WhatsApp presenta el número oficial y el
  mensaje predefinido.
