# Contrato de la API pública de contenido

Base local predeterminada: `http://localhost:3000/api`. Los tres endpoints son
`GET`, no requieren autenticación y no aceptan parámetros de consulta. El
frontend debe conservar sus mocks hasta conectarlos en una etapa posterior.

## `GET /api/public/institucional`

Devuelve el contenido visible ordenado por `orden`, o `[]` si no existe.

```json
[
  {
    "clave": "mision",
    "titulo": { "es": "Nuestra misión", "en": "Our mission" },
    "descripcion": {
      "es": "Texto institucional en español",
      "en": "Institutional copy in English"
    },
    "imagenUrl": "https://sitio-publico-autorizado.example/mision.jpg",
    "orden": 10
  }
]
```

`titulo.es`, `titulo.en`, `descripcion.es`, `descripcion.en` e `imagenUrl`
pueden ser `null`.

## `GET /api/public/donaciones`

Devuelve la única configuración activa dentro de `donacion`. La ausencia de
datos es válida y responde `200` con `{ "donacion": null }`.

```json
{
  "donacion": {
    "titular": "Fundación FÉNIX LPB",
    "banco": "Banco de ejemplo",
    "telefono": "+591 70000000",
    "referencia": "Donación Fundación FÉNIX",
    "numeroCuenta": "000-0000000",
    "aviso": {
      "es": "Verifique siempre el titular antes de donar.",
      "en": "Always verify the account holder before donating."
    },
    "qrUrl": null
  }
}
```

`numeroCuenta`, `aviso.es` y `aviso.en` pueden ser `null`. `qrUrl` queda
reservado para una URL pública autorizada por la futura integración con
Supabase Storage; por ahora siempre es `null`. El backend no expone `qr_ruta`,
no inventa una URL y no procesa pagos. Si hay más de una configuración activa,
responde `503` y no elige una arbitrariamente.

## `GET /api/public/contactos`

Devuelve los canales activos ordenados por `orden`, o `[]` si no existen.

```json
[
  {
    "tipo": "whatsapp",
    "url": "https://wa.me/59170000000",
    "texto": { "es": "Escríbenos", "en": "Message us" },
    "orden": 10
  }
]
```

`texto.es` y `texto.en` pueden ser `null`. Los tipos actuales son `whatsapp`,
`facebook`, `instagram`, `tiktok` y `email`.

## Errores y consumo

Los fallos de PostgreSQL responden `503` con el formato global y sin detalles
internos:

```json
{
  "statusCode": 503,
  "error": "Service Unavailable",
  "message": "El contenido institucional no está disponible temporalmente",
  "timestamp": "2026-10-22T12:00:00.000Z",
  "path": "/api/public/institucional"
}
```

Para conectarlo, Pablo necesita configurar `VITE_API_URL` con la base que
termina en `/api` y llamar mediante `fetchApi` a `/public/institucional`,
`/public/donaciones` y `/public/contactos`. No debe consultar Supabase
directamente. Estos `GET` no requieren `credentials: 'include'`.
