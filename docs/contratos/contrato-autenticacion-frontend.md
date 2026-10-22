# Contrato de autenticación administrativa (Etapa 5)

Documento preparado para el desarrollo del frontend del panel administrativo
de Fundación FÉNIX LPB. Describe **exactamente** lo que el backend expone a
partir de la Etapa 5 (SF-36 y SF-46).

**El backend no desarrolla pantallas de login.** Este documento es el contrato
que debe cumplir el frontend.

---

## 1. Modelo de sesión en una frase

La sesión vive **en el servidor**. El navegador sólo recibe una cookie
`HttpOnly` con un identificador opaco. No hay tokens de Google ni JWT en el
navegador, y **no se guarda nada en `localStorage` ni en `sessionStorage`**.

---

## 2. Variables que hay que conocer

| Variable | Descripción |
| :--- | :--- |
| `API_BASE_URL` | Origen del backend, por ejemplo `https://api.fundacionfenix.org`. |
| `ADMIN_URL` | Origen del panel administrativo, por ejemplo `https://administracion.fundacionfenix.org`. Debe estar incluido en `CORS_ALLOWED_ORIGINS` del backend. |

El backend **no** acepta ninguna URL de redirección enviada por el
navegador: la redirección posterior al login siempre es la configurada en
`AUTH_REDIRECT_URL` en el servidor.

---

## 3. Inicio de login

El frontend **no** implementa ningún formulario de usuario y contraseña. El
inicio de sesión consiste en enviar al navegador a un endpoint del backend:

```text
GET {API_BASE_URL}/api/auth/google
```

El backend:

1. genera `state`, `nonce` y el secreto PKCE,
2. redirige el navegador a Google (302),
3. al recibir la respuesta de Google, valida la identidad, comprueba que la
   cuenta está autorizada en PostgreSQL, **crea la sesión de aplicación**,
4. establece la cookie de sesión,
5. redirige el navegador a `AUTH_REDIRECT_URL` (por ejemplo
   `https://administracion.fundacionfenix.org/admin`).

Desde el frontend basta con:

```ts
window.location.href = `${API_BASE_URL}/api/auth/google`;
```

### Notas importantes

- La redirección es una navegación de primer nivel: **no** se puede hacer con
  `fetch` ni con `axios` esperando una respuesta, hay que cambiar la
  ubicación de la página.
- La URL de redirección **no contiene** tokens, códigos OAuth ni el
  identificador de sesión. La sesión viaja únicamente en la cookie.
- Si el usuario cancela en Google, el backend responde `400` con el formato de
  error uniforme. El frontend puede mostrar un mensaje genérico.

---

## 4. Consulta de la sesión actual

```text
GET {API_BASE_URL}/api/auth/me
```

Cabeceras obligatorias:

```http
Cookie: fenix_session=…      (la envía el navegador automáticamente)
```

En el frontend hay que pedir explícitamente las credenciales:

```ts
const respuesta = await fetch(`${API_BASE_URL}/api/auth/me`, {
  credentials: 'include',
});
```

### Respuesta `200`

```json
{
  "autenticado": true,
  "administrador": {
    "id": "11111111-1111-1111-1111-111111111111",
    "nombre": "Administración FÉNIX"
  },
  "csrfToken": "Zx9…",
  "expiraEn": "2026-10-22T12:00:00.000Z"
}
```

- `administrador` contiene **sólo** `id` y `nombre`. No se expone el correo,
  ni el `google_sub`, ni ningún identificador interno.
- `csrfToken` es el token anti-CSRF de la sesión (ver §6). **No** es una
  credencial de autenticación: sin la cookie no sirve para nada.
- `expiraEn` es la caducidad máxima absoluta de la sesión.

Además, la respuesta incluye `Cache-Control: no-store`.

### Respuestas de error

| Código | Significado | Qué debe hacer el frontend |
| :--- | :--- | :--- |
| `401` | No hay sesión, está caducada, fue revocada o la cookie fue alterada. | Limpiar el estado local del administrador y volver a `GET /api/auth/google`. |
| `403` | La cuenta administrativa está desactivada. | Mostrar «la cuenta está desactivada» y **no** reintentar el login en bucle. |
| `503` | PostgreSQL no está disponible: no se puede comprobar la autorización. | Mostrar «servicio no disponible» y reintentar más tarde. **Nunca** tratar un `503` como si hubiera sesión. |

Formato de error (idéntico al del resto del backend):

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "No hay una sesión administrativa activa",
  "timestamp": "2026-10-22T12:00:00.000Z",
  "path": "/api/auth/me"
}
```

---

## 5. Cierre de sesión

```text
POST {API_BASE_URL}/api/auth/logout
```

```ts
await fetch(`${API_BASE_URL}/api/auth/logout`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'X-CSRF-Token': csrfToken },
});
```

- `204 No Content`: la sesión se ha invalidado en el servidor y la cookie se
  ha eliminado. No hay cuerpo de respuesta.
- `401`: no había ninguna sesión activa. Es un caso **normal** (por ejemplo,
  pulsar «salir» dos veces): el frontend debe tratarlo como un cierre de
  sesión ya realizado y limpiar el estado local, sin mostrar un error.
- `403`: falta el token anti-CSRF o no es válido (§6).
- `503`: no se pudo comprobar la sesión.

Después del logout, la cookie de sesión deja de ser utilizable aunque el
navegador la conserve: la revocación se aplica en el servidor.

---

## 6. Cookies y protección CSRF

### La cookie

| Atributo | Valor |
| :--- | :--- |
| Nombre | `fenix_session` (configurable con `SESSION_COOKIE_NAME`). |
| `HttpOnly` | Siempre. El JavaScript del navegador **no** puede leerla. |
| `Secure` | `true` en producción. |
| `SameSite` | `lax` por defecto (`none` sólo si el frontend y el backend están en sitios distintos, lo que exige HTTPS y CSRF). |
| `Path` | `/api`. |

### Cómo enviar las cookies

En **todas** las peticiones al backend hay que incluir las credenciales:

```ts
fetch(url, { credentials: 'include' });
```

```ts
// Axios
axios.create({ baseURL: API_BASE_URL, withCredentials: true });
```

Sin `credentials: 'include'` el navegador no envía la cookie y el backend
responde `401` aunque la sesión exista.

### Token anti-CSRF

El backend usa cookies, por lo que una petición originada en otro sitio
podría ejecutarse en nombre del administrador. Para evitarlo, **toda operación
que modifique datos** (`POST`, `PUT`, `PATCH`, `DELETE`) debe incluir la
cabecera:

```http
X-CSRF-Token: <valor de csrfToken>
```

El valor se obtiene en `GET /api/auth/me` (§4). Se recomienda mantenerlo **en
memoria** (variable de estado de la aplicación), no en `localStorage`.

Si el token falta o no coincide con el de la sesión, el backend responde
`403 Forbidden` y **no** ejecuta la operación.

---

## 7. Redirección después de autenticarse

- La redirección la realiza el **backend**, no el frontend.
- La URL de destino es `AUTH_REDIRECT_URL`, configurada en el servidor. Su
  origen está obligatoriamente incluido en `CORS_ALLOWED_ORIGINS`.
- La URL **no contiene** identificadores de sesión, tokens ni códigos OAuth.
  La credencial viaja únicamente en la cookie `HttpOnly`.
- El frontend no debe intentar deducir la URL de redirección a partir de
  parámetros de la URL: si el backend necesita redirigir a otra parte, se
  cambia la variable de entorno.

Si el frontend necesita rutas distintas según el estado (por ejemplo
`/admin/donaciones`), el backend debe redirigir siempre a `AUTH_REDIRECT_URL`
y el frontend decide la ruta final a partir de su propio enrutador.

---

## 8. Endpoint privado de comprobación

Existe un endpoint mínimo para verificar que los guards funcionan antes de
desarrollar las donaciones:

```text
GET {API_BASE_URL}/api/admin/health
```

Requiere sesión válida; responde `200` con:

```json
{
  "status": "ok",
  "administrador": { "id": "…", "nombre": "…" },
  "timestamp": "2026-10-22T12:00:00.000Z"
}
```

No expone información de Supabase ni de la base de datos. Responde `401` sin
sesión, `403` con la cuenta desactivada y `503` si PostgreSQL no está
disponible.

---

## 9. Tabla de códigos de respuesta

| Código | Significado | Acción recomendada en el frontend |
| :--- | :--- | :--- |
| `200` | Operación correcta. | Continuar. |
| `204` | Logout correcto (sin cuerpo). | Vaciar el estado local y navegar al inicio. |
| `400` | Error del flujo de Google (`state` inválido, error del proveedor). | Mostrar «no se pudo completar el acceso». |
| `401` | Sin sesión o sesión inválida/caducada/revocada. | Vaciar estado local y reenviar a `GET /api/auth/google`. |
| `403` | Cuenta desactivada o token anti-CSRF incorrecto. | No reintentar el login automáticamente. Revisar la cabecera `X-CSRF-Token`. |
| `503` | Backend o PostgreSQL no disponible. | Mensaje de «servicio no disponible» y reintento posterior. |

---

## 10. Lista de comprobación para el frontend

- [ ] El login se inicia con una navegación a `GET /api/auth/google`.
- [ ] Todas las peticiones al backend usan `credentials: 'include'`.
- [ ] `GET /api/auth/me` se usa como comprobación de sesión al cargar la
      aplicación.
- [ ] Un `401` en cualquier Endpoint protegido devuelve al usuario al login.
- [ ] Un `403` se muestra como «cuenta desactivada» (o error de CSRF), sin
      bucle de redirección.
- [ ] Un `503` se muestra como «servicio no disponible».
- [ ] Todas las operaciones de escritura incluyen `X-CSRF-Token`.
- [ ] No se guarda ningún token de autenticación en `localStorage` ni en
      `sessionStorage`.
- [ ] El logout trata el `401` como cierre ya realizado.
- [ ] No se construye ninguna URL de redirección a partir de datos del
      navegador.
