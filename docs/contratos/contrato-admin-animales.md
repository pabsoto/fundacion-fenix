# Contrato del panel de animales

Las funciones de `frontend/src/services/admin/animales.service.ts` hablan con
mocks. El interior se cambia por el API sin tocar la UI. La sesión es la cookie
httpOnly y `POST` lleva `X-CSRF-Token`.

El modelo del front no es el JSON del API: `adoptadoPor` se deduce, las fotos
no viajan en el JSON y `fechaAdopcion` no tiene campo en el formulario.

## Modelo en el front

```json
{
  "id": "a1000000-0000-4000-8000-000000000001",
  "nombre": "Max",
  "especie": "perro",
  "sexo": "macho",
  "edad": { "valor": 3, "unidad": "años" },
  "fechaIngreso": "2025-03-12",
  "fotoIngreso": null,
  "adoptadoPor": "Carla Mamani",
  "direccionAdoptante": "Calle 5, Villa Adela, El Alto",
  "fotoAdopcion": null,
  "fechaAdopcion": "2026-01-15"
}
```

`especie` es `perro` o `gato`. `sexo` es `macho`, `hembra` o `null`. `edad` es
`null` o `{ valor, unidad }` con `unidad` `años` o `meses`. Adoptado significa
que `adoptadoPor` tiene texto.

## `listAnimales(filtro?)`

`GET /api/admin/animales`. `filtro` opcional: `todos` (sin query), `adoptados`
(`?adoptado=true`) o `en-la-fundacion` (`?adoptado=false`). La pantalla filtra
en el cliente y pide la lista completa.

Responde `200` con el arreglo del modelo. `400` si `adoptado` no es booleano.
`401` sin sesión. `403` cuenta desactivada. `503` si PostgreSQL no responde.

## `getAnimal(id)`

`GET /api/admin/animales/{id}`. Responde `200` con un animal. `400` si `id` no
es UUID. `404` si no existe. `401`, `403` y `503` como en el listado.

## `guardarAnimal(formulario, id?)`

Sin `id` crea (`POST /api/admin/animales`, `201`). Con `id` actualiza. El API
aún no tiene actualización: `updateAnimal` es mock y queda marcado
`TODO(backend)`.

Cuerpo que debe enviar el servicio, no el componente:

```json
{
  "nombre": "Luna",
  "especie": "perro",
  "sexo": "hembra",
  "edad": 2,
  "edadUnidad": "anios",
  "fechaIngreso": "2026-11-10",
  "adoptado": true,
  "nombreAdoptante": "Jorge Quispe",
  "direccionAdoptante": "Calle 5, Villa Adela",
  "fechaAdopcion": "2026-11-10"
}
```

| Campo | Regla |
| --- | --- |
| `nombre` | Obligatorio, máximo 100, sin espacios sobrantes. |
| `especie` | `perro` o `gato`. |
| `sexo` | Opcional. `macho` o `hembra`. |
| `edad` | Opcional. Entero de 0 a 40. En el front vive como `edad.valor`. |
| `edadUnidad` | `anios` o `meses` si hay edad. En el front, `años` se traduce a `anios`. |
| `fechaIngreso` | Opcional. `AAAA-MM-DD`. |
| `adoptado` | Booleano. En el front es `adoptadoPor` con texto. |
| `nombreAdoptante` | Obligatorio si `adoptado` es true. Máximo 150. |
| `direccionAdoptante` | El formulario la marca opcional. El API real la exige si está adoptado y rechaza el guardado si falta. No se inventa un valor. |
| `fechaAdopcion` | Sin campo en la UI. Si se registra una adopción nueva, se envía la fecha de hoy. Si ya tenía una, el mock la conserva. No puede ser futura ni anterior a `fechaIngreso`. |
| Fotos | No se envían en este JSON. |

Si `adoptado` es false no se envían datos de adopción. Errores: `400` cuerpo
inválido, `401`, `403` CSRF o cuenta desactivada, `404` al editar un id que no
existe, `503` si no se puede guardar.

## `deleteAnimal(id)`

El API aún no borra animales. El mock quita el registro. `TODO(backend)`.
Errores previstos: `401`, `403`, `404`, `503`.

## `subirFotoAnimal(id, tipo, archivo)`

`POST /api/admin/animales/{id}/fotos/{tipo}` con `multipart/form-data` y el
campo `archivo`. `tipo` es `animal` (ingreso) o `entrega` (adopción). JPG, PNG
o WebP, máximo 5 MB. Se llama después de guardar. La de adopción solo si el
animal ya está adoptado.

Responde `201` con `{ animalId, url, expiraEnSegundos }`. La `url` es temporal.
Errores: `400`, `401`, `403`, `404`, `409` si la foto de entrega no corresponde
a un adoptado, `413` si pesa más de 5 MB, `415` si el tipo no es imagen
admitida, `503`.

Si el animal se guardó y la foto falla, la UI avisa y permite reintentar la
subida sin crear otro registro.

## `quitarFotoAnimal(id, tipo)`

El API aún no quita fotos. El mock deja el campo en `null`. `TODO(backend)`.
Errores previstos: `401`, `403`, `404`, `503`.
