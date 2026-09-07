import { useState } from 'react';
import { DialogTitle } from '@headlessui/react';
import { Modal } from '@/components/ui';
import { Product } from '@/interfaces';
import { apiOrigin } from '@/utilities';

function formatPrice(precio: number): string {
  return `$${precio.toFixed(2)}`;
}

interface ProductDetailModalProps {
  /** null = cerrado. Se le pasa el Product que Catalog.tsx ya tiene en
   * memoria (la lista de GET /productos ya trae descripcion/imageUrl/fotos
   * completos) — a diferencia de la vieja página de detalle
   * (pages/Public/ProductDetail/ProductDetail.tsx, que sigue existiendo
   * para acceso directo por URL, ver Frontend/CLAUDE.md), este modal no
   * repite el fetch. */
  product: Product | null;
  onClose: () => void;
}

/** Detalle de un producto del catálogo, en modal — reemplaza la
 * navegación a /productos/:id al clickear una tarjeta (ver Catalog.tsx).
 * Galería simple: miniaturas + foto grande seleccionada (no carrusel), la
 * portada (imageUrl) va primero seguida de las fotos adicionales
 * (product.fotos) — un solo array armado acá, sin tocar el backend. */
export function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // el índice seleccionado se resetea cada vez que cambia el producto —
  // si no, al pasar de un producto con 5 fotos a uno con 1 sola podría
  // quedar apuntando a un índice que ya no existe. Ajustar el estado
  // durante el render (en vez de un useEffect) es el patrón que recomienda
  // React para "resetear un estado cuando cambia una prop" sin disparar un
  // render en cascada (ver react-hooks/set-state-in-effect).
  const [productoAnteriorId, setProductoAnteriorId] = useState(product?.idProducto);
  if (product?.idProducto !== productoAnteriorId) {
    setProductoAnteriorId(product?.idProducto);
    setSelectedIndex(0);
  }

  const fotos = product
    ? [
        ...(product.imageUrl ? [product.imageUrl] : []),
        ...product.fotos.map((foto) => foto.imageUrl),
      ]
    : [];

  return (
    <Modal
      open={product !== null}
      onClose={onClose}
      className="max-w-2xl max-h-[90vh] flex flex-col"
    >
      {product && (
        <div className="p-6 overflow-y-auto flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <DialogTitle as="h2" className="text-xl font-semibold">
              {product.nombre}
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none cursor-pointer"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          <div className="h-64 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
            {fotos.length > 0 ? (
              // object-contain (no object-cover): se ve la imagen completa
              // sin recortarla ni deformarla para llenar la caja a la
              // fuerza — mismo tamaño de caja de siempre, mejor si la
              // imagen no tiene el mismo aspect-ratio.
              <img
                src={`${apiOrigin}${fotos[selectedIndex]}`}
                alt={product.nombre}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-gray-400">Sin imagen</span>
            )}
          </div>

          {fotos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {fotos.map((foto, index) => (
                <button
                  key={foto}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className={`h-16 w-16 shrink-0 rounded-md overflow-hidden border-2 bg-gray-100 cursor-pointer ${
                    index === selectedIndex ? 'border-blue-600' : 'border-transparent'
                  }`}
                >
                  <img src={`${apiOrigin}${foto}`} alt="" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          )}

          {product.categoria && (
            <p className="text-sm text-gray-500">{product.categoria.nombre}</p>
          )}

          <p className="text-2xl font-bold">{formatPrice(product.precio)}</p>

          {/* stock === null: el dueño eligió no mostrarlo (ver
              Product.mostrarStock) — no es lo mismo que stock === 0 (sin
              stock real). */}
          {product.stock === null ? (
            <p className="text-gray-500">Consultar disponibilidad</p>
          ) : product.stock === 0 ? (
            <p className="text-red-600">Sin stock</p>
          ) : (
            <p className="text-gray-600">Stock disponible: {product.stock}</p>
          )}

          {product.descripcion && (
            // bloque con scroll interno propio (max-h + overflow-y-auto):
            // no estira el modal indefinidamente con descripciones largas,
            // y el texto sigue siendo legible completo haciendo scroll acá
            // adentro en vez de cortarse.
            <p className="text-gray-700 whitespace-pre-line max-h-40 overflow-y-auto pr-1">
              {product.descripcion}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

export default ProductDetailModal;
