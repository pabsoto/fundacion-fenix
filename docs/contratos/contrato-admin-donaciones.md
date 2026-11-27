# Contrato de administración de donaciones

Base local predeterminada: `http://localhost:3000/api`. Ambos endpoints
requieren la cookie de sesión administrativa vigente. `PUT` requiere además
la cabecera `X-CSRF-Token` obtenida mediante `GET /api/auth/me`.

## `GET /api/admin/donaciones`

Devuelve la configuración activa sin identificadores de administradores:

```json
{
  "donacion": {
    "titular": "Fundación FÉNIX LPB",
    "banco": "Banco oficial",
    "telefono": "+591 70000000",
    "referencia": "Donación institucional",
    "numeroCuenta": "123-456",
    "avisoEs": "Verifique el titular",
    "avisoEn": "Verify the account holder",
    "activo": true,
    "qrUrl": "https://sitio-publico-autorizado.example/qr/archivo.png",
    "actualizadoEn": "2026-11-26T15:04:00.000Z",
    "qr": {
      "disponible": true,
      "venceEl": "2027-12-31"
    }
  }
}
```

`qrUrl` es la URL pública del archivo guardado, armada con la misma función
que usa el endpoint público, o `null` si no hay archivo. A diferencia del
público, aquí llega aunque el QR esté vencido, para poder previsualizarlo.
`actualizadoEn` es la marca de tiempo en ISO 8601. La respuesta no incluye
`qr_ruta`, `creado_por` ni `actualizado_por`.

Cuando todavía no existe una configuración activa responde `200` con:

```json
{ "donacion": null }
```

## `PUT /api/admin/donaciones`

La petición representa los campos bancarios editables. `numeroCuenta`,
`avisoEs` y `avisoEn` admiten texto o `null`; si se omiten se guardan como
`null`. Además se aceptan, ambos opcionales:

- `activo`: boolean. Si se omite, la configuración queda activa (`true`),
  igual que antes. `true` la mantiene publicada. `false` la desactiva en la
  misma escritura, sin borrar la fila ni el QR y sin exigir una imagen nueva.
- `qrVenceEl`: fecha real `AAAA-MM-DD` o `null`. Si se omite, se conserva la
  fecha ya guardada. `null` la quita. Una fecha que no existe (por ejemplo
  `2026-02-31`) responde `400`. No sustituye ni exige el archivo del QR.

`DELETE /api/admin/donaciones` sigue desactivando la configuración activa sin
body: pone `activo` en `false`, audita y responde `{ "desactivada": true }`,
o `{ "desactivada": false }` si ya no había una activa. No borra la fila.
Ese `DELETE` y `activo: false` en el `PUT` llegan al mismo estado (ninguna
fila activa). El `DELETE` no pide los datos bancarios; el `PUT` sí, y puede
cambiarlos en la misma operación. Ninguno reactiva una fila ya inactiva: un
`PUT` posterior, al no encontrar una activa, inserta una configuración nueva.

```json
{
  "titular": "Fundación FÉNIX LPB",
  "banco": "Banco oficial",
  "telefono": "+591 70000000",
  "referencia": "Donación institucional",
  "numeroCuenta": "123-456",
  "avisoEs": "Verifique el titular",
  "avisoEn": "Verify the account holder",
  "activo": true,
  "qrVenceEl": "2027-12-31"
}
```

Respuesta de creación o actualización:

```json
{
  "accion": "INSERT",
  "donacion": {
    "titular": "Fundación FÉNIX LPB",
    "banco": "Banco oficial",
    "telefono": "+591 70000000",
    "referencia": "Donación institucional",
    "numeroCuenta": "123-456",
    "avisoEs": "Verifique el titular",
    "avisoEn": "Verify the account holder",
    "activo": true,
    "qrUrl": null,
    "actualizadoEn": "2026-11-26T15:04:00.000Z",
    "qr": {
      "disponible": false,
      "venceEl": null
    }
  }
}
```

`accion` vale `INSERT` para la primera configuración activa y `UPDATE` para
las siguientes ediciones de la fila activa. El servidor determina el
administrador responsable, el identificador y las marcas de tiempo. `activo`
solo cambia si el cliente lo envía; si no, queda en `true`. Cualquier otro
campo —incluidos `creadoPorId`, `actualizadoPorId` y `qrRuta`— es rechazado
con `400`.

La donación y su entrada de auditoría se guardan dentro de la misma transacción
`SERIALIZABLE`. Si falla la auditoría, toda la operación se revierte. La ruta
del QR se conserva; `qrVenceEl` solo cambia si el cliente lo envía.

## `POST /api/admin/donaciones/qr`

Requiere sesión, `X-CSRF-Token` y `multipart/form-data`:

- `archivo`: PNG, JPG/JPEG o WebP válido, máximo 2 MB.
- `qrVenceEl`: fecha opcional `YYYY-MM-DD`, vigente durante todo ese día en `America/La_Paz`.

```json
{
  "qr": {
    "disponible": true,
    "venceEl": "2027-12-31"
  }
}
```

El nombre y la ruta del objeto son generados por el backend. La ruta interna
no se expone ni puede enviarse desde el cliente. Si todavía no existe una
configuración bancaria activa, responde `404`.

## `DELETE /api/admin/donaciones/qr`

Retira el QR sin alterar los datos bancarios. Requiere sesión y
`X-CSRF-Token`.

```json
{
  "qr": {
    "disponible": false,
    "venceEl": null
  }
}
```

La actualización de PostgreSQL y la auditoría son atómicas. La limpieza del
objeto de Storage se realiza después y un fallo queda registrado como limpieza
pendiente sin revertir la referencia ya confirmada.

En `GET /api/public/donaciones`, un QR vencido devuelve `qrUrl: null`. El
vencimiento se compara con el día actual de `America/La_Paz`: el QR vale
durante todo el día de `qrVenceEl` y vence al día siguiente. En el GET de
admin, `qrUrl` sigue presente para previsualizarlo. El objeto puede conservar
una URL directa mientras permanezca en el bucket público. El vencimiento no
elimina el archivo: su depuración es un requisito operativo.

## Respuestas de seguridad y error

- `400`: DTO inválido o campos no permitidos.
- `401`: no existe una sesión administrativa válida.
- `403`: administrador inactivo, CSRF ausente/inválido u origen rechazado.
- `409`: configuración activa inconsistente o conflicto del índice único.
- `503`: PostgreSQL no está disponible o la escritura atómica no pudo
  completarse.
- `413`: la imagen supera 2 MB.
