import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategoriesService, getProductsService } from '@/services';
import { Category, Product } from '@/interfaces';
import { getErrorMessage, apiOrigin } from '@/utilities';
import { Button } from '@/components/ui';
import { InputBuscarProductos } from '@/components/ProductSearch/InputBuscarProductos';
import { ProductDetailModal } from './ProductDetailModal';

const PAGE_SIZE = 12;

function formatPrice(precio: number): string {
  return `$${precio.toFixed(2)}`;
}

// pill de categoría — activa (bg-brand llena) vs. en reposo (borde fino,
// se resalta al pasar el mouse). Un solo estado visual "seleccionado",
// nada de sombras/degradés de por medio.
function pillClass(active: boolean): string {
  return `shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
    active
      ? 'bg-brand border-brand text-white'
      : 'bg-white border-line text-ink/70 hover:border-brand hover:text-brand'
  }`;
}

/** Catálogo público de la tienda — no requiere login (ver GET /productos
 * en el backend, sin @Auth). Es la home del sitio (montada en '/' en
 * App.tsx).
 *
 * Estructura de página inspirada en cómo Mercado Libre arma su home
 * (franja de marca arriba con el buscador, banda de hero grande debajo,
 * categorías, sección de listado con título) — pedido explícito del
 * usuario, "en la forma de mostrar todo por pantalla", sin copiar
 * colores. A propósito NO tiene nada de lo que ML sí muestra pero acá
 * sería inventado (badges de "% OFF", "Envío gratis", cuotas): el modelo
 * de datos de este proyecto no tiene precio de oferta ni política de
 * envío en ningún lado — mostrar eso sería mentirle a un cliente real.
 * Paleta y tipografía propias (ver index.css, tokens
 * font-catalog/ink/canvas/line/brand), pensadas para un bazar/juguetería
 * que vende de todo. El resto del sitio (Header, Admin, Profile) no se
 * tocó — estos tokens solo los usa esta página. */
function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // null = modal cerrado. Guarda el Product completo (no solo el id) para
  // no tener que volver a pedirlo — ver ProductDetailModal.tsx.
  const [productoSeleccionado, setProductoSeleccionado] = useState<Product | null>(null);

  // categorías para el filtro — se cargan una sola vez
  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const data = await getCategoriesService();
        if (!cancelado) setCategories(data);
      } catch {
        // el filtro de categorías es un extra, no bloquea el catálogo si
        // falla — el error real de productos ya se muestra abajo.
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getProductsService({
          search: search || undefined,
          categoriaId: categoriaId ? Number(categoriaId) : undefined,
          page,
          limit: PAGE_SIZE,
        });

        if (cancelado) return;
        setProducts(data.items);
        setTotal(data.total);
      } catch (err) {
        if (!cancelado) setError(getErrorMessage(err));
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [search, categoriaId, page]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleCategoriaChange = (value: string) => {
    setPage(1);
    setCategoriaId(value);
  };

  // pills de categoría (sin "Todo", que queda fijo aparte) — se renderiza
  // dos veces dentro de la cinta de la marquesina para el loop continuo
  // (ver el JSX más abajo). `decorativa` es la segunda copia: no debe
  // quedar alcanzable por teclado ni anunciarse a un lector de pantalla,
  // ya que es visualmente idéntica a la primera y hace exactamente lo
  // mismo — sin esto, tabular por la página pasaría dos veces por cada
  // categoría.
  const renderCategoriaPills = (decorativa = false) =>
    categories.map((category) => (
      <button
        key={category.idCategoria}
        type="button"
        onClick={() => handleCategoriaChange(String(category.idCategoria))}
        className={pillClass(categoriaId === String(category.idCategoria))}
        aria-hidden={decorativa || undefined}
        tabIndex={decorativa ? -1 : undefined}
      >
        {category.nombre}
      </button>
    ));

  // seleccionar un resultado del buscador en vivo va directo a ese
  // producto (mismo criterio que el submit del botón "Buscar", pero sin
  // esperar a que el usuario lo confirme).
  const handleSelectProducto = (producto: Product) => {
    setPage(1);
    setSearch(producto.nombre);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-canvas font-catalog">
      {/* franja de marca — full-bleed a propósito (rompe el max-w-6xl del
          resto), mismo lugar que ocupa la barra superior de ML: nombre +
          buscador siempre visibles antes de cualquier otra cosa, sin
          tener que bajar la página. */}
      <div className="bg-brand">
        {/* flex-wrap + justify-between: en mobile el buscador (basis-full)
            fuerza su propia fila abajo, "Catálogo"/"Contacto" quedan
            arriba — apretarlos los tres en una sola fila angosta dejaba
            el input del buscador casi ilegible. En sm+ entran los tres en
            una fila (el buscador ocupa el espacio libre, flex-1). */}
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 sm:gap-6">
          <span className="order-1 shrink-0 text-lg font-extrabold text-white tracking-tight">
            Catálogo
          </span>

          {/* Catalog es la home del sitio — para un visitante anónimo es
              el único lugar del que puede salir la página de contacto,
              ver App.tsx (Header no muestra ningún menú sin sesión). */}
          <Link
            to="/contacto"
            className="order-2 sm:order-3 shrink-0 text-sm font-medium text-white/90 hover:text-white"
          >
            Contacto
          </Link>

          <form
            onSubmit={handleSearchSubmit}
            className="order-3 sm:order-2 basis-full sm:basis-0 sm:flex-1 flex gap-2 min-w-0"
          >
            <InputBuscarProductos
              keyword={searchInput}
              setKeyword={setSearchInput}
              onSelectProducto={handleSelectProducto}
              className="flex-1 min-w-0"
            />
            <Button type="submit" variant="secondary" className="shrink-0">
              Buscar
            </Button>
          </form>
        </div>
      </div>

      {/* hero — la única banda de color fuerte de la página (mismo
          criterio que el plan de diseño: "spend your boldness in one
          place"), con el único texto de marca que se anima a afirmar
          algo: qué vende este negocio, en criollo, sin inventar ofertas.
          La textura de puntos (capa decorativa, aparte del degradé de
          marca) es lo que la diferencia de un banner-gradiente genérico —
          evoca la variedad de un bazar sin depender de una foto. */}
      <div className="relative overflow-hidden bg-linear-to-br from-brand to-brand-dark">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 py-10 sm:py-14">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight max-w-md">
            Bazar y juguetería
          </h1>
          <p className="mt-2 text-white/80 max-w-sm">
            Encontrá de todo un poco: juguetes, cuadernos, y lo que se te ocurra.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* pills de categoría: filtran al toque, sin pasar por el botón
            "Buscar" (mismo comportamiento inmediato que ya tenía el
            <select> que reemplazan). "Todo" queda fijo, afuera de la
            cinta — pedido explícito del usuario, mismo criterio de
            usabilidad que un carrusel bien hecho: el filtro "sin filtro"
            tiene que estar siempre a mano, no yéndose de pantalla. El
            resto se mueve solo (marquesina) — con el contenido duplicado
            x2 adentro para que el loop sea continuo sin salto (ver
            index.css, @keyframes catalog-marquee). Se pausa al pasar el
            mouse o el foco de teclado (si no, sería imposible clickear
            una categoría puntual mientras se desliza), y si el sistema
            tiene "reducir movimiento" activado, no anima nada y vuelve al
            scroll manual de siempre (motion-reduce:*). */}
        <div className="flex items-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => handleCategoriaChange('')}
            className={`${pillClass(categoriaId === '')} shrink-0`}
          >
            Todo
          </button>

          <div className="flex-1 min-w-0 overflow-hidden motion-reduce:overflow-x-auto">
            <div className="flex w-max gap-2 animate-catalog-marquee hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] motion-reduce:animate-none">
              <div className="flex shrink-0 gap-2">{renderCategoriaPills()}</div>
              {/* copia decorativa, solo para que el loop no se note — los
                  lectores de pantalla y la navegación por teclado la
                  saltean (aria-hidden + tabIndex=-1 en cada pill, ver
                  renderCategoriaPills). Oculta del todo si no hay
                  animación (reducir movimiento), para no mostrar cada
                  categoría dos veces en ese caso. */}
              <div className="flex shrink-0 gap-2 motion-reduce:hidden" aria-hidden="true">
                {renderCategoriaPills(true)}
              </div>
            </div>
          </div>
        </div>

        {/* título de sección real (no un eyebrow decorativo): separa la
            banda de marca/hero de arriba del listado en sí, mismo rol
            que cumple "Ofertas" en la home de ML. */}
        <h2 className="text-lg font-bold text-ink mb-3">Todos los productos</h2>

        {loading && <p className="text-ink/60">Cargando...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && products.length === 0 && (
          <p className="text-ink/60">No hay productos para mostrar.</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {products.map((product) => (
            <button
              key={product.idProducto}
              type="button"
              onClick={() => setProductoSeleccionado(product)}
              className="group flex flex-col text-left bg-white border border-line rounded-xl overflow-hidden transition-all hover:border-brand hover:shadow-[0_8px_24px_-12px_rgba(22,35,61,0.25)] cursor-pointer"
            >
              <div className="aspect-square bg-canvas flex items-center justify-center overflow-hidden">
                {product.imageUrl ? (
                  // object-contain (no object-cover): se ve la imagen
                  // completa sin recortarla para llenar la caja a la
                  // fuerza — mismo criterio que ProductDetailModal.tsx.
                  <img
                    src={`${apiOrigin}${product.imageUrl}`}
                    alt={product.nombre}
                    className="h-full w-full object-contain p-3 transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                ) : (
                  <span className="text-ink/30 text-sm">Sin imagen</span>
                )}
              </div>

              <div className="p-3 flex-1 flex flex-col gap-1.5">
                {product.categoria && (
                  <span className="self-start rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink/60">
                    {product.categoria.nombre}
                  </span>
                )}

                <h2 className="text-sm font-medium text-ink leading-snug line-clamp-2 min-h-[2.5em]">
                  {product.nombre}
                </h2>

                {/* el precio es el elemento más pesado de la card a
                    propósito — es lo primero que alguien busca al
                    escanear una grilla con productos de rubros
                    completamente distintos entre sí. */}
                <p className="mt-auto text-lg font-extrabold text-brand tabular-nums">
                  {formatPrice(product.precio)}
                </p>

                {/* stock === null: el dueño eligió no mostrarlo (ver
                    Product.mostrarStock) — no es lo mismo que stock === 0
                    (sin stock real). Solo se muestra la línea cuando hay
                    algo que decir (oculto o sin stock) — con stock normal
                    no suma nada que alguien necesite ver en la grilla. */}
                {product.stock === null ? (
                  <span className="flex items-center gap-1.5 text-xs text-ink/50">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                    Consultar disponibilidad
                  </span>
                ) : (
                  product.stock === 0 && (
                    <span className="flex items-center gap-1.5 text-xs text-red-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      Sin stock
                    </span>
                  )
                )}
              </div>
            </button>
          ))}
        </div>

        <ProductDetailModal
          product={productoSeleccionado}
          onClose={() => setProductoSeleccionado(null)}
        />

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm text-ink/60 tabular-nums">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Catalog;
