import { EyeIcon } from '@heroicons/react/24/outline';
import type { Product } from '@/interfaces';
import { apiOrigin } from '@/utilities';

function formatPrice(precio: number): string {
  return `$${precio.toFixed(2)}`;
}

/** Indicador de stock — spec pedía umbrales (>20 = "+20 Unid.", <10 = número
 * exacto en color de alerta, 0 = "Sin stock"). El hueco 10–20 que el spec no
 * cubre se resuelve mostrando el número exacto en tono neutro, para no
 * dejar un salto sin criterio entre "+20" y "alerta". `stock === null`
 * (el dueño eligió no mostrarlo, ver Product.mostrarStock) usa el mismo
 * texto que ya usan los otros 6 catálogos — no es un umbral más, es un
 * estado aparte. */
function StockIndicator({ stock }: { stock: number | null }) {
  if (stock === null) {
    return <span className="text-xs text-neutral-500">Consultar disponibilidad</span>;
  }
  if (stock === 0) {
    return <span className="text-xs font-medium text-red-600">Sin stock</span>;
  }
  if (stock > 20) {
    return <span className="text-xs text-neutral-500">+20 Unid.</span>;
  }
  if (stock < 10) {
    return <span className="text-xs font-semibold text-orange-600">¡Quedan {stock}!</span>;
  }
  return <span className="text-xs text-neutral-500">{stock} Unid.</span>;
}

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

/** Card de producto — pedido explícito del spec original ("extraelo como
 * subcomponente reutilizable"). Sin marca, SKU con formato de código, ni
 * precio de descuento: ninguno de esos campos existe en `Product` en este
 * proyecto — el spec pedía explícitamente no inventarlos si faltan, así
 * que se omiten en vez de mockearlos. `idProducto` sí es real (el ID
 * interno del producto), se muestra como referencia. Sin botón de
 * "Agregar al carrito": este proyecto no tiene carrito en ningún lado (ni
 * siquiera como placeholder — ver Frontend/CLAUDE.md) — el CTA es "Ver
 * producto", reutiliza `ProductDetailModal` como los otros 6 catálogos. */
export function ProductCard({ product, onSelect }: ProductCardProps) {
  return (
    <div className="group flex flex-col bg-white border border-neutral-200 rounded-lg overflow-hidden transition-all hover:border-indigo-300 hover:shadow-md">
      <button
        type="button"
        onClick={() => onSelect(product)}
        aria-label={`Ver detalle de ${product.nombre}`}
        className="block aspect-square bg-white flex items-center justify-center overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600"
      >
        {product.imageUrl ? (
          <img
            src={`${apiOrigin}${product.imageUrl}`}
            alt={product.nombre}
            className="h-full w-full object-contain p-4 transition-transform duration-200 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="text-neutral-300 text-sm">Sin imagen</span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <button
          type="button"
          onClick={() => onSelect(product)}
          className="text-left text-sm font-semibold text-neutral-800 leading-snug line-clamp-2 min-h-[2.5em] cursor-pointer hover:text-indigo-700 focus-visible:outline-none focus-visible:underline"
        >
          {product.nombre}
        </button>

        <span className="text-[11px] text-neutral-400">ID {product.idProducto}</span>

        <StockIndicator stock={product.stock} />

        <p className="mt-1 text-lg font-extrabold text-indigo-700 tabular-nums">
          {formatPrice(product.precio)}
        </p>

        <button
          type="button"
          onClick={() => onSelect(product)}
          aria-label={`Ver producto: ${product.nombre}`}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-indigo-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600"
        >
          <EyeIcon className="h-4 w-4" aria-hidden="true" />
          Ver producto
        </button>
      </div>
    </div>
  );
}

/** Skeleton con la misma forma de la card real — pedido explícito del
 * spec ("no un spinner genérico"). `animate-pulse` es una utilidad nativa
 * de Tailwind, no hace falta un keyframe propio. */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col bg-white border border-neutral-200 rounded-lg overflow-hidden animate-pulse" aria-hidden="true">
      <div className="aspect-square bg-neutral-100" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-4 bg-neutral-100 rounded w-3/4" />
        <div className="h-4 bg-neutral-100 rounded w-1/2" />
        <div className="h-2.5 bg-neutral-100 rounded w-1/4 mt-1" />
        <div className="h-6 bg-neutral-100 rounded w-2/3 mt-1" />
        <div className="h-9 bg-neutral-100 rounded w-full mt-2" />
      </div>
    </div>
  );
}

export default ProductCard;
