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
    "qr": {
      "disponible": true,
      "venceEl": "2027-12-31"
    }
  }
}
```

Cuando todavía no existe una configuración activa responde `200` con:

```json
{ "donacion": null }
```

## `PUT /api/admin/donaciones`

La petición representa todos los campos editables. Los tres campos opcionales
admiten texto o `null`; si se omiten se guardan como `null`.

```json
{
  "titular": "Fundación FÉNIX LPB",
  "banco": "Banco oficial",
  "telefono": "+591 70000000",
  "referencia": "Donación institucional",
  "numeroCuenta": "123-456",
  "avisoEs": "Verifique el titular",
  "avisoEn": "Verify the account holder"
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
    "qr": {
      "disponible": false,
      "venceEl": null
    }
  }
}
```

`accion` vale `INSERT` para la primera configuración activa y `UPDATE` para
las siguientes ediciones. El servidor determina el administrador responsable,
el identificador, el estado activo y las marcas de tiempo. Cualquier campo
adicional —incluidos `creadoPorId`, `actualizadoPorId`, `qrRuta` y
`qrVenceEl`— es rechazado con `400`.

La donación y su entrada de auditoría se guardan dentro de la misma transacción
`SERIALIZABLE`. Si falla la auditoría, toda la operación se revierte. Los
campos QR existentes se conservan sin cambios.

## `POST /api/admin/donaciones/qr`

Requiere sesión, `X-CSRF-Token` y `multipart/form-data`:

- `archivo`: PNG, JPG/JPEG o WebP válido, máximo 2 MB.
- `qrVenceEl`: fecha opcional `YYYY-MM-DD`, vigente durante todo ese día.

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

Un QR vencido devuelve `qrUrl: null`, pero su objeto puede conservar una URL
directa accesible mientras permanezca en el bucket público. El vencimiento no
elimina automáticamente el archivo: su depuración es un requisito operativo.

## Respuestas de seguridad y error

- `400`: DTO inválido o campos no permitidos.
- `401`: no existe una sesión administrativa válida.
- `403`: administrador inactivo, CSRF ausente/inválido u origen rechazado.
- `409`: configuración activa inconsistente o conflicto del índice único.
- `503`: PostgreSQL no está disponible o la escritura atómica no pudo
  completarse.
- `413`: la imagen supera 2 MB.
