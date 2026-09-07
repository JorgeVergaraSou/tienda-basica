import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import {
  activateCategoryService,
  createCategoryService,
  deactivateCategoryService,
  getAdminCategoriesService,
  updateCategoryService,
} from '@/services';
import { Category } from '@/interfaces';
import { getErrorMessage } from '@/utilities';
import { showError, showSuccess } from '@/utilities/alerts/alert.utils';
import { Button } from '@/components/ui';

/** Gestión de categorías — separada del resto del panel admin (antes vivía
 * en la misma página que "nuevo producto" y "listado de productos"). */
function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      setLoading(true);
      setListError('');

      try {
        const data = await getAdminCategoriesService();
        if (!cancelado) setCategories(data);
      } catch (error) {
        if (!cancelado) setListError(getErrorMessage(error));
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [reloadToken]);

  const resetForm = () => {
    setEditingId(null);
    setNameInput('');
    setFormError('');
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.idCategoria);
    setNameInput(category.nombre);
    setFormError('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!nameInput.trim()) {
      setFormError('El nombre es obligatorio');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      if (editingId) {
        await updateCategoryService(editingId, { nombre: nameInput.trim() });
      } else {
        await createCategoryService({ nombre: nameInput.trim() });
      }

      await showSuccess(editingId ? 'Categoría actualizada' : 'Categoría creada');
      resetForm();
      setReloadToken((token) => token + 1);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (category: Category) => {
    const estaActiva = !category.deletedAt;

    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: estaActiva ? 'Dar de baja categoría' : 'Reactivar categoría',
      text: `¿Confirmás ${estaActiva ? 'dar de baja a' : 'reactivar'} "${category.nombre}"? ${
        estaActiva ? 'Los productos que ya la tengan asignada no se ven afectados.' : ''
      }`,
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
    });

    if (!isConfirmed) {
      return;
    }

    try {
      if (estaActiva) {
        await deactivateCategoryService(category.idCategoria);
      } else {
        await activateCategoryService(category.idCategoria);
      }
      setReloadToken((token) => token + 1);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Categorías</h2>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Nombre de la categoría"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 flex-1"
        />
        <Button type="submit" disabled={saving}>
          {editingId ? 'Guardar' : 'Crear'}
        </Button>
        {editingId && (
          <Button type="button" variant="secondary" onClick={resetForm}>
            Cancelar
          </Button>
        )}
      </form>

      {formError && <p className="text-red-600 mb-2">{formError}</p>}
      {loading && <p>Cargando categorías...</p>}
      {listError && <p className="text-red-600">{listError}</p>}

      <ul className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <li
            key={category.idCategoria}
            className={`flex items-center gap-2 border rounded-md px-3 py-1 ${
              category.deletedAt ? 'border-red-200 text-red-600' : 'border-gray-300'
            }`}
          >
            <span>{category.nombre}</span>
            <button
              type="button"
              onClick={() => handleEdit(category)}
              className="text-blue-600 underline text-sm cursor-pointer"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => handleToggleActive(category)}
              className="underline text-sm cursor-pointer"
            >
              {category.deletedAt ? 'Reactivar' : 'Dar de baja'}
            </button>
          </li>
        ))}
      </ul>

      {!loading && categories.length === 0 && (
        <p>No hay categorías todavía — creá la primera arriba.</p>
      )}
    </div>
  );
}

export default CategoriesPage;
