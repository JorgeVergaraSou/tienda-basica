import { useEffect, useState } from 'react';
import { createProductService, getCategoriesService, uploadProductImageService } from '@/services';
import { Category } from '@/interfaces';
import { getErrorMessage } from '@/utilities';
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

/** Rol USER: solo puede cargar productos nuevos — no editar ni dar de
 * baja los existentes, ni tocar categorías (eso sigue siendo solo ADMIN,
 * ver pages/Private/Admin/Admin.tsx). Sí puede subirle una imagen al
 * producto que acaba de crear (ProductEntity.creadoPor guarda quién lo
 * cargó, y el backend solo deja tocar la imagen de un producto ajeno a
 * ADMIN — ver ProductsService.actualizarImagen), y también puede
 * reactivar sus propios productos si los dio de baja un ADMIN por error
 * — ver MisProductos/MisProductosPage.tsx, pestaña hermana de esta. No
 * puede, en cambio, volver después a cambiarle la imagen a un producto
 * viejo desde acá: esta página no tiene listado propio, así que la única
 * imagen que puede subir es la del producto que recién creó en esta
 * misma carga. */
function CargarProductoPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState('');

  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const data = await getCategoriesService();
        if (!cancelado) setCategories(data);
      } catch (error) {
        if (!cancelado) setCategoriesError(getErrorMessage(error));
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

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

    setSaving(true);
    setFormError('');

    try {
      const product = await createProductService({
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        precio,
        stock: form.stock.trim() ? Number(form.stock) : undefined,
        idCategoria: form.idCategoria ? Number(form.idCategoria) : null,
      });

      if (imageFile) {
        await uploadProductImageService(product.idProducto, imageFile);
      }

      await showSuccess('Producto creado');
      setForm(emptyForm);
      setImageFile(null);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Cargar producto</h2>
      <p className="text-sm text-gray-500 mb-4">
        Para editar o dar de baja productos, o para gestionar categorías, hace falta un
        usuario ADMIN.
      </p>

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
              {categories.map((category) => (
                <option key={category.idCategoria} value={category.idCategoria}>
                  {category.nombre}
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
            <input
              id="imagen"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        {formError && <p className="text-red-600 mt-2">{formError}</p>}

        <div className="mt-4">
          <Button type="submit" disabled={saving}>Crear producto</Button>
        </div>
      </form>
    </div>
  );
}

export default CargarProductoPage;
