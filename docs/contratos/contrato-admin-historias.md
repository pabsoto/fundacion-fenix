# Contrato de administración de historias destacadas

Historia SF-95 (RF-15) · Subtarea SF-113.

Base local predeterminada: `http://localhost:3000/api`. Todos los endpoints
requieren la cookie de sesión administrativa vigente. `POST`, `PUT` y `DELETE`
requieren además la cabecera `X-CSRF-Token` obtenida mediante
`GET /api/auth/me`.

## Modelo de historia

```json
{
  "id": "0f8b6c2e-6a43-4b8e-9f1a-2a7a8d1c4e55",
  "animalNombre": "Luna",
  "tituloEs": "Luna encontró un hogar",
  "tituloEn": "Luna found a home",
  "textoEs": "Texto de la historia.",
  "textoEn": "Story text.",
  "autorNombre": "Familia Quispe",
  "fechaHistoria": "2026-10-01",
  "orden": 1,
  "visible": true,
  "foto": {
    "url": "https://.../historias/0f8b6c2e-.../5c1d....jpg",
    "ancho": 900,
    "alto": 1600
  },
  "creadoEn": "2026-11-26T15:00:00.000Z",
  "actualizadoEn": "2026-11-26T15:00:00.000Z"
}
```

- `foto` es `null` mientras la historia no tenga fotografía.
- `ancho` y `alto` son las medidas con las que se ve la foto (ya aplican la
  orientación EXIF): sirven para distinguir fotos verticales y horizontales.
- La respuesta no incluye responsables, la ruta interna de la foto ni datos de
  borrado.

## `GET /api/admin/historias`

Responde `200` con un arreglo de todas las historias no eliminadas, visibles u
ocultas, ordenadas por `orden`. No se pagina.

## `POST /api/admin/historias`

Crea una historia **oculta, sin foto y al final del orden**. Responde `201` con
el modelo.

```json
{
  "animalNombre": "Luna",
  "tituloEs": "Luna encontró un hogar",
  "tituloEn": "Luna found a home",
  "textoEs": "Texto de la historia.",
  "textoEn": "Story text.",
  "autorNombre": "Familia Quispe",
  "fechaHistoria": "2026-10-01"
}
```

| Campo           | Regla                                  |
| --------------- | -------------------------------------- |
| `animalNombre`  | Obligatorio, máximo 100 caracteres     |
| `tituloEs/En`   | Obligatorios, máximo 200 caracteres    |
| `textoEs/En`    | Obligatorios, máximo 4000 caracteres   |
| `autorNombre`   | Opcional, máximo 100; vacío es `null`  |
| `fechaHistoria` | Obligatoria, `AAAA-MM-DD`              |

Los textos se recortan. Enviar `visible`, `orden` u otro campo responde `400`.

## `PUT /api/admin/historias/{id}`

Edita, publica u oculta. El cuerpo lleva **todos** los campos anteriores más
`visible` (obligatorio). Un `autorNombre` omitido se guarda como `null`. La foto
y el orden se conservan. Responde `200` con el modelo.

`409` si se envía `visible: true` y la historia no tiene foto.

Flujo para publicar una historia nueva: `POST` → subir foto → `PUT` con
`visible: true`.

## `PUT /api/admin/historias/orden`

```json
{ "ids": ["<id de la primera>", "<id de la segunda>"] }
```

`ids` debe incluir exactamente todas las historias no eliminadas, sin repetir.
Responde `200` con las historias en el nuevo orden, o `400` si la lista no
coincide (en ese caso conviene recargar el listado).

## `POST /api/admin/historias/{id}/foto`

`multipart/form-data` con el campo `archivo`: JPG, PNG o WebP de hasta 5 MB.
Si la historia ya tenía foto, se reemplaza. Responde `201` con el modelo
actualizado.

La foto se guarda en el bucket público: una historia oculta no aparece en el
sitio, pero su foto es accesible para quien tenga la URL exacta.

## `DELETE /api/admin/historias/{id}`

Borrado lógico: la historia deja de listarse y su foto se borra de Storage. No
se puede deshacer desde el panel. Responde `204`.

## Errores

| Código | Caso                                                          |
| ------ | ------------------------------------------------------------- |
| `400`  | Cuerpo, identificador o lista de orden no válidos             |
| `401`  | Sin sesión válida                                             |
| `403`  | Cuenta desactivada, token CSRF u origen no válidos            |
| `404`  | La historia no existe o está eliminada                        |
| `409`  | Publicar sin foto                                             |
| `413`  | La foto supera 5 MB                                           |
| `415`  | El archivo no es un JPG, PNG o WebP válido                    |
| `503`  | PostgreSQL o Storage no están disponibles                     |

## Auditoría

Cada escritura queda en `auditoria` con el administrador, mediante el
disparador de la tabla `historias`. El borrado lógico se registra como `UPDATE`
con `eliminado_en` entre los campos modificados.
