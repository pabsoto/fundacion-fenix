# Inventario de contenido institucional editable

## Alcance y fuentes revisadas

Se compararon los textos en `frontend/src/i18n/locales/es.json` y `en.json`
con `backend/seeds/contenido-institucional.json` y el mapeo de respaldo de
`frontend/src/hooks/useInstitutionalContent.ts`.

El seed contiene 32 claves únicas, todas con campos español e inglés. La
landing consulta el endpoint público institucional; los valores del backend
prevalecen y las traducciones locales sirven como respaldo mientras no hay
contenido disponible. El seed inserta claves nuevas y deja intactos los
registros existentes para no revertir cambios hechos desde el CMS.

No se consultó la base de datos configurada en el entorno. El manifiesto
histórico `docs/integracion-final/contenido-institucional-manifest.json`
registra que esas claves no existían al momento de aquella siembra inicial,
pero no permite determinar el estado actual de la base.

## Claves ya preparadas para edición

| Bloque de la landing | Claves |
| --- | --- |
| Hero | `hero_principal`, `hero_contexto` |
| Estadísticas institucionales | `estadistica_total_etiqueta`, `estadistica_gratuidad`, `estadistica_fundacion`, `estadistica_pilares` |
| Quiénes somos | `quienes_somos_encabezado`, `quienes_somos_fundadora`, `quienes_somos_intro`, `quienes_somos_fenix` |
| Pilares | `pilares_intro`, `pilar_rehabilitacion`, `pilar_educacion`, `pilar_esterilizacion`, `pilares_futuro` |
| Programa | `programa_encabezado`, `programa_intro`, `programa_alcance`, `programa_igualdad`, `programa_gratuidad`, `programa_comunidades` |
| Financiamiento | `financiamiento_intro`, `financiamiento_impacto`, `financiamiento_llamado` |
| Resultados | `resultados_intro` |
| Cómo colaborar | `colaborar_intro`, `colaborar_donar`, `colaborar_apadrinar`, `colaborar_adoptar` |
| Donaciones | `donaciones_intro`, `donaciones_agradecimiento` |
| Pie de página | `contacto_footer` |

Las claves conservan sus textos bilingües originales en el seed y sus valores
locales de respaldo. No se agregó una segunda copia de esos textos ni se
reescribieron registros existentes.

## Contenido faltante y textos estáticos

- **Misión y visión:** no hay claves ni textos institucionales fuente en los
  locales o en el seed. No se migraron porque no se debe inventar contenido;
  se requiere el texto aprobado por la fundación antes de incorporarlo.
- Los textos de interfaz (navegación, botones, etiquetas, accesibilidad y
  mensajes) continúan en los archivos de localización. No son bloques de
  contenido institucional de la landing.
- No se identificó un bloque adicional de contenido institucional existente
  que requiera una clave nueva en `contenido_institucional`.

## Estado de administración y verificación

El backend dispone de lectura pública y rutas administrativas para editar
contenido institucional y canales de contacto. Las rutas administrativas usan
sesión, CSRF en escrituras y auditoría según la implementación existente.
Existe una pantalla administrativa para canales; no se encontró una pantalla
frontend para editar los bloques institucionales.

Las pruebas e2e existentes de historias, contenido público y canales pasaron
(84 pruebas). Usan dobles para PostgreSQL y Storage; no verifican el estado
actual de una base real, que no se consultó.
