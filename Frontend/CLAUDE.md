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

**Detalle de producto en modal** (pedido explícito del usuario, después de que el backend ganó
galería de fotos — ver CLAUDE.md del backend, sección "Galería de fotos"): clickear una tarjeta de
`Catalog.tsx` ya **no navega** a `productos/:id` — abre `ProductDetailModal.tsx` (nuevo, en
`pages/Public/Catalog/`) con el `Product` que el catálogo ya tenía en memoria (la lista de
`GET /productos` ya trae `descripcion`/`imageUrl`/`fotos` completos), sin repetir ningún fetch.
`pages/Public/ProductDetail/ProductDetail.tsx` y su ruta **no se tocaron ni se borraron** —
quedaron sin enlazar desde la UI, igual que `Register.tsx`, para que una URL directa
`/productos/:id` (bookmark, link compartido) siga funcionando; se confirmó primero que ningún otro
lugar del frontend armaba un link a esa ruta.
- `components/ui/Modal.tsx`, nuevo — modal genérico sobre `@headlessui/react` (`Dialog` +
  `DialogBackdrop` + `DialogPanel`; era dependencia del proyecto desde el arranque de la
  plantilla, sin usarse en ningún componente hasta ahora). Resuelve ESC/click afuera/foco atrapado
  sin reimplementarlo a mano; no impone contenido, cualquier página nueva que necesite un modal
  puede reusarlo.
- `ProductDetailModal.tsx`: galería simple de **miniaturas + foto grande seleccionada** (no
  carrusel — más simple de implementar bien para un catálogo, sin gestos de swipe que mantener).
  Muestra como "las fotos" la unión de `product.imageUrl` (portada, primera) + `product.fotos[]`
  (galería), armada en el propio componente sin tocar el backend. La descripción va en un bloque
  con su propio `max-h-40 overflow-y-auto` — scroll interno, no estira el modal ni corta texto sin
  forma de verlo. El índice de la miniatura seleccionada se resetea al cambiar de producto
  ajustando el estado durante el render (comparando contra el `idProducto` anterior guardado en
  estado), no con un `useEffect` — la regla `react-hooks/set-state-in-effect` del linter no deja
  llamar a `setState` síncrono dentro de un efecto.
- `interfaces/product.interface.ts` ganó `ProductImage` (`{ idProductoImagen, imageUrl }`) y
  `Product.fotos: ProductImage[]` (siempre array, nunca `undefined`) — reflejaba la forma vieja del
  backend, sin el array de galería.

**Visibilidad del stock** (pedido explícito del usuario, después del backend agregar
`ProductEntity.mostrarStock`): ADMIN (en `ProductFormPage.tsx`, crear y editar) y USER (en
`CargarProductoPage.tsx` al crear, y en `MisProductosPage.tsx` para tocarlo después — es la única
vista de USER que no es un form, así que ahí el check llama directo a
`updateStockVisibilityService`, nuevo en `products.service.ts`, `PATCH /:id/visibilidad-stock`)
tienen un checkbox "Mostrar stock a los clientes". `Product.stock` pasó de `number` a
`number | null`: **null solo en las vistas públicas** (`Catalog.tsx`, `ProductDetailModal.tsx`)
cuando el dueño lo ocultó — ahí se muestra "Consultar disponibilidad" en vez del número (no
confundir con `stock === 0`, que sigue siendo "Sin stock"). Las vistas privilegiadas
(`ProductsListPage.tsx`, `MisProductosPage.tsx`, los forms) nunca reciben `null` en la práctica —
usan `product.stock ?? 0` solo para satisfacer el tipo compartido con las vistas públicas.

**Subir varias fotos desde el form** (pedido explícito del usuario: el backend ya soportaba
galería desde antes — `POST /:id/fotos`, `DELETE /:id/fotos/:idFoto` — pero ningún form la usaba
todavía). Campo nuevo "Fotos adicionales" (`<input type="file" multiple>`) separado del campo
"Imagen (portada)" existente — a propósito dos campos distintos en vez de uno solo con
`multiple` (que el primer archivo se vuelva portada automáticamente sería más "mágico" y menos
obvio que replicar el mismo criterio portada/galería que ya tiene el backend). Los archivos
elegidos se guardan en estado (`photoFiles: File[]`) y se suben recién al guardar el form, una
request por archivo, secuencial (`addProductPhotoService`/`deleteProductPhotoService`, nuevos en
`products.service.ts`):
- `CargarProductoPage.tsx` (USER, solo crear): sube portada + fotos adicionales después de crear
  el producto, mismo momento que ya subía la portada.
- `ProductFormPage.tsx` (ADMIN, crear y editar): mismo campo de fotos nuevas + en modo edición
  además muestra la galería que el producto ya tiene (`product.fotos`, cargada junto con el resto
  del form) con un botón "×" por foto para borrarla — acción inmediata (no espera al submit del
  form), mismo criterio que "Reactivar"/"Dar de baja" en las otras páginas del panel.
- El preview de la portada actual (`currentImageUrl`) pasó de `object-cover` a `object-contain`
  de paso, mismo motivo que `Catalog.tsx`/`ProductDetailModal.tsx` (ver más arriba, sección
  "Detalle de producto en modal").

**Perfil rediseñado** (pedido explícito del usuario: "replicá lo del perfil de mi otro proyecto" —
`FRONTENDS/siscofar-frontend/src/pages/Private/Profile.tsx`, sin relación de código entre ambos
proyectos, solo se portó el diseño/comportamiento). El `Profile.tsx` viejo (sin estilar, un campo
fijo de "contraseña actual" reusado para cualquier cambio) se reemplazó por:
- Avatar circular con iniciales de fallback (`getIniciales`) + botón "✎" superpuesto que abre un
  `<input type="file">` oculto — sube con `actualizarFotoService` (nuevo en `auth.service.ts`,
  `POST /auth/foto`, mismo mecanismo multipart que `uploadProductImageService`). El backend ya
  tenía este endpoint (`AuthController.actualizarFoto`) y `User.fotoUrl` en la interfaz — el
  frontend nunca los usaba.
- `components/Profile/ProfileField.tsx`, nuevo — un campo por fila, en reposo muestra el valor +
  link "Editar"; al click abre input + Guardar/Cancelar. Puerto del componente homónimo del otro
  proyecto, con sus clases custom (`field-input`/`btn-primary`/`btn-secondary`, CSS que ese
  proyecto tiene y este no) cambiadas por utilidades de Tailwind directas y el `Button` de
  `components/ui` que ya existía acá.
- Confirmación con contraseña **por cada campo**, vía un prompt de SweetAlert2 en el momento de
  guardar (no un campo fijo al pie reusado para todo): `PATCH /auth/updateUser/:id` ya exigía
  `currentPassword` en cada llamada (`UsersService.updateUser`, 400 si falta o es incorrecta) — el
  frontend viejo lo pedía una sola vez y listo, sin repetir la confirmación en cada guardado.
- Si el campo actualizado es `nickUsuario` o `email` (los dos identificadores de cuenta — ver
  "Identidad de login" en `Backend/CLAUDE.md`), se cierra la sesión y se manda a `/login` después
  de avisar con un Swal — a mano (`dispatch(resetUser())` + `navigate`), **no** con el hook
  `useLogout()` que ya tiene este proyecto: ese hook siempre pide confirmación con otro Swal
  ("¿Querés cerrar la sesión?"), inapropiado acá porque no es una decisión del usuario, es
  consecuencia obligada de haber cambiado su propio identificador de login.
- Roles del badge adaptados a los reales de este proyecto (`ADMIN`/`USER`/`GUEST`) — el original
  tenía un cuarto rol (`SOLICITANTE`) que acá no existe. Campos `nombre`/`apellido` (no
  `name`/`surname` del original) — misma diferencia que ya documentaba "Conexión al backend real"
  más arriba.

**CRUD de usuarios para ADMIN** (pedido explícito del usuario: "creame un CRUD para dar de alta
usuarios, solo el admin puede tener acceso"). Nueva pestaña `pages/Private/Admin/Users/`, cuarta
del panel (junto a Productos/Categorías), montada en `admin/usuarios` — protegida igual que el
resto de `Admin.tsx` (`RoleGuard` de `App.tsx`, ADMIN exclusivo):
- `UsersPage.tsx` — listado (`GET /auth/listar-usuarios`, nuevo `getUsersService` en
  `services/users.service.ts`) + "Dar de baja"/"Reactivar" por fila, mismo patrón que
  `CategoriesPage.tsx`/`ProductsListPage.tsx` (Swal de confirmación, `reloadToken` para refrescar).
- `UserFormModal.tsx` — crear y editar en el mismo modal (reutiliza `components/ui/Modal.tsx`),
  diferenciado por si le pasan un `UserListItem` (editar, precarga el form) o `null` (crear, form
  vacío). El índice/estado que arranca el form de nuevo al abrir se resetea comparando el `open`
  anterior contra el actual y ajustando el estado durante el render (mismo patrón que
  `ProductDetailModal.tsx` — ver "Detalle de producto en modal" — para no pisar
  `react-hooks/set-state-in-effect`), no con un `useEffect`.
- **Editar es la pieza que faltaba en el backend**: `POST /auth/nuevo-usuario` (crear),
  `GET /auth/listar-usuarios` (listar) y dar de baja/reactivar ya existían — pero no había ningún
  endpoint para que un ADMIN editara los datos de OTRO usuario (el único que editaba,
  `PATCH /auth/updateUser/:id`, es autoservicio: solo tu propia cuenta, pide tu contraseña actual).
  Se agregó `PATCH /auth/editar-usuario/:id` en el backend — ver `Backend/CLAUDE.md`, sección "CRUD
  de usuarios para ADMIN". Nuevo `updateUserAdminService` en `services/users.service.ts`, **no**
  reutiliza `updateUserService` de `profile.service.ts` (ese pega a la ruta de autoservicio, con
  otra semántica de permisos).
- El form de `UserFormModal.tsx` deja setear una contraseña nueva sin pedir la actual (a diferencia
  de `ProfileField` en `Profile.tsx`) — es una acción administrativa (recuperar acceso), no
  autoservicio; en blanco al editar = no se toca la contraseña existente.
- El backend puede devolver 400 "no podés dar de baja/quitarle el rol de administrador al único
  administrador activo" (protección nueva, ver `Backend/CLAUDE.md`) — el frontend no hace nada
  especial con ese caso, llega como cualquier otro error a `showError(getErrorMessage(error))`.

**Paginado en el listado de ADMIN** (pedido explícito del usuario: la tabla de
`ProductsListPage.tsx` pedía hasta 50 productos de una sola vez sin paginar — "con el tiempo se va
a llenar y va a ser imposible de controlar"). Se evaluaron dos opciones — paginado por letra inicial
vs. paginado por cantidad — y se eligió **por cantidad** (`PAGE_SIZE = 30`): agrupar por letra no
acota nada de verdad (una letra con cientos de productos seguiría siendo una lista larga que
también habría que paginar), y ya existía el buscador en vivo (`InputBuscarProductos`) para
encontrar un producto puntual por nombre. Mismo patrón que ya usaba `Catalog.tsx` (estado
`page`/`total`, botones Anterior/Siguiente, `Math.ceil(total / PAGE_SIZE)`) — no hizo falta tocar el
backend, `GET /productos/admin/listado` ya aceptaba `page`/`limit` (máximo 50, ver
`FindProductsQueryDto`). El buscador resetea `page` a 1 al escribir una búsqueda nueva, para no
quedar en una página que ya no existe con los resultados filtrados.

**Página pública de contacto** (pedido explícito del usuario — ver `Backend/CLAUDE.md`, sección
"Página pública de contacto", para el diseño completo incluida la decisión de WhatsApp):
- `pages/Public/Contact/ContactPage.tsx`, nuevo — montada en `contacto` (público, sin login).
  Deliberadamente **no** está en `models/routes.ts` → `PublicRoutes` como `LOGIN`/
  `SERVICE_UNAVAILABLE`: ese objeto lo usa `Header.tsx` para decidir cuándo ocultar el menú privado
  de un usuario logueado ("estás afuera de la app"), y acá un ADMIN/USER logueado tiene que poder
  seguir viendo su navegación al visitar esta página — mismo criterio que `Catalog`/`ProductDetail`,
  que tampoco están ahí.
- Enlazada desde dos lugares, porque son dos audiencias con navegación distinta: un link
  "Contacto" en el header de `Catalog.tsx` (para un visitante anónimo, que no ve ningún menú — ver
  `Header.tsx`, no renderiza nada sin sesión) y otro en `DropdownMenu.tsx` (para cualquier usuario
  logueado).
- `pages/Private/Admin/Contact/ContactSettingsPage.tsx`, nuevo — quinta pestaña del panel ADMIN
  (`admin/contacto`), el email/WhatsApp donde le llegan al negocio los mensajes. **No** vive en
  `Profile.tsx`: es una config del negocio (puede haber varios ADMIN, ver "CRUD de usuarios para
  ADMIN" más abajo), no de una cuenta personal — ni tiene relación con el email de *login* de nadie.
- `services/contact.service.ts`, nuevo (`sendContactMessageService`, `getContactWhatsappService`,
  `getContactSettingsService`, `updateContactSettingsService`) — el de actualizar manda
  `email`/`whatsapp` siempre los dos, con `null` si el input quedó vacío (el backend sí distingue
  "vaciar" de "no tocar" acá, a diferencia de la mayoría de los PATCH de este proyecto).

**Envío por WhatsApp al mandar el formulario** (pedido explícito del usuario, después de la página
de contacto: "quiero que repliques este mismo sistema" — refiriéndose a
`FRONTENDS/sweet-moment-candy/src/pages/Public/Servicios.tsx`, otro proyecto propio del mismo
usuario, sin relación de código entre ambos). `ContactPage.tsx` pide el número apenas se monta
(`getContactWhatsappService`, `GET /contacto/whatsapp`, público) y lo guarda en estado — hace falta
tenerlo *antes* de que el cliente clickee "Enviar", no recién ahí, por lo que sigue. Al hacer submit,
si hay un número cargado, se abre `window.open('https://wa.me/<numero>?text=<mensaje>')` con el
mensaje precargado (mismo mecanismo exacto que `Servicios.tsx` — `wa.me` no es una API, es un link
que abre WhatsApp; lo termina mandando el propio cliente) **antes** de cualquier `await` — el envío
del mail (`sendContactMessageService`) recién se dispara después. El orden importa: si se esperara
a que el mail termine para recién ahí abrir la ventana, la mayoría de los navegadores bloquean el
popup por no venir de una interacción directa del usuario (el `await` "rompe" el gesto de click). El
número se limpia con `.replace(/\D/g, '')` antes de armar el link — `wa.me` espera solo dígitos, sin
`+` ni espacios, aunque en la configuración se haya guardado con `+` adelante.

**Rediseño visual del catálogo, estilo Mercado Libre** (pedido explícito del usuario, en dos
pasos — primero "quiero que esta página tenga un estilo visual parecido a como Mercado Libre
muestra sus productos", después "quiero lograr algo parecido a [una captura del home de ML], no
usar los mismos colores, sino la forma de mostrar todo"). Solo toca `Catalog.tsx` — el resto del
sitio (Header, Admin, Profile) sigue con su paleta/tipografía de siempre:
- `index.css` ganó tokens de Tailwind v4 (`@theme`) usados **solo** por esta página:
  `font-catalog` (tipografía "Plus Jakarta Sans", cargada por `<link>` en `index.html` — no pisa
  el `font-sans` global) y la paleta `ink`/`canvas`/`line`/`brand`/`brand-dark` (azul propio, no el
  amarillo/celeste de ML — pedido explícito: "no usar los mismos colores"). Los tokens quedan
  definidos globalmente (Tailwind v4 es así por naturaleza) pero ningún otro componente los usa.
- Estructura de la página calcada del *ritmo* del home de ML, no de su contenido: franja de marca
  full-bleed arriba (`bg-brand`, nombre + buscador + Contacto, siempre visible sin scrollear),
  hero grande debajo (degradado `brand`→`brand-dark`, el único texto que afirma algo: "Bazar y
  juguetería..."), pills de categoría, título de sección real ("Todos los productos") antes de la
  grilla. **A propósito NO tiene** nada de lo que ML sí muestra pero acá sería inventado: badges de
  "% OFF", "Envío gratis", cuotas — `Product` no tiene precio de oferta ni hay ninguna política de
  envío configurada en el proyecto, mostrar eso sería mentirle a un cliente real.
- Grilla más densa (hasta 5 columnas), cards con borde fino en reposo y sombra/borde `brand` solo
  al hover (no sombra pareja en todas por default), precio como elemento más grande/pesado de la
  card (en `brand`, `tabular-nums` para que alineen en columna), categoría como pill discreta
  (sentence case, no un eyebrow en mayúsculas).
- El `<select>` de categoría se reemplazó por pills — filtran al toque, mismo comportamiento
  inmediato que ya tenía `handleCategoriaChange`.
- **Pills en marquesina** (pedido explícito posterior del usuario, sobre una captura de las pills):
  se mueven solas de izquierda a derecha (`@keyframes catalog-marquee` en `index.css`, contenido
  duplicado x2 dentro de la cinta para que el loop no se note), salvo el botón "Todo", que queda
  fijo afuera de la cinta. Se pausa con `hover:`/`focus-within:[animation-play-state:paused]` — si
  no, sería imposible clickear una categoría puntual mientras se desliza. Respeta
  `prefers-reduced-motion` (`motion-reduce:animate-none` + vuelve al scroll manual de siempre, la
  copia decorativa se oculta con `motion-reduce:hidden` para no duplicar cada categoría en ese
  caso). La copia duplicada lleva `aria-hidden` + `tabIndex={-1}` (`renderCategoriaPills(true)`)
  para que un lector de pantalla o la navegación por teclado no la anuncien/tabulen dos veces.
- Verificado visualmente con capturas (Playwright vía `npx playwright screenshot`, no hay
  `chromium-cli` instalado en este entorno) en desktop y mobile — encontró y corrigió un bug real
  de responsive: el buscador quedaba apretado en una sola fila con "Catálogo"/"Contacto" en mobile,
  ahora pasa a su propia fila (`flex-wrap` + `order-*` + `basis-full` en sm).

**Footer global** (pedido explícito del usuario, después de preguntar qué era el footer que veía
en otros sitios — Western Union, Emol — y si correspondía sumarlo acá): `components/Footer.tsx`,
nuevo, montado en `App.tsx` junto a `Header` — a diferencia de `Header`, este SÍ se muestra
siempre, en cualquier ruta, con o sin sesión. A propósito **no** tiene nada de lo que esos
ejemplos mostraban pero acá sería inventado: sin redes sociales (no hay ninguna cuenta configurada
en el proyecto), sin Términos/Privacidad (esas páginas no existen, un link ahí rompería), sin
razón social en el copyright (el proyecto no tiene un nombre de negocio definido en ningún lado).
Solo contenido real: links a Catálogo/Contacto, y el WhatsApp de contacto si está configurado
(mismo `getContactWhatsappService` público que ya usa `ContactPage.tsx`). Estilo neutro (blanco/
gris, el azul de link de siempre) — no usa los tokens `font-catalog`/`brand` del catálogo, porque
este componente aparece también en Admin/Perfil/Login.

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
    → limpia sesión igual que en un 401, pero **redirige a
    `/servicio-no-disponible`, no a `/login`** (bug corregido, pedido explícito
    del usuario): un visitante anónimo navegando el catálogo público nunca tuvo
    sesión, y mandarlo a un login que tampoco va a poder autenticar (el
    servidor sigue caído) no tenía sentido. `pages/Public/ServiceUnavailable/`
    es una página nueva, pública, que a propósito no le pega a la API al
    montarse (si lo hiciera, aterrizar ahí con el servidor todavía caído
    dispararía el mismo error de nuevo) — solo un mensaje + botón "Volver al
    catálogo". Usa una bandera de módulo (`redirigiendoPorServidorCaido`) para
    no disparar varias redirecciones si hay varios requests en paralelo
    fallando a la vez; como el redirect es un `window.location.href` (recarga
    dura), el módulo se reinstancia solo en la página nueva, así que no hace
    falta resetear la bandera a mano. `servidorNoDisponibleAlert()` (el
    `SweetAlert2` que se mostraba antes de redirigir) se sacó de
    `session-alerts.utils.ts` — quedaba redundante con la página nueva, y su
    texto ("vas a ser redirigido al login") ya no era cierto.
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
├─ index.css                           (@import "tailwindcss" + tokens propios de Catalog.tsx:
│                                        font-catalog, ink/canvas/line/brand/brand-dark,
│                                        @keyframes catalog-marquee — ver "Historia reciente",
│                                        sección "Rediseño visual del catálogo")
├─ api/axios.ts                        (instancia axios + interceptors — no tocar sin razón)
├─ components/
│  ├─ Header.tsx                       (chequea token + ruta pública — menú privado, NO el footer)
│  ├─ Footer.tsx                       (pie de página global, se ve en toda ruta — ver "Historia
│  │                                     reciente")
│  ├─ Logout/Logout.tsx                (hook useLogout)
│  ├─ NavBars/DropdownMenu.tsx         (menú real, header oscuro — ver "Historia reciente")
│  ├─ ProductSearch/InputBuscarProductos.tsx  (buscador en vivo, debounce + teclado — ver
│  │                                     "Historia reciente")
│  ├─ Profile/ProfileField.tsx         (campo editable de Profile.tsx — ver "Historia reciente",
│  │                                     sección "Perfil rediseñado")
│  └─ ui/                              (Button, Modal [sobre @headlessui/react], MenuToggleButton,
│                                        SubmenuItem — barrel en ui/index.ts)
├─ guards/                             (AuthGuard, RoleGuard)
├─ hooks/useClickOutside.ts            (genérico — cierra menús/desplegables al clickear afuera)
├─ interfaces/                         (barrel: @/interfaces — nombres únicos; incluye
│                                        product.interface.ts, category.interface.ts,
│                                        contact.interface.ts, users.interface.ts [User +
│                                        UserListItem])
├─ models/                             (Roles, PublicRoutes/PrivateRoutes, UserInfo)
├─ pages/
│  ├─ Login/                           (formulario básico, sin estilar)
│  ├─ Register/                        (SIN USAR — no hay signup público en el backend, ver
│  │                                     "Historia reciente"; ruta sacada de App.tsx)
│  ├─ Public/
│  │  ├─ Catalog/                      (catálogo público — home del sitio, montada en '/'; el
│  │  │                                 detalle de un producto se abre en ProductDetailModal.tsx,
│  │  │                                 no navega)
│  │  ├─ ProductDetail/                (detalle público de un producto por URL directa, montada en
│  │  │                                 'productos/:id' — sin enlazar desde la UI, ver "Historia
│  │  │                                 reciente")
│  │  ├─ ServiceUnavailable/           (destino del interceptor de axios cuando el servidor no
│  │  │                                 responde, montada en 'servicio-no-disponible' — ver
│  │  │                                 "Cliente HTTP centralizado" más abajo)
│  │  └─ Contact/ContactPage.tsx       (form público de contacto, montada en 'contacto' — NO está
│  │                                    en PublicRoutes, ver "Historia reciente")
│  └─ Private/
│     ├─ Admin/Admin.tsx               (layout + tabs + sub-ruteo, solo ADMIN — ver Admin/Products/,
│     │                                 Admin/Categories/, Admin/Users/, Admin/Contact/, y "Historia
│     │                                 reciente")
│     ├─ Admin/Products/                (ProductsListPage, ProductFormPage [crear y editar])
│     ├─ Admin/Categories/              (CategoriesPage)
│     ├─ Admin/Users/                   (UsersPage, UserFormModal [crear y editar, en un modal])
│     ├─ Admin/Contact/                 (ContactSettingsPage — email/WhatsApp de contacto, no es
│     │                                  parte de Profile.tsx)
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
├─ services/                           (auth, profile, products, categories, contact, users —
│                                        todos vía `api`, sin `token` param; register.service.ts
│                                        sin usar)
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
