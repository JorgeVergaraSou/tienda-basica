import { useEffect, useState } from 'react';
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

/** Catálogo público de la tienda — no requiere login (ver GET /productos
 * en el backend, sin @Auth). Es la home del sitio (montada en '/' en
 * App.tsx). */
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

  // seleccionar un resultado del buscador en vivo va directo a ese
  // producto (mismo criterio que el submit del botón "Buscar", pero sin
  // esperar a que el usuario lo confirme).
  const handleSelectProducto = (producto: Product) => {
    setPage(1);
    setSearch(producto.nombre);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Catálogo</h1>

      <form onSubmit={handleSearchSubmit} className="mb-6 flex gap-2">
        <InputBuscarProductos
          keyword={searchInput}
          setKeyword={setSearchInput}
          onSelectProducto={handleSelectProducto}
          className="flex-1"
        />
        <select
          value={categoriaId}
          onChange={(e) => handleCategoriaChange(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category.idCategoria} value={category.idCategoria}>
              {category.nombre}
            </option>
          ))}
        </select>
        <Button type="submit">Buscar</Button>
      </form>

      {loading && <p>Cargando...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && products.length === 0 && (
        <p>No hay productos para mostrar.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <button
            key={product.idProducto}
            type="button"
            onClick={() => setProductoSeleccionado(product)}
            className="border border-gray-200 rounded-md overflow-hidden flex flex-col hover:shadow-md transition-shadow text-left cursor-pointer"
          >
            <div className="h-40 bg-gray-100 flex items-center justify-center">
              {product.imageUrl ? (
                // object-contain (no object-cover, mismo criterio que
                // ProductDetailModal.tsx): se ve la imagen completa sin
                // recortarla para llenar la caja a la fuerza.
                <img
                  src={`${apiOrigin}${product.imageUrl}`}
                  alt={product.nombre}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-gray-400 text-sm">Sin imagen</span>
              )}
            </div>
            <div className="p-3 flex-1 flex flex-col">
              <h2 className="font-medium">{product.nombre}</h2>
              {product.categoria && (
                <span className="text-xs text-gray-500">{product.categoria.nombre}</span>
              )}
              <p className="mt-auto font-semibold">{formatPrice(product.precio)}</p>
              {/* stock === null: el dueño eligió no mostrarlo (ver
                  Product.mostrarStock) — no es lo mismo que stock === 0
                  (sin stock real). */}
              {product.stock === null ? (
                <span className="text-xs text-gray-500">Consultar disponibilidad</span>
              ) : (
                product.stock === 0 && (
                  <span className="text-xs text-red-600">Sin stock</span>
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
        <div className="flex justify-center items-center gap-4 mt-6">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span>
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
  );
}

export default Catalog;
