# base-auth-react (contexto para Claude Code)

## Qué es este proyecto

Frontend de **una tienda online real**, en React + TypeScript + Vite. Arrancó como
"base-auth-react" — una **base/plantilla** con autenticación, sesión y llamadas HTTP ya
resueltas, pensada para arrancar proyectos nuevos sin reescribir esa parte cada vez — y a partir
de ahí se conectó a un backend real (NestJS, prefijo `tienda/v1`) y se le construyó encima el
dominio de negocio de la tienda: catálogo público, panel de administración de productos y
categorías. Ver "Historia reciente" más abajo para el detalle de qué se hizo y en qué orden.

**Ya no aplica** la advertencia original de "acá no hay dominio de negocio" para
`pages/Public/Catalog`, `pages/Private/Admin/Admin.tsx` (panel real de productos/categorías),
`pages/Private/User/User.tsx` (carga de productos para el rol USER) ni para
`components/NavBars/DropdownMenu.tsx` (links reales) — mantenerlos con cuidado como al resto del
código. Sigue siendo contenido de ejemplo sin uso real: `pages/Private/Guest/Guest.tsx` (no se le
definió ninguna función propia de la tienda todavía) y `pages/Register/Register.tsx` (ver más
abajo, ruta deshabilitada).

## Historia reciente (por qué está como está)

El repo arrancó como un clon/experimento (`<title>TESTEO</title>` original,
sin `node_modules` instalado nunca, **nunca se había corrido un build real**
hasta la limpieza descripta abajo). Tenía bastante código pegado de otro
proyecto a medio adaptar. Se hizo una limpieza completa en una
sesión (ver git log) que:

1. Agregó el alias `@/` (`vite.config.ts` + `tsconfig.app.json`).
2. Reemplazó un interceptor de axios que no hacía nada (`src/interceptors/`,
   **ya no existe**) por una instancia real con manejo de token/errores
   (`src/api/axios.ts`).
3. Agregó manejo centralizado de errores (`getErrorMessage`) y alertas
   (`alert.utils.ts`, `session-alerts.utils.ts`, SweetAlert2 — se agregó
   como dependencia nueva).
4. Arregló la seguridad de sesión: validación de expiración del JWT al
   hidratar el store (antes no existía, el "usuario viejo" podía quedar
   logueado con un token vencido), guard de auth simplificado, `RoleGuard`
   pasado de un solo rol a `roles: Roles[]`.
5. Limpieza general: borró imports/exports colgantes que apuntaban a
   archivos inexistentes (`IngresoProductos`, `Admin/Profile.tsx` duplicado
   — el proyecto nunca se había buildeado, así que nadie lo había notado),
   sacó una ruta (`INGRESO_PRODUCTOS`) y una imagen (`bgfarma.jpg`) que eran
   residuo de ese código pegado, migró `.eslintrc.cjs` (formato viejo) a
   `eslint.config.js` (flat config, lo que pide ESLint 9).

Point de partida: **`npx tsc -b --noEmit`, `npm run lint` y
`npx vite build` corren limpios.** Si alguno de los tres falla al arrancar
una sesión nueva, algo se rompió después de esto — no es el estado normal.

### Conexión al backend real + tienda (fases 1 y 2, ya hechas)

Con la plantilla ya limpia, se conectó a un backend real (`../Backend`, NestJS, roles
ADMIN/USER/GUEST, prefijo `tienda/v1`) y se construyó encima el dominio de negocio de la tienda,
en dos fases:

**Fase 1 — conectar al backend real** (sin tocar todavía las páginas de ejemplo):
1. `VITE_API_BASE_URL=http://localhost:3006/tienda/v1` en `.env`.
2. `decode.token.interface.ts`, `user.model.ts`, `users.interface.ts` y los services
   (`auth.service.ts`, `profile.service.ts`) ajustados a la forma real del backend: login es
   `{nickUsuario, password}` (no `email`), el JWT no trae `email` (trae `idUser, nickUsuario,
   role, name`), y `/auth/profile` devuelve el perfil directo (sin envolver en `{profile: ...}`).
3. Roles/rutas: no hizo falta tocar `roles.enum.ts` ni `routes.ts` — ya traían exactamente
   `ADMIN`/`USER`/`GUEST`.
4. `register.service.ts` y `pages/Register/Register.tsx` **no se tocaron ni se usan**: el
   backend no tiene signup público (`POST /auth/nuevo-usuario` es `@Auth(Role.ADMIN)`), así que la
   ruta pública de registro se sacó de `App.tsx` (no hay forma de que un visitante anónimo la use)
   y los archivos quedaron sin conectar, sin borrarlos.
5. `axios.ts`, los guards y `redux/states/user.ts` no se tocaron — el backend usa JWT estándar
   por header `Authorization`, mismo contrato que ya asumía la plantilla.

**Fase 2 — páginas de la tienda** (recién arrancada cuando la Fase 1 compiló y funcionó real,
verificado con curl contra el backend corriendo, no solo con el build):
- `pages/Public/Catalog/Catalog.tsx`: catálogo público (sin login), montado en `/` (la home del
  sitio — antes `/` redirigía a `/private`). Búsqueda por nombre + filtro por categoría +
  paginación, contra `GET /productos`.
- `pages/Private/Admin/Admin.tsx`: reemplazó el contenido de ejemplo por el panel real —
  listar/crear/editar/dar de baja/reactivar productos, subida de imagen, y su propia sección de
  gestión de categorías (crear/renombrar/dar de baja/reactivar). Más adelante se separó en
  páginas propias por responsabilidad — ver la entrada de "Historia reciente" correspondiente.
- `components/NavBars/DropdownMenu.tsx`: reemplazó los links placeholder (`/admin/1`, `/link3`)
  por los reales (Catálogo, Panel de administración [solo ADMIN], Cargar producto [solo USER],
  Perfil, Cerrar sesión). Más adelante se rediseñó visualmente — ver la entrada de "Historia
  reciente" correspondiente.
- Carrito, checkout y pagos: **todavía no están** — se definen más adelante.

**Categorías como entidad, no enum** (pedido explícito del usuario después de la Fase 2): el
campo "categoría" de un producto **no** es un string libre ni un enum de valores fijos — es una
relación a una tabla `categories` real en el backend, gestionable por el ADMIN desde
`Admin.tsx` (crear/renombrar/dar de baja/reactivar categorías) sin tocar código ni rebuildear.
`Product.categoria` es `{ idCategoria, nombre } | null` (no un string), y el form de productos
usa un `<select>` poblado desde `GET /categorias` en vez de un input de texto. Ver
`services/categories.service.ts` e `interfaces/category.interface.ts`.

**USER también puede cargar productos** (pedido explícito del usuario, después de lo de
categorías): `pages/Private/User/User.tsx` dejó de ser contenido de ejemplo — es un form de
"Cargar producto" (nombre, descripción, precio, stock, categoría, imagen). USER solo puede
**crear** productos y subirles imagen (incluida la del producto que acaba de crear, gracias a la
trazabilidad `creadoPor` agregada en el backend) — no puede editar, dar de baja/reactivar
productos existentes (ni siquiera los propios) ni tocar categorías; esos límites los aplica el
backend (`@Auth`, y en el caso de la imagen un chequeo de "es tuyo" en `ProductsService`), no el
frontend — la página de USER simplemente no ofrece esas acciones en su UI.

Nuevos archivos de esta etapa (no estaban en la plantilla original): `interfaces/product.interface.ts`,
`interfaces/category.interface.ts`, `services/products.service.ts`,
`services/categories.service.ts`, `pages/Public/Catalog/`, `utilities/apiUrl.utility.ts` ganó
`apiOrigin` (resuelve URLs de imágenes, que el backend sirve fuera del prefijo `tienda/v1`).

**Rediseño del menú** (pedido explícito del usuario, tomando como referencia visual otro
proyecto propio del mismo usuario — sin relación de código entre ambos): `DropdownMenu.tsx` pasó
de un header claro a uno oscuro (`bg-slate-800`), con "Hola, {nombre}" a la izquierda y los links
a la derecha marcando la página activa con un borde inferior celeste; "Cerrar sesión" en rojo
para distinguirlo del resto. Nuevo `hooks/useClickOutside.ts` (genérico, reutilizable) para
cerrar el menú mobile al clickear afuera. Sin submenús desplegables a propósito: la tienda hoy
tiene links planos nomás — si en el futuro se agrupan secciones, ahí sí conviene esa complejidad.
`components/ui/SubmenuItem.tsx`/`MenuToggleButton.tsx` quedaron sin uso (no se borraron).

**Panel admin separado por páginas** (pedido explícito del usuario: "todo vivía en la misma
página" — crear categoría, nuevo producto y listado de productos mezclados): `Admin.tsx` dejó de
ser una única página larga y pasó a ser un layout con tabs (`NavLink`) + sub-ruteo propio
(`RoutesWithNotFound` anidado, mismo patrón que ya usaba `Private.tsx`):
- `pages/Private/Admin/Products/ProductsListPage.tsx` — listado (antes la tabla vivía en
  `Admin.tsx`); "Editar" navega a su propia página en vez de un form inline.
- `pages/Private/Admin/Products/ProductFormPage.tsx` — mismo componente para crear
  (`/admin/productos/nuevo`, sin `:id`) y editar (`/admin/productos/:id/editar`, con `:id` —
  hace falta un `GET /productos/admin/:id` nuevo en el backend, porque la página de editar se
  puede abrir directo por URL/refresh y el público `GET /productos/:id` excluye los dados de
  baja).
- `pages/Private/Admin/Categories/CategoriesPage.tsx` — gestión de categorías (antes vivía
  inline en `Admin.tsx`).

`App.tsx` y `Private.tsx` montan `Admin` con `admin/*` (antes exacto) para que el sub-ruteo
anidado funcione en los dos lugares donde se puede llegar a `Admin` (`/admin` directo y
`/private/admin`).

**Buscador en vivo de productos** (pedido explícito del usuario, tomando como referencia un
componente de búsqueda en vivo de otro proyecto propio del mismo usuario — sin relación de código
entre ambos): `components/ProductSearch/InputBuscarProductos.tsx`, nuevo. Tipeás y a los 300ms
(debounce, sin pegarle al backend en cada tecla) muestra un desplegable de resultados clickeable,
con navegación por teclado (flechas + Enter) y cierre al clickear afuera (`useClickOutside`).
**No agrega ningún endpoint nuevo** — reutiliza `GET /productos` (catálogo) o
`GET /productos/admin/listado` (prop `admin`), que ya soportaban `search` + `limit`; ahí es donde
esta réplica se aparta a propósito del proyecto de referencia (que sí tenía endpoints de
búsqueda dedicados, por una razón específica de ese dominio — insumos con un concepto de "stock
disponible" que acá no existe).

Integrado en los dos buscadores que ya existían, como complemento del botón "Buscar" (que sigue
haciendo lo mismo que antes, filtra la grilla/tabla completa):
- `pages/Public/Catalog/Catalog.tsx`: seleccionar un resultado filtra el catálogo a ese producto
  exacto.
- `pages/Private/Admin/Products/ProductsListPage.tsx` (`admin` prop): seleccionar un resultado
  navega directo a `/admin/productos/:id/editar` — atajo para no tener que buscar+scrollear la
  tabla para encontrar un producto puntual.

**Detalle de producto + "Mis productos" para USER** (pedido explícito del usuario, después del
buscador en vivo):
- `pages/Public/ProductDetail/ProductDetail.tsx`, nuevo — detalle público (imagen grande, nombre,
  categoría, precio, stock, descripción), montado en `productos/:id` (público, sin login, junto a
  `Catalog` en `App.tsx`). Las tarjetas de `Catalog.tsx` pasaron de `<div>` a `<Link to={\`/productos/${id}\`}>`
  — antes no eran clickeables, no existía ninguna vista ampliada. Nuevo
  `getProductService(idProducto)` en `products.service.ts` (`GET /productos/:id`, público — no
  tenía wrapper todavía, solo existía la variante admin `getAdminProductService`).
- `pages/Private/User/User.tsx` dejó de ser una sola página y pasó a ser un layout con tabs
  (mismo patrón `NavLink` + `RoutesWithNotFound` anidado que ya usa `Admin.tsx`):
  - `User/CargarProducto/CargarProductoPage.tsx` — el form que antes vivía directo en `User.tsx`,
    sin cambios de comportamiento.
  - `User/MisProductos/MisProductosPage.tsx`, nuevo — lista los productos que el propio USER
    cargó (`GET /productos/mis-productos`, nuevo `getMisProductosService` en
    `products.service.ts`), incluidos los dados de baja. **A propósito de solo lectura + reactivar,
    no un editor completo**: no tiene "Editar" ni "Dar de baja" — el backend real solo le permite a
    USER crear, subir imagen y (después de este cambio) reactivar sus propios productos, nunca
    editarlos ni darlos de baja (ver CLAUDE.md del backend, sección de permisos de
    `ProductsController`). El botón "Reactivar" solo se muestra si `product.deletedAt` está
    seteado, y reutiliza el `activateProductService` que ya existía — no hizo falta un service
    nuevo para esa acción, la ruta ya se usaba desde el panel de ADMIN.
  - `App.tsx` y `Private.tsx` montan `UserPage` con `user/*` (antes exacto), mismo motivo que
    `Admin`. `DropdownMenu.tsx` no se tocó: el link de USER ("Cargar producto") sigue apuntando a
    `/user`, que ahora es la pestaña por default del layout nuevo.
  - **Backend**: para que "reactivar" funcionara acá, `PATCH /productos/:id/activar` pasó de
    `@Auth(Role.ADMIN)` exclusivo a `@Auth(Role.ADMIN, Role.USER)` + chequeo de ownership en
    `ProductsService.activarProducto` (mismo patrón que `actualizarImagen`) — ver CLAUDE.md del
    backend. Editar y dar de baja siguen siendo ADMIN-only, sin cambios.

## Arquitectura (esto sí hay que mantener con cuidado)

### Alias `@/`
Apunta a `src/` (`vite.config.ts` → `resolve.alias`, `tsconfig.app.json` →
`compilerOptions.paths`). Usarlo para cualquier import que cruce de un
módulo a otro (`@/models`, `@/services`, `@/utilities`, `@/interfaces`,
`@/redux/store`). Dentro de un mismo módulo (ej. entre dos componentes de
`src/components/`), una ruta relativa corta (`../Logout/Logout`) está bien
— no forzar el alias ahí.

### Cliente HTTP centralizado — `src/api/axios.ts`
Instancia única `api` (axios) que **todos** los services deben usar en vez
de `axios` importado directo:
- Interceptor de **request**: agrega `Authorization: Bearer <token>` leyendo
  el usuario de `localStorage` (`UserKey`, en `redux/states/user.ts`). Por
  esto **los services no reciben `token` como parámetro** — si ves un
  service pidiendo `token`, es código viejo sin migrar.
- Interceptor de **response**:
  - `401` → limpia `localStorage` y redirige a `/login`.
  - Sin respuesta del servidor (caído / sin red / `ERR_CONNECTION_REFUSED`)
    → limpia sesión, muestra `servidorNoDisponibleAlert()` y redirige a
    `/login`. Usa una bandera de módulo (`avisandoServidorCaido`) para no
    disparar la alerta varias veces si hay varios requests en paralelo
    fallando a la vez.
  - Cualquier otro error se normaliza a `new Error(mensaje)` (tomado de
    `error.response?.data?.message`), así el `catch` del consumidor nunca
    necesita leer `error.response.data.message` a mano.

### Errores y alertas
- `src/utilities/errors/getErrorMessage.utility.ts` → `getErrorMessage(error)`.
  Usar en **todo** `catch`, en vez de `error.message`/`error?.message` a mano.
- `src/utilities/alerts/alert.utils.ts` → `showSuccess(title, text?)` /
  `showError(text, title?)`, wrappers de SweetAlert2. Si un proyecto nuevo
  necesita alertas de negocio propias (mensajes específicos repetidos),
  agregarlas en un archivo nuevo (ej. `<proyecto>-alerts.utils.ts`), sin
  tocar `session-alerts.utils.ts` (esa es solo del interceptor).

### Sesión y seguridad de páginas
- `src/redux/states/user.ts`: `getInitialUserState()` valida, al hidratar
  el store desde `localStorage`, que el JWT no esté vencido (lo decodifica
  con `jwt-decode`). Si expiró o el storage está corrupto, arranca en
  `EmptyUserState` en vez de dejar una sesión "logueada" que no puede pedir
  nada real. **Esta es la única validación de expiración que debe existir**
  — no duplicarla en un guard o en un `useEffect` de cada página.
- `src/guards/auth.guard.tsx` (`AuthGuard`): decide si hay o no usuario
  logueado (`!!userState.token`). No revalida expiración (ya la hizo
  `getInitialUserState`) ni hace polling — para eso está el interceptor,
  que cierra sesión ante cualquier 401 en cualquier momento.
- `src/guards/rol.guard.tsx` (`RoleGuard`): recibe `roles: Roles[]` (no un
  solo `role`), para poder proteger una ruta que permite más de un rol:
  `<RoleGuard roles={[Roles.ADMIN, Roles.USER]} />`.
- `src/components/Header.tsx`: el menú privado (`DropdownMenu`) solo se
  muestra si hay token **y** la ruta actual no es pública. Si solo se
  chequea el token, un token viejo en `localStorage` hace que el menú
  aparezca un instante sobre la pantalla de login al recargar — bug real
  ya visto antes en otro proyecto similar, cuidado con reintroducirlo.

### Interfaces
`src/interfaces/index.ts` es un barrel — **los nombres de las interfaces
tienen que ser únicos entre archivos** (`GuardProps`, `RoleProps`,
`NotFoundProps`, no `Props` genérico repetido), porque un `export *`
duplicado no compila. Si se agrega una interfaz nueva de props, no llamarla
`Props` a secas.

## Convenciones de trabajo (heredadas de cómo trabaja este usuario)

- **Cambio mínimo necesario.** No proponer reescrituras grandes ni cambiar
  de librería/arquitectura sin que se pida explícitamente.
- Analizar antes de tocar, aplicar el cambio, **compilar y buildear
  después de cada modificación importante** (`npx tsc -b --noEmit` +
  `npx vite build`, y `npm run lint` si el cambio toca algo que el linter
  pueda opinar). No dar algo por terminado sin correr los tres.
- Nunca eliminar algo (`service`, `hook`, `componente`, export) solo porque
  "parece" no usarse — buscar referencias primero. (Así se encontraron los
  exports colgantes a `IngresoProductos`/`Admin/Profile.tsx`: nadie los
  había buscado, y tampoco nadie había buildeado el proyecto para que
  fallaran solos.)
- Entregar el código completo del archivo tocado, no fragmentos sueltos.
- Este proyecto **ya tiene dominio de negocio propio** (productos, categorías — ver "Historia
  reciente" arriba): a diferencia de cuando era solo la plantilla, ahora sí hay que preservar
  nombres de campos y reglas de negocio reales al tocar `pages/Public/Catalog`,
  `pages/Private/Admin/Admin.tsx` o los services de `products`/`categories`. Lo que no cambia es
  que hay que preservar la arquitectura de la sección anterior (auth/HTTP/sesión).

## Al arrancar un proyecto real a partir de esta base

**Esto ya se hizo para este proyecto** (ver "Historia reciente" más arriba, sección "Conexión al
backend real + tienda") — queda acá como referencia del checklist genérico que se siguió, útil si
alguna vez se clona esta base de nuevo para otro proyecto.

1. Cambiar `VITE_API_BASE_URL` en `.env`.
2. Ajustar a la forma real del backend nuevo:
   - `src/interfaces/decode.token.interface.ts` (payload del JWT)
   - `src/models/user.model.ts` (`UserInfo`)
   - `src/interfaces/users.interface.ts` (`User`, lo que devuelve `/auth/profile`)
   - `src/services/auth.service.ts`, `profile.service.ts`, `register.service.ts`
     (rutas y forma de la respuesta del backend)
3. `src/models/roles.enum.ts` y `src/models/routes.ts`: reemplazar los
   roles/rutas de ejemplo (`ADMIN`/`USER`/`GUEST`) por los reales del
   proyecto nuevo.
4. Reemplazar las páginas de ejemplo (`pages/Private/Admin`, `User`,
   `Guest`, `Profile.tsx`) y el menú (`components/NavBars/DropdownMenu.tsx`,
   que todavía tiene links placeholder tipo `/admin/1`, `/link3`) por las
   páginas reales.
5. No hace falta tocar `src/api/axios.ts`, los guards, ni
   `redux/states/user.ts` salvo que el backend nuevo tenga un contrato de
   auth realmente distinto (ej. refresh tokens, cookies en vez de
   `Authorization` header).

## Estructura

```
src/
├─ api/axios.ts                        (instancia axios + interceptors — no tocar sin razón)
├─ components/
│  ├─ Header.tsx                       (chequea token + ruta pública)
│  ├─ Logout/Logout.tsx                (hook useLogout)
│  ├─ NavBars/DropdownMenu.tsx         (menú real, header oscuro — ver "Historia reciente")
│  └─ ProductSearch/InputBuscarProductos.tsx  (buscador en vivo, debounce + teclado — ver
│                                        "Historia reciente")
├─ guards/                             (AuthGuard, RoleGuard)
├─ hooks/useClickOutside.ts            (genérico — cierra menús/desplegables al clickear afuera)
├─ interfaces/                         (barrel: @/interfaces — nombres únicos; incluye
│                                        product.interface.ts, category.interface.ts)
├─ models/                             (Roles, PublicRoutes/PrivateRoutes, UserInfo)
├─ pages/
│  ├─ Login/                           (formulario básico, sin estilar)
│  ├─ Register/                        (SIN USAR — no hay signup público en el backend, ver
│  │                                     "Historia reciente"; ruta sacada de App.tsx)
│  ├─ Public/
│  │  ├─ Catalog/                      (catálogo público — home del sitio, montada en '/')
│  │  └─ ProductDetail/                (detalle público de un producto, montada en 'productos/:id')
│  └─ Private/
│     ├─ Admin/Admin.tsx               (layout + tabs + sub-ruteo, solo ADMIN — ver Admin/Products/,
│     │                                 Admin/Categories/, y "Historia reciente")
│     ├─ Admin/Products/                (ProductsListPage, ProductFormPage [crear y editar])
│     ├─ Admin/Categories/              (CategoriesPage)
│     ├─ User/User.tsx                 (layout + tabs + sub-ruteo, solo USER — ver
│     │                                 User/CargarProducto/, User/MisProductos/, y "Historia
│     │                                 reciente")
│     ├─ User/CargarProducto/          (CargarProductoPage — crear producto + imagen)
│     ├─ User/MisProductos/            (MisProductosPage — solo lectura + reactivar)
│     ├─ Guest/                        (CONTENIDO DE EJEMPLO todavía, sin función propia)
│     └─ Profile.tsx
├─ redux/
│  ├─ states/user.ts                   (sesión: createUser/updateUser/resetUser + getInitialUserState)
│  └─ store.ts
├─ services/                           (auth, profile, products, categories — todos vía `api`,
│                                        sin `token` param; register.service.ts sin usar)
└─ utilities/
   ├─ apiUrl.utility.ts                (apiUrl + apiOrigin, para URLs de imágenes)
   ├─ errors/getErrorMessage.utility.ts
   └─ alerts/ (alert.utils.ts, session-alerts.utils.ts)
```

## Estado de las herramientas

- `npm run dev` — Vite dev server.
- `npm run build` — `tsc -b && vite build`. Limpio a la fecha de este archivo.
- `npm run lint` — ESLint 9, flat config (`eslint.config.js`). Limpio a la
  fecha de este archivo.
- Sin tests configurados (no hay Jest/Vitest/Playwright instalado).
