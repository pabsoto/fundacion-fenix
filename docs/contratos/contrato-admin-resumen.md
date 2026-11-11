# Contrato del resumen del panel

`GET /api/admin/resumen`. El servidor calcula las cifras en PostgreSQL. Solo en
modo demo (`VITE_DEMO_SHOWCASE=true`) `getResumen()` las arma en el navegador con
las listas de ejemplo.

## Petición

Sin cuerpo. La sesión es la cookie httpOnly. No lleva `X-CSRF-Token` porque solo
lee.

## Respuesta

```json
{
  "esterilizaciones": { "total": 310, "jornadas": 4 },
  "enLaFundacion": { "cantidad": 4, "registrados": 8 },
  "adopcionesDelAnio": { "cantidad": 4, "anio": 2026 },
  "diasHastaAdoptar": 196,
  "serie": [{ "anio": 2025, "mes": 12, "ingresos": 1, "adopciones": 0 }],
  "espera": [{ "id": "…", "nombre": "Pelusa", "especie": "gato", "dias": 215 }]
}
```

| Campo | Regla |
| --- | --- |
| `esterilizaciones.total` | Suma de los cuatro contadores de todas las campañas. |
| `esterilizaciones.jornadas` | Cantidad de campañas. |
| `enLaFundacion.cantidad` | Animales sin `adoptadoPor`. |
| `enLaFundacion.registrados` | Animales en la lista. |
| `adopcionesDelAnio` | Animales cuya `fechaAdopcion` cae en el año en curso. |
| `diasHastaAdoptar` | Promedio redondeado de `fechaAdopcion − fechaIngreso`. `null` si no hay pares: la UI muestra "—". |
| `serie` | Doce meses, el último es el mes actual. Ingresos y adopciones de ese mes. Quien no tiene `fechaIngreso` no entra. |
| `espera` | Hasta 4 animales sin adoptar y con `fechaIngreso`, del ingreso más antiguo. `dias` es hoy menos esa fecha. |

«Hoy» y «este mes» se miden en la zona horaria `America/La_Paz`. Los animales
eliminados no cuentan. En la base el contador de animales usa `adoptado`; el
front lo deduce de `adoptadoPor`.

## Errores

`401` sin sesión, `403` cuenta desactivada y `503` si PostgreSQL no responde
(sin detalles internos). La pantalla muestra el aviso y permite reintentar.
