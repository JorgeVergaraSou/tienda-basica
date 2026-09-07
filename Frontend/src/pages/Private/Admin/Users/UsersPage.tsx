import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import {
  activateUserService,
  deactivateUserService,
  getUsersService,
} from '@/services';
import { UserListItem } from '@/interfaces';
import { getErrorMessage } from '@/utilities';
import { showError } from '@/utilities/alerts/alert.utils';
import { Button } from '@/components/ui';
import { UserFormModal } from './UserFormModal';

/** Gestión de usuarios — ADMIN-only (RoleGuard en App.tsx + @Auth(Role.ADMIN)
 * en cada ruta de /auth/* que se usa acá: listar-usuarios, nuevo-usuario,
 * editar-usuario/:id, dar-de-baja-usuario/:id, activar-usuario/:id). Mismo
 * patrón que CategoriesPage (listado + form + dar de baja/reactivar), con
 * el form en un modal en vez de inline porque tiene más campos. */
function UsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  // null + modalOpen=false: modal cerrado.
  // null + modalOpen=true: modal abierto en modo creación.
  // UserListItem + modalOpen=true: modal abierto editando ese usuario.
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      setLoading(true);
      setListError('');

      try {
        const data = await getUsersService();
        if (!cancelado) setUsers(data);
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

  const handleNuevo = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const handleEditar = (user: UserListItem) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  const handleGuardado = () => {
    setReloadToken((token) => token + 1);
  };

  const handleToggleActive = async (user: UserListItem) => {
    const estaActivo = !user.deletedAt;

    const { isConfirmed } = await Swal.fire({
      icon: 'question',
      title: estaActivo ? 'Dar de baja usuario' : 'Reactivar usuario',
      text: `¿Confirmás ${estaActivo ? 'dar de baja a' : 'reactivar a'} "${user.nombre} ${user.apellido}" (@${user.nickUsuario})?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
    });

    if (!isConfirmed) {
      return;
    }

    try {
      if (estaActivo) {
        await deactivateUserService(user.idUser);
      } else {
        await activateUserService(user.idUser);
      }
      setReloadToken((token) => token + 1);
    } catch (error) {
      // acá llega, por ejemplo, el 400 de "no podés dar de baja al único
      // administrador activo" (ver UsersService.esUnicoAdminActivo).
      showError(getErrorMessage(error));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Usuarios</h2>
        <Button onClick={handleNuevo}>+ Nuevo usuario</Button>
      </div>

      {loading && <p>Cargando...</p>}
      {listError && <p className="text-red-600">{listError}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="py-2">Usuario</th>
              <th className="py-2">Nombre</th>
              <th className="py-2">Email</th>
              <th className="py-2">Rol</th>
              <th className="py-2">Estado</th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.idUser} className="border-b border-gray-100">
                <td className="py-2">@{user.nickUsuario}</td>
                <td className="py-2">
                  {user.nombre} {user.apellido}
                </td>
                <td className="py-2">{user.email ?? '—'}</td>
                <td className="py-2">{user.role}</td>
                <td className="py-2">
                  {user.deletedAt ? (
                    <span className="text-red-600">Inactivo</span>
                  ) : (
                    <span className="text-green-600">Activo</span>
                  )}
                </td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => handleEditar(user)}>
                      Editar
                    </Button>
                    <Button variant="secondary" onClick={() => handleToggleActive(user)}>
                      {user.deletedAt ? 'Reactivar' : 'Dar de baja'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && users.length === 0 && <p className="mt-4">No hay usuarios para mostrar.</p>}
      </div>

      <UserFormModal
        user={editingUser}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleGuardado}
      />
    </div>
  );
}

export default UsersPage;
