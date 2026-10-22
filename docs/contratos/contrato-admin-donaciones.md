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
    "activo": true
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
    "activo": true
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

## Respuestas de seguridad y error

- `400`: DTO inválido o campos no permitidos.
- `401`: no existe una sesión administrativa válida.
- `403`: administrador inactivo, CSRF ausente/inválido u origen rechazado.
- `409`: configuración activa inconsistente o conflicto del índice único.
- `503`: PostgreSQL no está disponible o la escritura atómica no pudo
  completarse.
