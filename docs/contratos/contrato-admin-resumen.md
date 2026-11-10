# Contrato del resumen del panel

No hay endpoint. `getResumen()` arma la respuesta en el navegador con
`listCampanas()` y `listAnimales()`.

Si más adelante existe `GET /api/admin/resumen`, solo cambia el interior de
`getResumen()`. La pantalla sigue leyendo este objeto. El código lo marca con
`TODO(backend)`.

## Petición

Sin cuerpo. La sesión es la misma cookie que usan las dos listas.

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

## Errores

Los mismos que fallen `listCampanas()` o `listAnimales()` (incluida la
simulación de error del mock). La pantalla muestra el aviso y permite
reintentar. No crea un error propio.
