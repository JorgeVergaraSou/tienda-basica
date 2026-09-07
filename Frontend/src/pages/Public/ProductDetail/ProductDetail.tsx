import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProductService } from '@/services';
import { Product } from '@/interfaces';
import { getErrorMessage, apiOrigin } from '@/utilities';

function formatPrice(precio: number): string {
  return `$${precio.toFixed(2)}`;
}

/** Detalle público de un producto — sin login (ver GET /productos/:id en
 * el backend, sin @Auth). Se llega acá haciendo click en una tarjeta del
 * catálogo (Catalog.tsx). Si el producto no existe o está dado de baja,
 * el backend responde 404 y se muestra como cualquier otro error. */
function ProductDetail() {
  const { id } = useParams<{ id: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;

    (async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getProductService(Number(id));
        if (!cancelado) setProduct(data);
      } catch (err) {
        if (!cancelado) setError(getErrorMessage(err));
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [id]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/" className="text-blue-600 hover:underline text-sm">
        ← Volver al catálogo
      </Link>

      {loading && <p className="mt-4">Cargando...</p>}
      {error && <p className="text-red-600 mt-4">{error}</p>}

      {product && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="h-80 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
            {product.imageUrl ? (
              <img
                src={`${apiOrigin}${product.imageUrl}`}
                alt={product.nombre}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-gray-400">Sin imagen</span>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-semibold">{product.nombre}</h1>

            {product.categoria && (
              <p className="text-sm text-gray-500 mt-1">{product.categoria.nombre}</p>
            )}

            <p className="text-2xl font-bold mt-4">{formatPrice(product.precio)}</p>

            {product.stock === 0 ? (
              <p className="text-red-600 mt-1">Sin stock</p>
            ) : (
              <p className="text-gray-600 mt-1">Stock disponible: {product.stock}</p>
            )}

            {product.descripcion && (
              <p className="mt-4 text-gray-700 whitespace-pre-line">{product.descripcion}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDetail;
