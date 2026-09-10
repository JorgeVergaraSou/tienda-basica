import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategoriesService, getProductsService } from '@/services';
import { Category, Product } from '@/interfaces';
import { getErrorMessage, apiOrigin } from '@/utilities';
import { Button } from '@/components/ui';
import { InputBuscarProductos } from '@/components/ProductSearch/InputBuscarProductos';
import { ProductDetailModal } from '@/pages/Public/Catalog/ProductDetailModal';

const PAGE_SIZE = 12;

function formatPrice(precio: number): string {
  return `$${precio.toFixed(2)}`;
}

// filtro de categoría como lista de texto, no pill/sidebar/pestaña (los
// otros 3 catálogos ya usan esas tres formas) — la activa se marca en
// itálica + color de acento, apoyada en que acá SÍ hay una fuente serif
// con itálica de verdad (Fraunces), no un truco visual aparte.
function categoriaLinkClass(active: boolean): string {
  return `text-sm cursor-pointer transition-colors ${
    active ? 'italic text-c4-accent font-medium' : 'text-c4-ink/60 hover:text-c4-ink'
  }`;
}

/** Cuarto diseño de catálogo — mismos datos y mismo backend que los otros
 * tres (GET /productos, GET /categorias, sin auth), identidad "vidriera
 * boutique": casi blanco + tinta + verde esmeralda (paleta propia, ver
 * index.css — ningún otro catálogo usa verde), serif con carácter
 * (Fraunces) solo para títulos y nombres de producto, sin banner-degradé
 * ni cards redondeadas/con sombra — separadas por una línea fina, mucho
 * aire alrededor de la imagen. Registrado en src/catalogs/catalogs.config.ts,
 * montado en '/catalog4' (ver App.tsx).
 *
 * Sin carrito: este proyecto no tiene checkout/pagos en ningún lado (ver
 * Backend/CLAUDE.md) — la acción sobre cada card es "ver detalle", igual
 * que Catalog.tsx/Catalog2.tsx/Catalog3.tsx, reutilizando el mismo
 * ProductDetailModal en vez de inventar un flujo de compra que no existe.
 * Tampoco tiene badges de descuento/cuotas/envío — mismo criterio que ya
 * documentan los otros 3: el modelo de datos no los respalda. */
function Catalog4() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<Product | null>(null);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const data = await getCategoriesService();
        if (!cancelado) setCategories(data);
      } catch {
        // el filtro de categorías es un extra — no bloquea el catálogo si
        // falla (mismo criterio que los otros 3 catálogos).
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

  const handleSelectProducto = (producto: Product) => {
    setPage(1);
    setSearch(producto.nombre);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-c4-bg text-c4-ink">
      {/* barra superior mínima — sin bloque de color, a diferencia de los
          otros 3 catálogos: acá la marca se afirma con tipografía, no con
          una franja/hero de color fuerte. */}
      <div className="border-b border-c4-line">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center gap-4 sm:gap-8">
          <Link
            to="/"
            className="order-1 shrink-0 text-sm text-c4-ink/50 hover:text-c4-ink transition-colors"
          >
            ← Catálogos
          </Link>

          <span className="order-2 shrink-0 font-catalog4-display italic text-lg font-semibold tracking-tight">
            Tienda Básica
          </span>

          <Link
            to="/contacto"
            className="order-3 sm:order-4 ml-auto sm:ml-0 shrink-0 text-sm text-c4-ink/60 hover:text-c4-ink transition-colors"
          >
            Contacto
          </Link>

          <form
            onSubmit={handleSearchSubmit}
            className="order-4 sm:order-3 basis-full sm:basis-0 sm:flex-1 flex items-end gap-3 min-w-0"
          >
            <InputBuscarProductos
              keyword={searchInput}
              setKeyword={setSearchInput}
              onSelectProducto={handleSelectProducto}
              placeholder="Buscar en el catálogo"
              className="flex-1 min-w-0 [&_input]:border-0 [&_input]:border-b-2 [&_input]:border-c4-line [&_input]:rounded-none [&_input]:bg-transparent [&_input]:px-0.5 [&_input]:pb-1 [&_input]:text-sm [&_input]:placeholder:text-c4-ink/35 [&_input]:focus:outline-none [&_input]:focus:border-c4-accent [&_input]:focus:ring-0"
            />
            <button
              type="submit"
              className="shrink-0 pb-1 text-sm font-medium text-c4-ink/70 hover:text-c4-accent transition-colors cursor-pointer border-b-2 border-transparent hover:border-c4-accent"
            >
              Buscar
            </button>
          </form>
        </div>
      </div>

      {/* apertura editorial — el único momento de la página que se anima
          a afirmar algo de la tienda, sin banner de color ni imagen
          inventada: la tipografía sola hace el trabajo. */}
      <div className="max-w-5xl mx-auto px-4 pt-14 pb-10 sm:pt-20 sm:pb-14">
        <h1 className="font-catalog4-display text-4xl sm:text-5xl font-semibold tracking-tight max-w-xl">
          Bazar y juguetería
        </h1>
        <p className="mt-4 text-c4-ink/60 max-w-md leading-relaxed">
          De todo un poco, para mirar con calma: juguetes, cuadernos, y lo que se te ocurra.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-16 sm:pb-24">
        {/* filtro de categoría — lista de texto, no pill/sidebar/pestaña.
            "Todas" fija primera, mismo criterio de "el filtro sin filtro
            siempre a mano" que ya usan los otros 3. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-10 pb-6 border-b border-c4-line">
          <button
            type="button"
            onClick={() => handleCategoriaChange('')}
            className={categoriaLinkClass(categoriaId === '')}
          >
            Todas
          </button>
          {categories.map((category) => (
            <button
              key={category.idCategoria}
              type="button"
              onClick={() => handleCategoriaChange(String(category.idCategoria))}
              className={categoriaLinkClass(categoriaId === String(category.idCategoria))}
            >
              {category.nombre}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-c4-ink/50">Cargando…</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}

        {!loading && !error && products.length === 0 && (
          <p className="text-sm text-c4-ink/50">No hay productos para mostrar.</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12 sm:gap-x-8">
          {products.map((product) => (
            <button
              key={product.idProducto}
              type="button"
              onClick={() => setProductoSeleccionado(product)}
              className="group flex flex-col text-left cursor-pointer"
            >
              {/* aspect-[4/5]: portrait, no cuadrado — trato más
                  editorial/fashion que la grilla cuadrada de los otros 3.
                  Sin borde/sombra/redondeo: solo la imagen, con aire
                  alrededor. */}
              <div className="aspect-[4/5] bg-[#f3f2ef] flex items-center justify-center overflow-hidden">
                {product.imageUrl ? (
                  <img
                    src={`${apiOrigin}${product.imageUrl}`}
                    alt={product.nombre}
                    className="h-full w-full object-contain p-6 transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <span className="text-c4-ink/25 text-sm">Sin imagen</span>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-1">
                {product.categoria && (
                  <span className="text-xs italic text-c4-ink/45">
                    {product.categoria.nombre}
                  </span>
                )}
                <h2 className="font-catalog4-display text-base font-medium leading-snug line-clamp-2">
                  {product.nombre}
                </h2>
                <p className="text-sm font-semibold text-c4-accent tabular-nums">
                  {formatPrice(product.precio)}
                </p>

                {product.stock === null ? (
                  <span className="text-xs text-c4-ink/45">Consultar disponibilidad</span>
                ) : (
                  product.stock === 0 && <span className="text-xs text-red-700">Sin stock</span>
                )}

                <span className="mt-1.5 self-start text-xs font-medium text-c4-ink/50 border-b border-transparent group-hover:border-c4-accent group-hover:text-c4-accent transition-colors">
                  Ver detalle
                </span>
              </div>
            </button>
          ))}
        </div>

        <ProductDetailModal
          product={productoSeleccionado}
          onClose={() => setProductoSeleccionado(null)}
        />

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-16">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm text-c4-ink/50 tabular-nums">
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

export default Catalog4;
