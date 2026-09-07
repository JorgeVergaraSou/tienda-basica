import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  activateProductService,
  deactivateProductService,
  getAdminProductsService,
} from '@/services';
import { Product } from '@/interfaces';
import { PrivateRoutes } from '@/models';
import { getErrorMessage, apiOrigin } from '@/utilities';
import { showError } from '@/utilities/alerts/alert.utils';
import { Button } from '@/components/ui';
import { InputBuscarProductos } from '@/components/ProductSearch/InputBuscarProductos';

/** Listado de productos del panel admin — separado de "nuevo producto"
 * (Products/ProductFormPage.tsx en modo creación) y de "categorías"
 * (Categories/CategoriesPage.tsx). "Editar" navega a su propia página en
 * vez de abrir un form inline acá mismo. */
function ProductsListPage() {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelado = false;

    (async () => {
      setLoading(true);
      setListError('');

      try {
        const data = await getAdminProductsService({
          search: search || undefined,
          limit: 50,
        });

        if (!cancelado) setProducts(data.items);
      } catch (error) {
        if (!cancelado) setListError(getErrorMessage(error));
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [search, reloadToken]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  // seleccionar un resultado del buscador en vivo salta directo a
  // editarlo, sin pasar por el submit del botón "Buscar".
  const handleSelectProducto = (producto: Product) => {
    navigate(`/${PrivateRoutes.ADMIN}/productos/${producto.idProducto}/editar`);
  };

  const handleToggleActive = async (product: Product) => {
    const estaActivo = !product.deletedAt;

    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: estaActivo ? 'Dar de baja producto' : 'Reactivar producto',
      text: `¿Confirmás ${estaActivo ? 'dar de baja a' : 'reactivar'} "${product.nombre}"?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
    });

    if (!isConfirmed) {
      return;
    }

    try {
      if (estaActivo) {
        await deactivateProductService(product.idProducto);
      } else {
        await activateProductService(product.idProducto);
      }
      setReloadToken((token) => token + 1);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Productos</h2>
        <Button onClick={() => navigate(`/${PrivateRoutes.ADMIN}/productos/nuevo`)}>
          + Nuevo producto
        </Button>
      </div>

      <form onSubmit={handleSearchSubmit} className="mb-4 flex gap-2">
        <InputBuscarProductos
          keyword={searchInput}
          setKeyword={setSearchInput}
          onSelectProducto={handleSelectProducto}
          admin
          className="flex-1"
        />
        <Button type="submit" variant="secondary">Buscar</Button>
      </form>

      {loading && <p>Cargando...</p>}
      {listError && <p className="text-red-600">{listError}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="py-2">Imagen</th>
              <th className="py-2">Nombre</th>
              <th className="py-2">Categoría</th>
              <th className="py-2">Precio</th>
              <th className="py-2">Stock</th>
              <th className="py-2">Estado</th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.idProducto} className="border-b border-gray-100">
                <td className="py-2">
                  {product.imageUrl ? (
                    <img
                      src={`${apiOrigin}${product.imageUrl}`}
                      alt={product.nombre}
                      className="h-12 w-12 object-cover rounded-md"
                    />
                  ) : (
                    <span className="text-gray-400 text-xs">Sin imagen</span>
                  )}
                </td>
                <td className="py-2">{product.nombre}</td>
                <td className="py-2">{product.categoria?.nombre ?? '—'}</td>
                <td className="py-2">${product.precio.toFixed(2)}</td>
                <td className="py-2">{product.stock}</td>
                <td className="py-2">
                  {product.deletedAt ? (
                    <span className="text-red-600">Inactivo</span>
                  ) : (
                    <span className="text-green-600">Activo</span>
                  )}
                </td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        navigate(`/${PrivateRoutes.ADMIN}/productos/${product.idProducto}/editar`)
                      }
                    >
                      Editar
                    </Button>
                    <Button variant="secondary" onClick={() => handleToggleActive(product)}>
                      {product.deletedAt ? 'Reactivar' : 'Dar de baja'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && products.length === 0 && (
          <p className="mt-4">No hay productos para mostrar.</p>
        )}
      </div>
    </div>
  );
}

export default ProductsListPage;
