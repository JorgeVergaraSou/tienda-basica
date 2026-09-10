import type { Product } from '@/interfaces';
import { apiOrigin } from '@/utilities';

function formatPrice(precio: number): string {
  return `$${precio.toFixed(2)}`;
}

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  className?: string;
}

/** Card de producto reutilizable — pedido explícito del spec original
 * ("componente que reciba los datos del producto"), la usan
 * `ProductCarousel.tsx` y la grilla de tiles de categoría en
 * `Catalog6.tsx`. Sin badge de descuento ni precio tachado: `Product` no
 * tiene precio de oferta en este proyecto (a diferencia del spec, que
 * pedía "ofertas flash" — ver Frontend/CLAUDE.md, sección de este
 * catálogo, para el resto de las adaptaciones). Al click, delega en
 * `onSelect` — quien la usa decide qué hacer (acá, abrir
 * ProductDetailModal, igual que Catalog.tsx–Catalog4.tsx). */
export function ProductCard({ product, onSelect, className = '' }: ProductCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className={`group flex flex-col text-left bg-white rounded-xl border border-c6-line overflow-hidden transition-shadow hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-c6-primary ${className}`.trim()}
    >
      <div className="aspect-square bg-c6-surface flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img
            src={`${apiOrigin}${product.imageUrl}`}
            alt={product.nombre}
            className="h-full w-full object-contain p-4 transition-transform duration-200 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="text-c6-ink/30 text-sm">Sin imagen</span>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col gap-1">
        {product.categoria && (
          <span className="text-[11px] text-c6-ink/45">{product.categoria.nombre}</span>
        )}
        <h3 className="text-sm font-bold text-c6-ink leading-snug line-clamp-2 min-h-[2.5em]">
          {product.nombre}
        </h3>
        <p className="mt-auto text-lg font-extrabold text-c6-primary tabular-nums">
          {formatPrice(product.precio)}
        </p>

        {product.stock === null ? (
          <span className="text-xs text-c6-ink/45">Consultar disponibilidad</span>
        ) : (
          product.stock === 0 && <span className="text-xs text-red-600">Sin stock</span>
        )}
      </div>
    </button>
  );
}

export default ProductCard;
