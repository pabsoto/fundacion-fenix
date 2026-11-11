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
| `perrosMachos`, `perrosHembras`, `gatosMachos`, `gatosHembras` | Opcionales. Enteros entre 0 y 100000. Los omitidos se conservan en `PUT` y valen 0 en `POST`. |

Los totales (`perros`, `gatos`, `machos`, `hembras`, `total`) no se envían: se
calculan en el servidor a partir de los cuatro contadores.

Se rechaza cualquier otro campo (por ejemplo, fotos).

`POST` responde `201` y `PUT` responde `200`, ambos con la campaña guardada.
Cada escritura se registra en `auditoria` (`tabla = 'campanas'`) dentro de la
misma transacción: si la auditoría falla, la campaña no se guarda.

`PUT` conserva las cifras omitidas, las fotos y el autor original (`creado_por`).

## Cierre y corrección de cifras

`POST /api/admin/campanas/{id}/cerrar` cierra una campaña publicada (`estado = cerrada`) y
registra el cambio en auditoría dentro de la transacción. No usa `esHistorico`,
que solo admite una fila en la base. Borradores y campañas ya cerradas responden `409`; un cierre
repetido no suma ni duplica cifras.

`POST /api/admin/campanas/{id}/cifras` permite corregir una campaña cerrada.
Requiere reemplazar los cuatro contadores base (`perrosMachos`,
`perrosHembras`, `gatosMachos`, `gatosHembras`) por sus valores corregidos;
cada uno debe ser un entero entre 0 y 100000. No acepta campañas que no estén cerradas.
La corrección se audita con valores anteriores y nuevos. Los totales se derivan
de los contadores guardados, por lo que la corrección reemplaza los valores y
no se suma como una nueva campaña.

Ambas rutas requieren sesión administrativa y `X-CSRF-Token`.

## Consulta de cifras por periodo

`GET /api/admin/campanas/cifras?anio=2026&mes=11`

| Parámetro | Regla |
| --- | --- |
| `anio` | Obligatorio. Entero entre 2000 y 2100. |
| `mes` | Opcional. Entero entre 1 y 12. Sin `mes` abarca todo el año. |
| `estado` | Opcional. `borrador`, `publicada` o `cerrada`. Sin él se incluyen todos. |

Suma las cifras de las campañas cuya `fecha` cae en el periodo; las campañas
sin fecha no se cuentan. Responde `200` con `{ periodo, totales, campanas }`; un
periodo sin campañas devuelve totales en 0 y `campanas: []`. Responde `400` si
algún parámetro no es válido.

## Fotos

| Ruta | Qué hace |
| --- | --- |
| `POST /api/admin/campanas/{id}/fotos` | Sube una foto (`archivo`, JPG, PNG o WebP, máx. 5 MB). `201`. |
| `DELETE /api/admin/campanas/{id}/fotos/{fotoId}` | Quita la foto de la galería y de Storage. `204`. |
| `PUT /api/admin/campanas/{id}/fotos/orden` | Cuerpo `{ "ids": [...] }` con todas las fotos en el orden deseado; la primera es la principal. `200` con las fotos ordenadas. |

`GET` de campañas devuelve `fotos: [{ id, url, orden }]`. `PUT .../orden` exige
exactamente las fotos de la campaña, sin repetir ni agregar otras (`400`). En una
campaña `cerrada`, quitar y reordenar responden `409`. El panel solo usa el
borrado; el reordenamiento aún no tiene pantalla.

## Cierre

| Ruta | Qué hace |
| --- | --- |
| `POST /api/admin/campanas/{id}/cerrar` | `publicada` → `cerrada`. Exige al menos una esterilización. Sus cifras pasan al contador público. `200`. |
| `POST /api/admin/campanas/{id}/reabrir` | `cerrada` → `publicada`, para corregirla. La campaña histórica no se reabre. `200`. |

Ambas llevan `X-CSRF-Token` y se auditan. `409` si el estado no corresponde, `400`
si no hay esterilizaciones registradas.

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
