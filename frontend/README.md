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

Configura `VITE_WHATSAPP_PHONE` en `.env` con el número de contacto oficial,
incluyendo el código de país (por ejemplo, Bolivia: `591`), y
`VITE_WHATSAPP_MESSAGE` con el texto inicial. El número se normaliza a dígitos y
el mensaje se codifica para el enlace `wa.me`. Los valores de
[`.env.example`](./.env.example) son solo placeholders; cámbialos antes de
publicar. El componente se muestra en el layout público y no se monta en las
rutas administrativas.

### Checklist de validación manual

- [ ] Comprobar la posición y el tamaño en móvil (360 px), tablet y desktop.
- [ ] Confirmar que el botón no tapa controles importantes ni contenido del
  footer en cada tamaño.
- [ ] Navegar con Tab y verificar el foco visible y el nombre accesible.
- [ ] Abrir el enlace y confirmar que WhatsApp presenta el número oficial y el
  mensaje predefinido.
