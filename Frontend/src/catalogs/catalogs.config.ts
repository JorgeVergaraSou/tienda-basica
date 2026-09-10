import { lazy } from 'react';
import type { CatalogDefinition } from './catalog.types';

/**
 * Registro central de diseños de catálogo. Agregar uno nuevo (Catalog4,
 * etc.):
 *   1. Crear la página en pages/Public/Catalog4/ (+ index.ts barrel, mismo
 *      patrón que Catalog/Catalog2/Catalog3).
 *   2. Sumar una entrada acá.
 * Nada más — App.tsx genera la <Route> de cada uno con `catalogs.map(...)`
 * (no hay que tocarlo), y la Landing (pages/Public/Home) arma su card
 * también a partir de este array.
 *
 * Todos los diseños consumen el mismo backend (getProductsService /
 * getCategoriesService, ver services/) — este registro es solo de
 * presentación, no de datos.
 */
export const catalogs: CatalogDefinition[] = [
  {
    id: 'catalog-1',
    name: 'Catálogo clásico',
    description:
      'Nuestro diseño original: buscador y categorías arriba, grilla de productos estilo marketplace.',
    path: 'catalog',
    component: lazy(() => import('@/pages/Public/Catalog')),
    previewClassName: 'bg-linear-to-br from-brand to-brand-dark',
  },
  {
    id: 'catalog-2',
    name: 'Catálogo moderno',
    description:
      'Diseño más técnico y denso, con filtro de categorías lateral — pensado para catálogos grandes.',
    path: 'catalog2',
    component: lazy(() => import('@/pages/Public/Catalog2')),
    previewClassName: 'bg-linear-to-br from-neutral-900 to-red-700',
  },
  {
    id: 'catalog-3',
    name: 'Catálogo tienda departamental',
    description:
      'Diseño colorido y redondeado, con pestañas de categoría y banner destacado — estilo grandes tiendas.',
    path: 'catalog3',
    component: lazy(() => import('@/pages/Public/Catalog3')),
    previewClassName: 'bg-linear-to-br from-fuchsia-600 to-pink-500',
  },
];
