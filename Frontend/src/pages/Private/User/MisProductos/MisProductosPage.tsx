import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import {
  activateProductService,
  getMisProductosService,
  updateStockVisibilityService,
} from '@/services';
import { Product } from '@/interfaces';
import { getErrorMessage, apiOrigin } from '@/utilities';
import { showError } from '@/utilities/alerts/alert.utils';
import { Button } from '@/components/ui';

/** Productos que el usuario logueado cargó él mismo (ADMIN o USER),
 * incluidos los dados de baja — GET /productos/mis-productos. A
 * diferencia del panel de ADMIN (Admin/Products/ProductsListPage.tsx),
 * esta vista NO tiene "Editar" ni "Dar de baja": el backend solo le
 * permite a USER crear, subir imagen, reactivar y tocar la visibilidad
 * del stock de sus propios productos (ver ProductsController — editar y
 * dar de baja siguen siendo @Auth(Role.ADMIN) exclusivo). "Reactivar" y
 * el check de "Mostrar stock" están disponibles porque
 * ProductsService.activarProducto/actualizarVisibilidadStock aceptan
 * USER cuando el producto es suyo (mismo criterio que actualizarImagen).
 * Esta vista siempre ve el stock real (nunca null, ver
 * Product.mostrarStock) — el que puede llegar null es el que ve el
 * cliente en el catálogo/detalle público. */
function MisProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      setLoading(true);
      setListError('');

      try {
        const data = await getMisProductosService({ limit: 50 });
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
  }, [reloadToken]);

  const handleReactivar = async (product: Product) => {
    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: 'Reactivar producto',
      text: `¿Confirmás reactivar "${product.nombre}"?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, reactivar',
      cancelButtonText: 'Cancelar',
    });

    if (!isConfirmed) {
      return;
    }

    try {
      await activateProductService(product.idProducto);
      setReloadToken((token) => token + 1);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  };

  const handleToggleMostrarStock = async (product: Product) => {
    try {
      await updateStockVisibilityService(product.idProducto, !product.mostrarStock);
      setReloadToken((token) => token + 1);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Mis productos</h2>

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
              <th className="py-2">Mostrar stock</th>
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
                {/* siempre el número real acá (esta vista nunca lo oculta,
                    ver Product.mostrarStock) — ?? 0 es solo para
                    satisfacer el tipo number | null compartido con las
                    vistas públicas, nunca debería pasar en la práctica. */}
                <td className="py-2">{product.stock ?? 0}</td>
                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={product.mostrarStock}
                    onChange={() => handleToggleMostrarStock(product)}
                    aria-label={`Mostrar stock a los clientes de ${product.nombre}`}
                    className="cursor-pointer"
                  />
                </td>
                <td className="py-2">
                  {product.deletedAt ? (
                    <span className="text-red-600">Inactivo</span>
                  ) : (
                    <span className="text-green-600">Activo</span>
                  )}
                </td>
                <td className="py-2">
                  {product.deletedAt && (
                    <Button variant="secondary" onClick={() => handleReactivar(product)}>
                      Reactivar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && products.length === 0 && (
          <p className="mt-4">Todavía no cargaste ningún producto.</p>
        )}
      </div>
    </div>
  );
}

export default MisProductosPage;
