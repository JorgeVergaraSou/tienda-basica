export interface ProductCategory {
  idCategoria: number;
  nombre: string;
}

export interface Product {
  idProducto: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
  categoria: ProductCategory | null;
  imageUrl: string | null;
  // llega como string por JSON (no hay tipo Date en JSON) — null si el
  // producto está activo.
  deletedAt: string | null;
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  limit: number;
}
