# Contrato de administración de campañas

Historia SF-6 (RF-07, RNF-03) · Subtarea SF-32.

Base local predeterminada: `http://localhost:3000/api`. Todos los endpoints
requieren la cookie de sesión administrativa vigente. `POST` y `PUT` requieren
además la cabecera `X-CSRF-Token` obtenida mediante `GET /api/auth/me`.

## Modelo de campaña

```json
{
  "id": "0f8b6c2e-6a43-4b8e-9f1a-2a7a8d1c4e55",
  "tituloEs": "Campaña de esterilización Villa Adela",
  "tituloEn": "Villa Adela sterilization campaign",
  "descripcionEs": "Esterilización gratuita de perros y gatos.",
  "descripcionEn": null,
  "lugar": "Villa Adela, El Alto",
  "fecha": "2026-11-21",
  "estado": "publicada",
  "esHistorico": false,
  "creadoEn": "2026-11-07T21:00:00.000Z",
  "actualizadoEn": "2026-11-07T21:00:00.000Z"
}
```

- `estado`: `borrador` (no visible en el sitio), `publicada` (visible) o
  `cerrada` (con cifras; se gestiona en HU-12 y no se edita desde este
  formulario).
- La respuesta no incluye responsables (`creado_por`, `actualizado_por`),
  cifras (HU-12) ni fotos (HU-11).

## `GET /api/admin/campanas`

Lista todas las campañas, incluidos los borradores, ordenadas por `fecha`
descendente (las campañas sin fecha al final). Responde `200` con un arreglo
del modelo anterior.

## `GET /api/admin/campanas/{id}`

Devuelve una campaña para cargar el formulario de edición. `404` si no existe y
`400` si `id` no es un UUID.

## `POST /api/admin/campanas` y `PUT /api/admin/campanas/{id}`

El cuerpo es el mismo en ambos casos y representa **todos** los campos
editables. Los opcionales que se omiten o se envían vacíos se guardan como
`null`.

```json
{
  "tituloEs": "Campaña de esterilización Villa Adela",
  "tituloEn": "Villa Adela sterilization campaign",
  "descripcionEs": "Esterilización gratuita de perros y gatos.",
  "descripcionEn": null,
  "lugar": "Villa Adela, El Alto",
  "fecha": "2026-11-21",
  "estado": "publicada"
}
```

| Campo | Regla |
| --- | --- |
| `tituloEs` | Obligatorio, máximo 200 caracteres, se recortan espacios. |
| `tituloEn` | Opcional, máximo 200. |
| `descripcionEs`, `descripcionEn` | Opcionales, máximo 5000. |
| `lugar` | Máximo 200. **Obligatorio si `estado` es `publicada`.** |
| `fecha` | `AAAA-MM-DD` válida. **Obligatoria si `estado` es `publicada`.** |
| `estado` | `borrador` o `publicada`. |

Se rechaza cualquier otro campo (por ejemplo, cifras o fotos).

`POST` responde `201` y `PUT` responde `200`, ambos con la campaña guardada.
Cada escritura se registra en `auditoria` (`tabla = 'campanas'`) dentro de la
misma transacción: si la auditoría falla, la campaña no se guarda.

`PUT` conserva cifras, fotos y el autor original (`creado_por`).

## Errores

Todas las respuestas de error usan el formato común
`{ statusCode, error, message, path, timestamp }`.

| Código | Cuándo |
| --- | --- |
| `400` | El cuerpo no cumple las reglas, contiene campos no permitidos o el `id` no es UUID. `message` puede ser un arreglo con un mensaje por regla incumplida. |
| `401` | No hay sesión válida. |
| `403` | Cuenta desactivada o token CSRF ausente o inválido. |
| `404` | La campaña no existe. |
| `409` | La campaña está `cerrada`. |
| `503` | PostgreSQL o la auditoría no están disponibles. |

## Visibilidad pública

`GET /api/public/campanas` muestra solo las campañas `publicada` o `cerrada`
con fecha. Los borradores nunca se exponen. Detalle en
[contrato-campanas-publicas.md](contrato-campanas-publicas.md).
