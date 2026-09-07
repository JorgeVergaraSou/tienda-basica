import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, IsNull, Repository } from 'typeorm';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { ProductEntity } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FindProductsQueryDto } from './dto/find-products-query.dto';
import {
  PaginatedProductsResponseDto,
  ProductResponseDto,
} from './dto/responses/product-response.dto';
import { CategoriesService } from '@/categories/categories.service';
import { CategoryEntity } from '@/categories/entities/category.entity';
import { Role } from '@/common/enums/role.enum';
import { UserActiveInterface } from '@/common/interfaces/user-active.interface';
import { UserEntity } from '@/users/entities/user.entity';
import { handleServiceError } from '@/common/utils/error-handler.util';
import { productsErrorLogger } from '@/config/module-loggers';
import { deleteLogger, insertLogger, updateLogger } from '@/config/db-loggers';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    private readonly categoriesService: CategoriesService,
  ) {}

  async crearProducto(
    dto: CreateProductDto,
    activeUser: UserActiveInterface,
  ): Promise<ProductResponseDto> {
    try {
      const { idCategoria, ...resto } = dto;
      const categoria = await this.resolverCategoria(idCategoria);

      const created = await this.productRepository.save({
        ...resto,
        categoria,
        // se guarda quién lo cargó (ver ProductEntity.creadoPor) — no hace
        // falta el objeto UserEntity completo, alcanza con el id para que
        // TypeORM arme la FK.
        creadoPor: { idUser: activeUser.idUser } as UserEntity,
      });

      insertLogger.info(
        `Producto creado: ${JSON.stringify({
          idProducto: created.idProducto,
          nombre: created.nombre,
        })}`,
      );

      return this.toResponseDto(
        await this.getProductoWithDeleted(created.idProducto),
      );
    } catch (error) {
      handleServiceError(
        error,
        productsErrorLogger,
        'ProductsService.crearProducto',
        'Error al crear el producto',
      );
    }
  }

  /** catálogo público: solo productos activos (no da de baja) */
  async findAllActivos(
    query: FindProductsQueryDto,
  ): Promise<PaginatedProductsResponseDto> {
    return this.buscarProductos(query, false);
  }

  /** listado para el panel ADMIN: incluye los dados de baja */
  async findAllAdmin(
    query: FindProductsQueryDto,
  ): Promise<PaginatedProductsResponseDto> {
    return this.buscarProductos(query, true);
  }

  /** "mis productos" (ADMIN o USER): los que el usuario activo cargó él
   * mismo, incluidos los dados de baja — mismo criterio que
   * findOneAdmin, porque el dueño de un producto tiene que poder verlo y
   * reactivarlo si lo dio de baja por error. */
  async findMisProductos(
    query: FindProductsQueryDto,
    activeUser: UserActiveInterface,
  ): Promise<PaginatedProductsResponseDto> {
    return this.buscarProductos(query, true, activeUser.idUser);
  }

  private async buscarProductos(
    query: FindProductsQueryDto,
    incluirInactivos: boolean,
    creadoPorId?: number,
  ): Promise<PaginatedProductsResponseDto> {
    try {
      const page = query.page ?? 1;
      const limit = query.limit ?? 12;

      const where: FindOptionsWhere<ProductEntity> = {};

      if (query.search) {
        where.nombre = ILike(`%${query.search}%`);
      }

      if (query.categoriaId) {
        where.categoria = { idCategoria: query.categoriaId };
      }

      if (creadoPorId) {
        where.creadoPor = { idUser: creadoPorId };
      }

      // Siempre se pide withDeleted:true acá — no para mostrar productos
      // dados de baja (eso lo controla el IsNull() explícito de abajo),
      // sino porque sin esto TypeORM excluye del JOIN cualquier categoría
      // que esté soft-deleted, y un producto activo con una categoría dada
      // de baja terminaría mostrando categoria:null en vez de la categoría
      // real (dar de baja una categoría no debería "romper" los productos
      // que ya la tenían asignada).
      if (!incluirInactivos) {
        where.deletedAt = IsNull();
      }

      const [items, total] = await this.productRepository.findAndCount({
        where,
        relations: ['categoria'],
        withDeleted: true,
        order: { nombre: 'ASC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        items: items.map((item) => this.toResponseDto(item)),
        total,
        page,
        limit,
      };
    } catch (error) {
      handleServiceError(
        error,
        productsErrorLogger,
        'ProductsService.buscarProductos',
        'Error al buscar productos',
        { incluirInactivos, creadoPorId },
      );
    }
  }

  /** detalle para el panel ADMIN: a diferencia de findOneActivo, sí
   * devuelve productos dados de baja — hace falta para la página de
   * editar un producto (que se puede cargar directo por URL/refresh, no
   * solo navegando desde el listado que ya tiene los datos en memoria). */
  async findOneAdmin(id: number): Promise<ProductResponseDto> {
    try {
      const product = await this.getProductoWithDeleted(id); // lanza NotFoundException si no existe
      return this.toResponseDto(product);
    } catch (error) {
      handleServiceError(
        error,
        productsErrorLogger,
        'ProductsService.findOneAdmin',
        'Error al buscar el producto',
        { id },
      );
    }
  }

  /** detalle público: nunca devuelve un producto dado de baja. withDeleted
   * + deletedAt: IsNull() explícito (en vez de dejar el filtro implícito
   * de TypeORM) por el mismo motivo que en buscarProductos: que la
   * categoría esté dada de baja no debe ocultarla en un producto activo. */
  async findOneActivo(id: number): Promise<ProductResponseDto> {
    try {
      const product = await this.productRepository.findOne({
        where: { idProducto: id, deletedAt: IsNull() },
        relations: ['categoria'],
        withDeleted: true,
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      return this.toResponseDto(product);
    } catch (error) {
      handleServiceError(
        error,
        productsErrorLogger,
        'ProductsService.findOneActivo',
        'Error al buscar el producto',
        { id },
      );
    }
  }

  async actualizarProducto(
    id: number,
    dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    try {
      await this.getProductoWithDeleted(id); // lanza NotFoundException si no existe

      if (Object.keys(dto).length > 0) {
        const { idCategoria, ...resto } = dto;
        const updateData: Partial<ProductEntity> = { ...resto };

        // idCategoria solo se toca si vino explícitamente en el body —
        // 'idCategoria' in dto distingue "no mandaron el campo" (undefined,
        // no tocar) de "lo mandaron en null" (sacarle la categoría).
        if ('idCategoria' in dto) {
          updateData.categoria = await this.resolverCategoria(idCategoria);
        }

        await this.productRepository.save({ idProducto: id, ...updateData });

        updateLogger.info(
          `Producto actualizado (ID ${id}): campos ${JSON.stringify(Object.keys(dto))}`,
        );
      }

      const updated = await this.getProductoWithDeleted(id);
      return this.toResponseDto(updated);
    } catch (error) {
      handleServiceError(
        error,
        productsErrorLogger,
        'ProductsService.actualizarProducto',
        'Ocurrió un error al actualizar el producto',
        { id },
      );
    }
  }

  /** reemplaza la imagen del producto (mismo patrón que
   * UsersService.actualizarFoto: si ya tenía una imagen anterior, la borra
   * del disco para no dejar archivos huérfanos en uploads/products).
   * ADMIN puede tocar la imagen de cualquier producto; USER solo la del
   * que él mismo cargó (ver ProductEntity.creadoPor) — RolesGuard ya deja
   * pasar a ambos roles por el @Auth del controller, así que la
   * diferencia de permisos se resuelve acá adentro. */
  async actualizarImagen(
    id: number,
    file: Express.Multer.File,
    activeUser: UserActiveInterface,
  ): Promise<ProductResponseDto> {
    try {
      if (!file) {
        throw new BadRequestException('Debe adjuntar una imagen');
      }

      const product = await this.getProductoWithDeleted(id);

      if (
        activeUser.role !== Role.ADMIN &&
        product.creadoPor?.idUser !== activeUser.idUser
      ) {
        throw new ForbiddenException(
          'No podés modificar la imagen de un producto que no cargaste vos',
        );
      }

      if (product.imageFile) {
        const rutaAnterior = join(
          process.cwd(),
          'uploads',
          'products',
          product.imageFile,
        );

        if (existsSync(rutaAnterior)) {
          unlinkSync(rutaAnterior);
        }
      }

      await this.productRepository.update(id, { imageFile: file.filename });
      updateLogger.info(`Imagen de producto actualizada (ID ${id})`);

      const updated = await this.getProductoWithDeleted(id);
      return this.toResponseDto(updated);
    } catch (error) {
      handleServiceError(
        error,
        productsErrorLogger,
        'ProductsService.actualizarImagen',
        'Error al actualizar la imagen del producto',
        { id },
      );
    }
  }

  async darDeBajaProducto(id: number): Promise<void> {
    try {
      const product = await this.getProductoWithDeleted(id);

      if (product.deletedAt) {
        throw new BadRequestException('El producto ya está inactivo');
      }

      await this.productRepository.softDelete(id);
      deleteLogger.info(`Producto dado de baja (ID ${id}, soft-delete)`);
    } catch (error) {
      handleServiceError(
        error,
        productsErrorLogger,
        'ProductsService.darDeBajaProducto',
        'Ocurrió un error al desactivar el producto',
        { id },
      );
    }
  }

  /** ADMIN puede reactivar cualquier producto; USER solo el que él mismo
   * cargó (mismo criterio y mismo chequeo que actualizarImagen). */
  async activarProducto(
    id: number,
    activeUser: UserActiveInterface,
  ): Promise<void> {
    try {
      const product = await this.getProductoWithDeleted(id);

      if (
        activeUser.role !== Role.ADMIN &&
        product.creadoPor?.idUser !== activeUser.idUser
      ) {
        throw new ForbiddenException(
          'No podés reactivar un producto que no cargaste vos',
        );
      }

      if (!product.deletedAt) {
        throw new BadRequestException('El producto ya está activo');
      }

      await this.productRepository.restore(id);
      // restore() revierte un soft-delete — se audita con updateLogger (no
      // deleteLogger) porque semánticamente es la operación inversa, no un
      // borrado (mismo criterio que UsersService.activarUsuario).
      updateLogger.info(`Producto reactivado (ID ${id}, restore)`);
    } catch (error) {
      handleServiceError(
        error,
        productsErrorLogger,
        'ProductsService.activarProducto',
        'Ocurrió un error al activar el producto',
        { id },
      );
    }
  }

  /** valida el idCategoria que manda el cliente contra una categoría real
   * (ver CategoriesService.findActivaByIdOrThrow) — undefined/null significa
   * "sin categoría". */
  private async resolverCategoria(
    idCategoria: number | null | undefined,
  ): Promise<CategoryEntity | null> {
    if (idCategoria === null || idCategoria === undefined) {
      return null;
    }

    return this.categoriesService.findActivaByIdOrThrow(idCategoria);
  }

  private async getProductoWithDeleted(id: number): Promise<ProductEntity> {
    const product = await this.productRepository.findOne({
      where: { idProducto: id },
      relations: ['categoria', 'creadoPor'],
      withDeleted: true,
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return product;
  }

  private toResponseDto(product: ProductEntity): ProductResponseDto {
    return {
      idProducto: product.idProducto,
      nombre: product.nombre,
      descripcion: product.descripcion,
      precio: product.precio,
      stock: product.stock,
      categoria: product.categoria
        ? {
            idCategoria: product.categoria.idCategoria,
            nombre: product.categoria.nombre,
          }
        : null,
      imageUrl: product.imageFile
        ? `/uploads/products/${product.imageFile}`
        : null,
      deletedAt: product.deletedAt,
    };
  }
}
