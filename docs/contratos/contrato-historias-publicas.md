# Contrato de la API pública de historias destacadas

Historia SF-114.

Base local predeterminada: `http://localhost:3000/api`. El endpoint es anónimo:
no requiere sesión, cookie ni token CSRF.

## `GET /api/public/historias`

Responde `200` con las historias **visibles y no eliminadas**, ordenadas por
`orden` ascendente. No se pagina. Si no hay ninguna, la lista va vacía.

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "animalNombre": "Luna",
  "tituloEs": "Luna encontró un hogar",
  "tituloEn": "Luna found a home",
  "textoEs": "Texto visible de Luna.",
  "textoEn": "Visible text about Luna.",
  "autorNombre": "Familia Quispe",
  "fechaHistoria": "2026-10-01",
  "foto": {
    "url": "https://…/historias/luna/vertical.jpg",
    "ancho": 900,
    "alto": 1600
  }
}
```

- `autorNombre` puede ser `null`.
- `foto` es `null` si la historia no tiene archivo. `ancho` y `alto` son las
  medidas visibles (ya aplicada la orientación) y pueden ser `null`.
- `url` la arma el backend con `obtenerUrlPublica`. La respuesta no incluye la
  ruta cruda, el tipo, el tamaño, el orden, la visibilidad, los responsables
  (`creado_por`, `actualizado_por`, `eliminado_por`) ni las fechas internas.

## Errores

| Código | Caso                                      |
| ------ | ----------------------------------------- |
| `503`  | PostgreSQL no está disponible             |
