export class ProductCategoryDto {
  idCategoria: number;
  nombre: string;
}

export class ProductResponseDto {
  idProducto: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
  categoria: ProductCategoryDto | null;
  imageUrl: string | null;
  deletedAt: Date | null;
}

export class PaginatedProductsResponseDto {
  items: ProductResponseDto[];
  total: number;
  page: number;
  limit: number;
}
