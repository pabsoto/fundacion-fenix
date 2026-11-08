# Contrato de la API pública de campañas

Historia SF-25 (HU-P02) · Subtarea SF-77.

Base local predeterminada: `http://localhost:3000/api`. Los endpoints son
anónimos: no requieren sesión, cookie ni token CSRF.

## Visibilidad

Solo se devuelven campañas que cumplen **ambas** condiciones:

- `estado` es `publicada` o `cerrada` (las cerradas forman el historial con
  cifras oficiales). Los `borrador` **nunca** se exponen.
- Tienen `fecha`.

El filtro se aplica en la consulta SQL sobre la tabla `public.campanas`, no en
el frontend.

## Modelo público de campaña

```json
{
  "id": "1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d",
  "tituloEs": "Campaña Senkata",
  "tituloEn": "Senkata campaign",
  "descripcionEs": "Esterilización gratuita de perros y gatos.",
  "descripcionEn": null,
  "lugar": "Senkata, El Alto",
  "fecha": "2025-03-15",
  "perros": 40,
  "gatos": 24,
  "machos": 30,
  "hembras": 34,
  "total": 64,
  "fotos": ["campanas/senkata/1.webp"]
}
```

- `tituloEn` y `descripcionEn` pueden ser `null`; el frontend debe usar el
  texto en español como respaldo.
- `lugar` usa `tituloEs` como respaldo si la campaña no tiene lugar.
- `fotos` se ordena por el campo `orden` de `campana_fotos`.

### Información que nunca se expone

La respuesta se construye con una lista blanca de campos. No incluye:
`estado`, `es_historico`, `creado_por`, `actualizado_por`, `creado_en`,
`actualizado_en` ni los datos de auditoría.

## `GET /api/public/campanas`

Lista las campañas visibles ordenadas por `fecha` descendente.

| Parámetro | Tipo | Descripción |
| --- | --- | --- |
| `anio` | entero, opcional | Filtra por el año de `fecha`. |

Responde `200` con un arreglo del modelo anterior (vacío si no hay campañas).

## `GET /api/public/campanas/{id}`

Devuelve una campaña visible. Responde `404` tanto si no existe como si es un
borrador o no tiene fecha, para no revelar contenido sin publicar.

## Errores

Formato común `{ statusCode, error, message, path, timestamp }`.

| Código | Cuándo |
| --- | --- |
| `400` | `anio` no es numérico o `id` no es UUID. |
| `404` | La campaña no existe o no es visible (solo detalle). |
| `503` | PostgreSQL no está disponible. No se filtran detalles internos. |

## Evidencia

- `backend/src/modules/impacto-publico/impacto-publico.service.spec.ts`:
  filtro de estado en el SQL, columnas seleccionadas y lista blanca.
- `backend/test/campanas-publicas.e2e-spec.ts`: acceso anónimo, exclusión de
  borradores y de campañas sin fecha, ausencia de campos administrativos,
  filtro por año, `404` del detalle y errores `400`/`503`.
