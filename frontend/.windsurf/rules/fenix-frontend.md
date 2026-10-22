---
trigger: always_on
---

# Reglas del frontend · Fundación FÉNIX LPB

## Stack
- React + Vite + TypeScript, Tailwind CSS v4 (configuración en CSS con `@theme`, sin tailwind.config.js).
- react-router-dom, @tanstack/react-query, i18next/react-i18next, lucide-react, embla-carousel-react, class-variance-authority.
- No agregues dependencias nuevas sin preguntarme. No toques carpetas fuera de `frontend/`.

## Código
- Componentes de función, exportaciones con nombre, props tipadas. Alias `@/` para `src/`.
- Nombres de archivos, variables y componentes en inglés. Textos visibles SIEMPRE por i18n (`t('clave')`); nada de texto fijo en JSX.
- Clases con la utilidad `cn()` (clsx + tailwind-merge). Sin estilos inline salvo valores dinámicos.
- Los datos pasan por `services/` + hooks de React Query. Los mocks viven en `src/data/` y llevan el comentario `// SAMPLE DATA`.

## Diseño (paleta Fénix) — NO NEGOCIABLE
- Nunca escribas colores hex en componentes: usa los tokens (`bg-crema`, `text-negro`, `bg-naranja`, etc.).
- Todo el texto va en negro (`text-negro`). Excepciones: texto crema sobre fondo negro; números grandes (≥28 px) en `text-naranja`.
- Naranja y amarillo NUNCA como color de texto pequeño. El amarillo nunca es color de letra: solo fondo o decoración.
- Texto de botones SIEMPRE negro (o crema sobre negro). Nunca blanco sobre naranja.
- Un solo color fuerte por zona: si hay botón naranja, el resto va en negro/crema/blanco.
- Fondo de página: crema. Franjas tonales alternas: `bg-crema-tono`. Tarjetas internas: `bg-blanco` con borde `border-linea`.
- Radios: botones 12px (`rounded-btn`), tarjetas 16px (`rounded-card`), paneles e imágenes 32px (`rounded-panel`), píldoras `rounded-full`. Nunca píldora en botones rectangulares.
- Sombras: solo `shadow-soft` (filas/tarjetas pequeñas) o `shadow-lift` (tarjetas flotantes). No pongas sombra a todo.
- Tipografía: títulos con `font-display` (Bricolage Grotesque, peso 700–800, tracking negativo); texto con `font-body` (Atkinson Hyperlegible Next). Usa las utilidades `t-*` de la escala tipográfica.

## Responsive (mobile-first)
- Diseño base en 1440 px con contenedor máximo de 1200 px. Breakpoints de Tailwind por defecto.
- Navbar con hamburguesa por debajo de `lg`. Grillas: 1 col móvil → 2 tablet → 3/4 escritorio. Objetivos táctiles ≥ 44 px.

## Accesibilidad
- HTML semántico (`header`, `nav`, `main`, `section`, `footer`), un solo `h1`, orden de títulos correcto.
- `alt` descriptivo en imágenes; íconos decorativos con `aria-hidden`.
- Foco visible: contorno de 2px negro con offset. Tabs y carruseles con roles/atributos ARIA y teclado.
- Respeta `prefers-reduced-motion`.

## Flujo
- Entrega por etapas pequeñas. Al terminar cada tarea: corre `npm run build` y `npm run lint` y repórtame los errores.
- Si falta una imagen o dato, deja un marcador visible y avísame; no inventes datos reales.