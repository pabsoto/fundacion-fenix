# HU-19 — Verificación de usabilidad y accesibilidad pública
Trazabilidad: RNF-02, RNF-03 (copiar el texto textual del SRS aquí).
Fecha: 2026-10-22 · Rama: feature/HU-19-usabilidad-accesibilidad

| # | Ítem | RNF | Estado | Evidencia |
|---|------|-----|--------|-----------|
| 1 | Contenido público sin registro ni login | RNF-02 | Cumple | Rutas públicas no piden sesión; prueba manual |
| 2 | Contacto alcanzable en máx. 2 acciones | RNF-02 | Parcial | Falta contacto directo (H18) |
| 3 | Un solo h1 por página | RNF-02 | Cumple | Hero.tsx |
| 4 | Landmarks header/nav/main/footer + aria-label | RNF-02 | Corregido | Navbar.tsx, PublicLayout.tsx |
| 5 | Enlace "Saltar al contenido" | RNF-02 | Corregido | Navbar.tsx |
| 6 | `lang` del html sigue al idioma | RNF-02 | Corregido | syncHtmlLang.ts + prueba |
| 7 | Menú móvil: foco atrapado, Escape, devuelve foco | RNF-02 | Corregido | MobileMenu.tsx + pruebas |
| 8 | Selector de idioma accesible (aria-pressed) | RNF-02 | Corregido | LanguageToggle.tsx + prueba |
| 9 | Objetivos táctiles ≥ 44×44 px | RNF-03 | Corregido | LanguageToggle, Navbar |
| 10 | Contraste AA (ver tabla) | RNF-03 | Cumple con reservas | Tabla abajo |
| 11 | Foco visible sobre fondos oscuros | RNF-02 | Corregido | index.css |
| 12 | prefers-reduced-motion (animaciones y scroll) | RNF-02 | Corregido | index.css |
| 13 | Responsive 360/768/1024/1440 sin scroll horizontal | RNF-03 | Pendiente | Verificar en navegador |
| 14 | Imágenes con alt y dimensiones | RNF-02 | Corregido (alt ya existía) | Photo.tsx, Hero.tsx |
| 15 | Formularios (labels, errores) | RNF-02 | No aplica aún | Login admin es TODO (H17) |
| 16 | Sin textos sin traducir ES/EN | RNF-02 | Pendiente | Revisar es.json / en.json |
| 17 | Prueba de tareas con usuarios | RNF-02 | Pendiente | Ver HU-19-prueba-tareas.md |

## Contrastes (WCAG 2.1 AA)
| Combinación | Ratio | Umbral | Resultado |
|---|---|---|---|
| Negro / crema | 16,4:1 | 4,5 | Pasa |
| Negro / naranja #ff5402 | 5,3:1 | 4,5 | Pasa |
| Negro / naranja-hover #ff9700 | 7,9:1 | 4,5 | Pasa |
| Negro / amarillo #ffc200 | 7,2:1 | 4,5 | Pasa |
| Naranja / crema | 3,1:1 | 3 (solo texto grande) | Pasa solo texto grande |
| Blanco / naranja | 3,2:1 | 3 (solo gráficos) | No usar con texto pequeño |
| Texto placeholder foto (corregido) | ~7:1 | 4,5 | Pasa |