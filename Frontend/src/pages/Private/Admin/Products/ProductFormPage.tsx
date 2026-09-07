import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createProductService,
  getAdminCategoriesService,
  getAdminProductService,
  updateProductService,
  uploadProductImageService,
} from '@/services';
import { Category, Product } from '@/interfaces';
import { PrivateRoutes } from '@/models';
import { getErrorMessage, apiOrigin } from '@/utilities';
import { showSuccess } from '@/utilities/alerts/alert.utils';
import { Button } from '@/components/ui';

interface ProductFormState {
  nombre: string;
  descripcion: string;
  precio: string;
  stock: string;
  // '' = sin categoría; si no, es el idCategoria como string (viene de un
  // <select>, que solo maneja valores string).
  idCategoria: string;
}

const emptyForm: ProductFormState = {
  nombre: '',
  descripcion: '',
  precio: '',
  stock: '',
  idCategoria: '',
};

/** Form de producto — mismo componente para crear (ruta
 * /admin/productos/nuevo, sin :id) y editar (/admin/productos/:id/editar).
 * Separado de ProductsListPage y de CategoriesPage, cada uno su propia
 * página/responsabilidad. */
function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const editingId = id ? Number(id) : null;
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState('');

  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(Boolean(editingId));
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const data = await getAdminCategoriesService();
        if (!cancelado) setCategories(data);
      } catch (error) {
        if (!cancelado) setCategoriesError(getErrorMessage(error));
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  // Carga los datos del producto cuando la página es de edición (viene un
  // :id en la URL). Si es "nuevo producto" (sin :id), este efecto no hace
  // nada — el form arranca vacío.
  useEffect(() => {
    if (!editingId) {
      return;
    }

    let cancelado = false;

    (async () => {
      setLoading(true);
      setFormError('');

      try {
        const product = await getAdminProductService(editingId);
        if (cancelado) return;

        setForm({
          nombre: product.nombre,
          descripcion: product.descripcion ?? '',
          precio: String(product.precio),
          stock: String(product.stock),
          idCategoria: product.categoria ? String(product.categoria.idCategoria) : '',
        });
        setCurrentImageUrl(product.imageUrl);
      } catch (error) {
        if (!cancelado) setFormError(getErrorMessage(error));
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [editingId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.nombre.trim() || !form.precio.trim()) {
      setFormError('Nombre y precio son obligatorios');
      return;
    }

    const precio = Number(form.precio);
    if (Number.isNaN(precio) || precio < 0) {
      setFormError('El precio debe ser un número válido');
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || undefined,
      precio,
      stock: form.stock.trim() ? Number(form.stock) : undefined,
      idCategoria: form.idCategoria ? Number(form.idCategoria) : null,
    };

    setSaving(true);
    setFormError('');

    try {
      let product: Product;

      if (editingId) {
        product = await updateProductService(editingId, payload);
      } else {
        product = await createProductService(payload);
      }

      if (imageFile) {
        await uploadProductImageService(product.idProducto, imageFile);
      }

      await showSuccess(editingId ? 'Producto actualizado' : 'Producto creado');
      navigate(`/${PrivateRoutes.ADMIN}/productos`);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // categorías elegibles en el <select>: las activas, más la que ya tenga
  // asignada el producto en edición (aunque esté dada de baja), para no
  // hacerla "desaparecer" del form al editar.
  const categoriasDisponibles = categories.filter(
    (category) => !category.deletedAt || String(category.idCategoria) === form.idCategoria,
  );

  if (loading) {
    return <p>Cargando...</p>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        {editingId ? `Editar producto #${editingId}` : 'Nuevo producto'}
      </h2>

      <form onSubmit={handleSubmit} className="border border-gray-200 rounded-md p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="nombre">Nombre</label>
            <input
              id="nombre"
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
            />
          </div>
          <div>
            <label htmlFor="idCategoria">Categoría</label>
            <select
              id="idCategoria"
              value={form.idCategoria}
              onChange={(e) => setForm({ ...form, idCategoria: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
            >
              <option value="">Sin categoría</option>
              {categoriasDisponibles.map((category) => (
                <option key={category.idCategoria} value={category.idCategoria}>
                  {category.nombre}
                  {category.deletedAt ? ' (inactiva)' : ''}
                </option>
              ))}
            </select>
            {categoriesError && <p className="text-red-600 text-xs mt-1">{categoriesError}</p>}
          </div>
          <div>
            <label htmlFor="precio">Precio</label>
            <input
              id="precio"
              type="number"
              step="0.01"
              min="0"
              value={form.precio}
              onChange={(e) => setForm({ ...form, precio: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
            />
          </div>
          <div>
            <label htmlFor="stock">Stock</label>
            <input
              id="stock"
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="descripcion">Descripción</label>
            <textarea
              id="descripcion"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="imagen">Imagen</label>
            {currentImageUrl && (
              <img
                src={`${apiOrigin}${currentImageUrl}`}
                alt={form.nombre}
                className="h-16 w-16 object-cover rounded-md mb-2"
              />
            )}
            <input
              id="imagen"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        {formError && <p className="text-red-600 mt-2">{formError}</p>}

        <div className="mt-4 flex gap-2">
          <Button type="submit" disabled={saving}>
            {editingId ? 'Guardar cambios' : 'Crear producto'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/${PrivateRoutes.ADMIN}/productos`)}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ProductFormPage;
