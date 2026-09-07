# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es esto

Backend de **una tienda online real**, en NestJS (v11) + MySQL + TypeORM. Arrancó como
"base-auth-backend" — una plantilla de auth reutilizable ("proyectos hijos de esta base", según
los comentarios del código) — y a partir de ahí se le construyó encima el dominio de negocio real
de la tienda. Trae auth por JWT, roles, hasheo de passwords con argon2, subida de imágenes,
recuperación de contraseña por email, y logging/auditoría estructurada con Winston. Base de datos:
`tienda` (MySQL local). Prefijo global de la API: `tienda/v1` (no `auth/v2`, el de la plantilla
sin modificar).

**Módulos**: `auth`/`users` (heredados de la plantilla, sin tocar su arquitectura) + `products` y
`categories` (negocio real de la tienda, agregados después — ver más abajo). Roles: `ADMIN`,
`USER`, `GUEST` (`src/common/enums/role.enum.ts`).

Los comentarios en todo el código están en español y suelen ser sustanciosos (explican el *por
qué*, no solo el *qué* — sobre todo en los trade-offs de seguridad). Leelos antes de tocar lógica
cercana, y mantené ese mismo estilo (español, con la razón por delante) en comentarios nuevos, en
vez de pasarte a inglés.

## Comandos

```bash
npm run start:dev      # servidor de dev con watch (nest start --watch)
npm run start:debug     # servidor de dev con --inspect + watch
npm run build           # nest build -> dist/
npm run start:prod      # node dist/main (después de build)

npm run lint            # eslint --fix sobre src/apps/libs/test
npm run format           # prettier --write src/**/*.ts test/**/*.ts

npm test                 # tests unitarios (jest, rootDir: src, *.spec.ts junto al código fuente)
npm run test:watch
npm run test:cov
npm run test:e2e         # tests e2e, config en test/jest-e2e.json

# un solo archivo de test:
npx jest src/auth/auth.service.spec.ts
# un solo test por nombre:
npx jest src/auth/auth.service.spec.ts -t "nombre del test"
```

El CI (`.github/workflows/ci.yml`) corre en cada push/PR: `npm ci`, `lint`, `build`, `test`,
`test:e2e`, contra un contenedor real de MySQL 8. `DB_PASSWORD` es obligatoria pero puede ser un
string vacío (`Joi.string().allow('').required()`); `SECRET_WORD` debe tener al menos 16
caracteres.

**Gotcha de dev — no correr `npm run build` mientras `npm run start:dev` está corriendo**: los
dos compilan a `dist/` en paralelo y se pisan (`MODULE_NOT_FOUND` / `EADDRINUSE` al reiniciar).
Si necesitás un build limpio con el watcher activo, primero matá el proceso de `start:dev` (o
dejá que su propia recompilación incremental valide el cambio) y recién ahí corré `build`.

No hay un repo `.git` local inicializado en este directorio de trabajo todavía, aunque existe un
workflow de GitHub Actions — verificá esto antes de asumir que hay historial de git o branching
disponible.

## Variables de entorno

La configuración se valida de entrada al bootear, con un schema de Joi en
[app.module.ts](src/app.module.ts) — la app **se niega a arrancar** si falta alguna variable
requerida, en vez de bootear silenciosamente con, por ejemplo, un secreto de JWT undefined. Ver
[.env.example](.env.example) para la lista completa con comentarios por variable. Las más
relevantes:

- `SEED_ADMIN_NICK` / `SEED_ADMIN_PASSWORD` (+ `SEED_ADMIN_EMAIL` opcional): como crear usuarios
  requiere ya tener un ADMIN (`POST /auth/nuevo-usuario` es solo para ADMIN, no hay signup
  público), una base nueva no tiene forma de crear su primer usuario. Si están seteadas y todavía
  no existe ningún ADMIN, se crea uno automáticamente al arrancar
  (`AppService.seedInitialAdmin`, en [app.service.ts](src/app.service.ts)). Sacar estas variables
  del `.env` después del primer arranque.
- `CORS_ORIGIN`: lista de orígenes permitidos separada por comas; sin definir, cae a `*`
  (comportamiento de desarrollo).
- `FRONTEND_URL`: se usa para armar el link de recuperación de contraseña que se manda por mail.

## Arquitectura

**Estructura de módulos**: `AppModule` arma la infraestructura global (Config/validación con Joi,
Winston, Throttler, TypeORM) e importa `AuthModule`, que a su vez importa `UsersModule`.
`UsersModule`/`UsersService` son dueños de `UserEntity` (tabla `users`) y de todo el acceso a la
base; `AuthController`/`AuthService` son la única capa expuesta por HTTP — no hay un
`UsersController` separado (la gestión de usuarios se expone a través de rutas `/auth/*`:
`nuevo-usuario`, `listar-usuarios`, `dar-de-baja-usuario/:id`, `activar-usuario/:id`,
`updateUser/:id`, `foto`, `profile`).

**Productos y categorías** (`ProductsModule`/`CategoriesModule`, agregados sobre la base de auth):
- `CategoryEntity` (tabla `categories`): `idCategoria`, `nombre` (único), soft-delete. El ADMIN
  las crea/renombra/da de baja/reactiva libremente desde `CategoriesController`
  (`GET /categorias` público, resto `@Auth(Role.ADMIN)`) — a propósito no es un enum: así agregar
  una categoría nueva no requiere tocar código ni rebuildear ni el back ni el front.
- `ProductEntity` (tabla `products`): `nombre`, `descripcion`, `precio` (decimal con transformer a
  number — el driver de MySQL devuelve DECIMAL como string), `stock`, `imageFile` (mismo patrón
  que `UserEntity.imageFile`: solo el nombre de archivo, servido desde `/uploads/products/`) como
  **portada/imagen principal**, soft-delete, `categoria` como relación
  `@ManyToOne(() => CategoryEntity)` (FK `id_categoria`, nullable), y `creadoPor` como relación
  `@ManyToOne(() => UserEntity)` (FK `creado_por_id`, nullable) — quién cargó el producto, seteado
  una sola vez al crear (ver más abajo). `ProductsService` valida el `idCategoria` que manda el
  cliente contra una categoría real (`CategoriesService.findActivaByIdOrThrow`, 400 si no existe)
  — `ProductsModule` importa `CategoriesModule` para esto.
- **Galería de fotos** (`ProductImageEntity`, tabla `product_images`, agregada después de
  `imageFile`): un producto puede tener además **0 o más fotos adicionales**, cada una su propia
  fila (`id_producto_imagen`, `producto_id` FK a `products`, `image_file`, `created_at`) — se
  agregan/eliminan de a una, nunca se reemplazan todas juntas. Deliberadamente **no** reemplaza a
  `imageFile`: la portada sigue siendo `imageFile` con su mismo endpoint de siempre
  (`POST /productos/:id/imagen`, que la reemplaza); la galería es un mecanismo aparte y conviven
  los dos (menor radio de impacto: no rompe los 5 lugares del frontend que ya leían
  `imageUrl` como string único). Sin soft-delete en `ProductImageEntity` a propósito — no hay caso
  de uso de "restaurar una foto borrada", así que `eliminarFoto` borra la fila y el archivo del
  disco a la vez. **Migración de datos legacy**: como no hay sistema de migraciones en este
  proyecto (`synchronize: true`, ver más abajo), `ProductsService` implementa
  `OnApplicationBootstrap` y en cada arranque (`migrarImagenesLegacy`, idempotente) recorre los
  productos con `imageFile` no nulo y sin ninguna fila todavía en `product_images`, y les crea una
  — pero **duplicando el archivo** (nombre nuevo por UUID) en vez de referenciar el mismo nombre
  que `imageFile`: si compartieran archivo, un reemplazo posterior de la portada
  (`actualizarImagen`, que borra el archivo viejo del disco) dejaría la foto migrada apuntando a
  un archivo borrado. Con la copia, portada y galería quedan desacopladas para siempre desde el
  momento de la migración.
- **Permisos de `ProductsController`**: `GET /productos` y `GET /productos/:id` públicos
  (catálogo). `POST /productos` (crear), `POST /productos/:id/imagen` (subir/cambiar portada),
  `POST /productos/:id/fotos` (agregar una foto a la galería) y
  `DELETE /productos/:id/fotos/:idFoto` (eliminar una foto puntual de la galería, por su ID) son
  `@Auth(Role.ADMIN, Role.USER)` — el resto (`PATCH/DELETE /productos/:id`, `/activar`,
  `GET /productos/admin/listado`, `GET /productos/admin/:id`) sigue siendo `@Auth(Role.ADMIN)`
  exclusivo. Un USER puede cargar productos nuevos y subirles/agregarles/quitarles fotos, pero
  **no** editarlos, darlos de baja/reactivarlos, ni tocar categorías — ese límite no lo puede
  expresar el `RolesGuard` (no sabe de quién es cada producto), así que
  `ProductsService.actualizarImagen`/`agregarFoto`/`eliminarFoto` chequean a mano
  `product.creadoPor?.idUser === activeUser.idUser` cuando `activeUser.role !== Role.ADMIN`, y
  tiran `ForbiddenException` si no coincide — el chequeo es siempre sobre el dueño del *producto*,
  nunca sobre la foto en sí (`ProductImageEntity` no tiene su propio `creadoPor`). `ADMIN` no tiene
  esta restricción. `eliminarFoto` además valida que la foto (`idFoto`) pertenezca al producto
  (`:id`) de la URL — si no, 404, no solo 403 — para que un USER dueño de su propio producto no
  pueda borrar, adivinando el ID, una foto de un producto ajeno. Controller y service reciben el
  usuario activo vía `@ActiveUser()` (mismo decorador que usa `auth/`).
- `GET /productos`, `GET /productos/:id`, `GET /productos/admin/:id` y
  `GET /productos/mis-productos` devuelven `ProductResponseDto` con `imageUrl` (portada, como
  siempre) **y** `fotos: ProductImageResponseDto[]` (galería, siempre un array — vacío si no tiene
  fotos adicionales, nunca `undefined`).
- **Visibilidad del stock** (`ProductEntity.mostrarStock`, `boolean`, `default: true` — pedido
  explícito del usuario): el dueño de un producto puede elegir que el número de `stock` no se
  muestre a los clientes. La columna no cambia nada de la lógica de stock en sí, solo si las
  lecturas **públicas** revelan el número real: `ProductsService.toPublicResponseDto` envuelve a
  `toResponseDto` y devuelve `stock: null` en vez del número cuando `mostrarStock` es `false` — se
  usa en `findOneActivo` (`GET /productos/:id`) y en `buscarProductos` cuando
  `incluirInactivos: false` (`GET /productos`, es decir `findAllActivos`). Las vistas privilegiadas
  (`findAllAdmin`, `findMisProductos`, `findOneAdmin`, y la respuesta de cualquier mutación) siempre
  usan `toResponseDto` directo — ADMIN y el USER dueño del producto necesitan ver el stock real para
  gestionar su inventario, la preferencia solo afecta lo que ve un cliente anónimo. `mostrarStock`
  en sí viaja siempre con su valor real en el DTO, incluso en las respuestas públicas — no es dato
  sensible, y el frontend lo necesita para no confundir "stock null porque está oculto" con "stock
  0 porque no hay". `CreateProductDto`/`UpdateProductDto` aceptan `mostrarStock` opcional (si se
  omite, aplica el default de la columna). Como `PATCH /productos/:id` (el edit general) sigue
  siendo `@Auth(Role.ADMIN)` exclusivo, existe un endpoint dedicado
  `PATCH /productos/:id/visibilidad-stock` (`UpdateStockVisibilityDto`, body `{ mostrarStock }`)
  `@Auth(Role.ADMIN, Role.USER)` con el mismo chequeo de ownership que `actualizarImagen`/`activar` —
  así un USER puede tocar únicamente este campo en un producto propio sin que haga falta abrirle el
  PATCH general (que sigue dejando editar nombre/precio/etc. solo a ADMIN).
- `GET /productos/admin/:id` (ADMIN): a diferencia del `GET /productos/:id` público, sí devuelve
  productos dados de baja — lo usa la página de editar producto del frontend, que se puede cargar
  directo por URL (no solo navegando desde un listado que ya tiene los datos en memoria).
  Declarado DESPUÉS de `admin/listado` en el controller — misma forma de ruta
  (`admin/<segmento>`), así que si se invierte el orden Nest intentaría matchear "listado" como si
  fuera el `:id`.
- `GET /productos/mis-productos` (`@Auth(Role.ADMIN, Role.USER)`): los productos que el usuario
  activo cargó él mismo (`creadoPor.idUser === activeUser.idUser`), incluidos los dados de baja —
  mismo criterio que `admin/:id`, para que el dueño de un producto lo pueda encontrar y reactivar
  si lo dio de baja por error. Reutiliza `FindProductsQueryDto`/`PaginatedProductsResponseDto`
  (misma convención que `admin/listado`): `ProductsService.buscarProductos` ganó un tercer
  parámetro opcional `creadoPorId` que arma `where.creadoPor = { idUser: creadoPorId }`, en vez de
  duplicar la query. **Ojo con el orden de rutas**: `mis-productos` tiene la misma forma que el
  público `GET /productos/:id` (`productos/<segmento>`), así que está declarado ANTES de ese
  `:id` — mismo motivo que `admin/listado` vs `admin/:id`.
- `PATCH /productos/:id/activar` (reactivar) es `@Auth(Role.ADMIN, Role.USER)` — ADMIN puede
  reactivar cualquier producto; USER solo el que él mismo cargó (mismo chequeo de ownership que
  `actualizarImagen`: `product.creadoPor?.idUser === activeUser.idUser` cuando
  `activeUser.role !== Role.ADMIN`, `ForbiddenException` si no coincide). Editar
  (`PATCH /productos/:id`) y dar de baja (`DELETE /productos/:id`) siguen siendo
  `@Auth(Role.ADMIN)` exclusivo — **no** tienen el mismo tratamiento que `activar`/`actualizarImagen`,
  ojo con asumir que USER puede tocar cualquiera de las cuatro acciones "de su propio producto" por
  igual: solo puede crear, subir imagen y reactivar; nunca editar ni dar de baja.
- **Gotcha de TypeORM ya resuelto**: al soft-deletear una categoría, cualquier query con
  `relations: ['categoria']` que NO pida `withDeleted: true` filtra la fila relacionada del JOIN
  aunque el producto en sí siga activo — el producto terminaba mostrando `categoria: null` para el
  cliente público apenas alguien daba de baja su categoría. Se resuelve pidiendo siempre
  `withDeleted: true` en `ProductsService.buscarProductos`/`findOneActivo` y agregando el filtro de
  "solo activos" a mano con `where.deletedAt = IsNull()` — así dar de baja una categoría nunca
  rompe los productos que ya la tenían asignada, solo deja de ofrecerse para asignaciones nuevas.
- Ambos módulos siguen al pie la letra las mismas convenciones que `users`: soft-delete +
  `restore()` para dar de baja/reactivar, `handleServiceError` en cada catch, un logger de módulo
  propio en `module-loggers.ts` (`productsErrorLogger`, `categoriesErrorLogger`), y
  `insertLogger`/`updateLogger`/`deleteLogger` de `db-loggers.ts` después de cada mutación.

**CRUD de usuarios para ADMIN** (pedido explícito del usuario): además de lo que ya existía
(`POST /auth/nuevo-usuario` crear, `GET /auth/listar-usuarios` listar, `DELETE
/auth/dar-de-baja-usuario/:id` + `PATCH /auth/activar-usuario/:id` dar de baja/reactivar — los
cuatro `@Auth(Role.ADMIN)`, todos ya existían), se agregó `PATCH /auth/editar-usuario/:id`
(`@Auth(Role.ADMIN)`, `AdminUpdateUserDto`) — antes un ADMIN no tenía forma de editar los datos de
**otro** usuario: el único endpoint de edición (`PATCH /auth/updateUser/:id`, autoservicio) exige
que `:id` coincida con el propio usuario del JWT (`ForbiddenException` si no) y pide
`currentPassword` para confirmar. El nuevo `UsersService.actualizarUsuarioAdmin`
(`AdminUpdateUserDto`: `nickUsuario`/`nombre`/`apellido`/`email`/`role`/`password`, todos
opcionales) es deliberadamente distinto de `updateUser` (autoservicio, sin tocar): no pide
contraseña — ni la del usuario editado (el ADMIN no la conoce) ni la propia (el ADMIN ya está
autenticado por su JWT) — y además permite cambiar `role` y setear una `password` nueva
directamente, pensado para recuperar el acceso de un usuario que la perdió (no pasa por el flujo
de reset por email).

**Protección del último ADMIN** (pedido explícito del usuario, motivado por el CRUD de arriba: con
un panel que hace mucho más fácil dar de baja o cambiar el rol de cualquiera por error, hacía falta
esta protección que antes no existía): `UsersService.esUnicoAdminActivo()` (privado, cuenta
`role: ADMIN` con `.count()` sin `withDeleted:true` — ya excluye soft-deleted por default) se
consulta en dos lugares, siempre cuando el usuario en cuestión YA es `ADMIN` activo (si el conteo
da `<= 1` en ese momento, tiene que ser justo ese): `darDeBajaUsuario` (400 "No podés dar de baja al
único administrador activo") y `actualizarUsuarioAdmin` cuando `dto.role` cambia a algo distinto de
`ADMIN` (400 "No podés quitarle el rol de administrador al único administrador activo"). No hay
protección equivalente contra editar/dar de baja tu propia cuenta desde este panel siendo el único
ADMIN de otra forma que no sea cambiar el rol o darte de baja — ambas caen en los mismos chequeos.

**Identidad de login**: `nickUsuario`, no `email`, es el identificador de login — el email es
opcional y solo queda asociado a una cuenta la primera vez que se pide recuperar la contraseña
para esa cuenta (ver `AuthService.requestResetPassword`); una vez seteado, el flujo de reset ya no
lo pisa (el email existente en la cuenta siempre gana sobre el que llega en el pedido).

**Flujo de auth**: `@Auth(...roles)`
([auth.decorator.ts](src/auth/decorators/auth.decorator.ts)) es azúcar sintáctica para
`@Roles(...roles)` + `@UseGuards(AuthGuard, RolesGuard)`. `AuthGuard` verifica el JWT *y* además
vuelve a buscar el usuario en la base en cada request — esto es lo que hace que el token de un
usuario dado de baja deje de funcionar antes de que el JWT expire naturalmente (TypeORM excluye
las filas con soft-delete por default). `RolesGuard` deja pasar a un ADMIN sin importar qué roles
pida la ruta. Si la búsqueda en la base dentro de `AuthGuard` tira una `HttpException` que no es
`UnauthorizedException` (por ejemplo, la base caída), eso deliberadamente **no** se colapsa en un
401 genérico — solo se normalizan a 401 los fallos reales de verificación del JWT — así un blip de
infraestructura no aparenta ser "tu sesión es inválida" (ver el comentario largo en
[auth.guard.ts](src/auth/guard/auth.guard.ts)).

**Soft delete**: dar de baja a un usuario (`dar-de-baja-usuario`) es un soft-delete de TypeORM
(`deletedAt`), que se revierte con `activar-usuario` (`restore()`). Todo lo que necesite ver
usuarios dados de baja (listado de admin, reactivación, el chequeo de `AuthGuard` que rechaza
usuarios borrados) tiene que pasar `withDeleted: true` explícitamente — ver
`UsersService.getUserWithDeleted` / `findAllUsers`.

**Manejo de errores**: los servicios nunca dejan que una excepción cruda se propague — cada bloque
catch llama a `handleServiceError(error, logger, serviceName, defaultMessage, context?)`
([error-handler.util.ts](src/common/utils/error-handler.util.ts)), que loguea con el logger de
Winston que se le pase y relanza la `HttpException` que corresponda (deja pasar las
`HttpException` ya existentes, mapea un `QueryFailedError` de constraint único a 409, y todo lo
demás relacionado a TypeORM o desconocido a 500). Al agregar un método de servicio nuevo, seguí
este mismo patrón de try/catch + `handleServiceError` en vez de tirar excepciones directamente.

**Logging** está repartido en varios sets de loggers de Winston independientes, todos escribiendo
a `logs/`:
- [winston.config.ts](src/config/winston.config.ts): logger general de la app (`nest-winston`),
  alimenta `error.log` / la consola, se conecta como logger global de Nest en `main.ts` y lo usa
  `AllExceptionsFilter`.
- [module-loggers.ts](src/config/module-loggers.ts): un logger de errores dedicado por módulo de
  feature (`authErrorLogger`, `usersErrorLogger`) que escribe a
  `logs/<modulo>-errors-*.txt` con rotación diaria (retención de 60 días) — es lo que se le pasa a
  `handleServiceError`. Módulo nuevo = agregar una llamada a
  `buildModuleErrorLogger('nombreDelModulo')` acá.
- [db-loggers.ts](src/config/db-loggers.ts): loggers de auditoría de base de datos transversales,
  por *tipo de operación* (`insertLogger`, `updateLogger`, `deleteLogger`, `selectLogger`),
  también con rotación diaria en `logs/{inserts,updates,deletes,selects}-*.txt`. Se llaman
  explícitamente en cada lugar donde corresponda, después de que una mutación/consulta tuvo éxito
  (no es automático) — por ejemplo `insertLogger.info(...)` después de un registro exitoso.
  **Nunca loguear secretos**: las actualizaciones de password/token loguean qué campos cambiaron o
  que se generó un token, nunca los valores en sí (ver `UsersService.updateUser`,
  `updateTokenResetPassword`).

**Respuestas a tiempo constante**: los handlers de login y de pedido de reset de contraseña
acolchan (padding) el tiempo de respuesta a un piso mínimo (`padToMinDuration`, en bloques
`finally`) para que "el usuario no existe" no responda notoriamente más rápido que "contraseña
incorrecta" o el envío real de un mail — ver las constantes y los comentarios al principio de
[auth.service.ts](src/auth/auth.service.ts). Es una mitigación deliberada y parcial (el propio
código documenta que no cierra del todo el oráculo de tiempos contra un atacante paciente que
promedie muchas mediciones) — si tocás estos métodos, mantené el padding en el `finally` (no en
cada return/throw individual), para que ningún return/throw nuevo pueda saltearlo sin querer.

**Subida de archivos** (avatares de usuario e imágenes de producto): se sirve como estático desde
`/uploads` (montado en `main.ts` *antes* del prefijo global `tienda/v1`, así que las URLs quedan
como `/uploads/avatars/<uuid>.<ext>` o `/uploads/products/<uuid>.<ext>` sin prefijo). La extensión
del archivo subido siempre se deriva del mimetype ya validado
([avatar-upload.config.ts](src/common/upload/avatar-upload.config.ts),
[product-image-upload.config.ts](src/common/upload/product-image-upload.config.ts) — mismo
mecanismo, mismos mimetypes aceptados, carpeta de destino distinta), nunca del nombre de archivo
que manda el cliente, para evitar que se cuele una extensión tipo `.php` a través del nombre de
archivo.

**Cuidado al limpiar `uploads/`**: es una carpeta compartida entre datos de prueba y datos reales
— nunca correr un borrado por glob amplio ahí (`rm uploads/products/*.png`, etc.). Un borrado así
se llevó puesta la imagen real de un producto real durante una sesión de pruebas. Borrar siempre
por nombre de archivo específico (el que devolvió el upload/el que tiene el producto en la base
antes de reemplazarlo), nunca por patrón.

**Prefijo de la API**: todas las rutas quedan montadas bajo `tienda/v1`
(`app.setGlobalPrefix` en [main.ts](src/main.ts)) excepto el mount estático de `/uploads`, que
queda deliberadamente afuera de ese prefijo.

**Alias de paths**: `@/*` mapea a `src/*` (ver `tsconfig.json` y el `moduleNameMapper` de Jest) —
usalo para imports entre módulos en vez de rutas relativas `../../`, siguiendo el estilo del
código existente.

**Validación**: `ValidationPipe` global con `whitelist: true` + `forbidNonWhitelisted: true` — los
DTOs tienen que declarar cada campo que aceptan con decoradores de `class-validator`/
`class-transformer`; los campos no declarados en el body de un request se rechazan, no se
descartan en silencio.
