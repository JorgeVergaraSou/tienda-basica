import { useDispatch, useSelector } from 'react-redux';
import { AppStore } from '@/redux/store';
import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { resetUser } from '@/redux/states/user';
import { actualizarFotoService, profileService, updateUserService } from '@/services';
import { apiOrigin, getErrorMessage } from '@/utilities';
import { PublicRoutes, Roles } from '@/models';
import { User } from '@/interfaces';
import { ProfileField } from '@/components/Profile/ProfileField';

const roleBadgeClass: Record<string, string> = {
  [Roles.ADMIN]: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  [Roles.USER]: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200',
  [Roles.GUEST]: 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-200',
};

const getIniciales = (nombre: string): string => {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

  return (partes[0][0] + partes[1][0]).toUpperCase();
};

// fotoUrl que devuelve el backend es una ruta relativa (ej.
// "/uploads/avatars/x.png"), servida fuera del prefijo tienda/v1 (ver
// main.ts) — mismo criterio que apiOrigin ya resuelve para las imágenes
// de producto (ver products.service.ts).
const construirUrlFoto = (fotoUrl: string | null): string | null =>
  fotoUrl ? `${apiOrigin}${fotoUrl}` : null;

/** Perfil del usuario logueado — puerto del Profile.tsx de otro proyecto
 * propio del mismo usuario (siscofar-frontend, sin relación de código
 * entre ambos), adaptado al contrato real de este backend: campos
 * nombre/apellido (no name/surname), roles ADMIN/USER/GUEST (no
 * SOLICITANTE), y PATCH /auth/updateUser/:id que YA exigía
 * `currentPassword` en cada actualización (ver
 * UsersService.updateUser) — antes el frontend pedía la contraseña
 * actual una sola vez en un campo fijo al pie de la página y la
 * reutilizaba para cualquier campo; ahora, como en el proyecto de
 * referencia, se confirma con un prompt de SweetAlert2 en el momento de
 * cada guardado individual.
 *
 * POST /auth/foto (subir/cambiar foto) y GET /auth/profile ya existían en
 * el backend — action el frontend nunca los usaba. */
function ProfilePage() {
  const user = useSelector((state: AppStore) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [newNick, setNewNick] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newApellido, setNewApellido] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileData, setProfileData] = useState<User | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const fetchProfileData = async () => {
    try {
      const data = await profileService();
      setProfileData(data);
    } catch (error) {
      console.error('Error al obtener el perfil:', getErrorMessage(error));
    }
  };

  // No llama fetchProfileData() directo acá por el mismo motivo que ya
  // documentaba este archivo (react-hooks/set-state-in-effect no deja
  // llamar dentro de un efecto a una función que termina en setState,
  // aunque sea async) — encadenar la promesa evita el falso positivo.
  useEffect(() => {
    profileService()
      .then((data) => setProfileData(data))
      .catch((error) => console.error('Error al obtener el perfil:', getErrorMessage(error)));
  }, []);

  /** Devuelve si la actualización salió bien, para que ProfileField sepa
   * si puede volver a modo lectura (ver ProfileField.onSave). */
  const handleUpdate = async (field: string): Promise<boolean> => {
    const fieldValidations: Record<string, { value: string; message: string }> = {
      nickUsuario: { value: newNick, message: 'El campo nombre de usuario no puede estar vacío.' },
      nombre: { value: newNombre, message: 'El campo nombre no puede estar vacío.' },
      apellido: { value: newApellido, message: 'El campo apellido no puede estar vacío.' },
      email: { value: newEmail, message: 'El campo email no puede estar vacío.' },
      password: { value: newPassword, message: 'El campo contraseña no puede estar vacío.' },
    };

    if (fieldValidations[field] && fieldValidations[field].value.trim() === '') {
      Swal.fire({ icon: 'error', title: 'Error', text: fieldValidations[field].message });
      return false;
    }

    // el backend exige currentPassword en cada PATCH /auth/updateUser/:id
    // (ver UsersService.updateUser) — se pide acá, en el momento de
    // guardar este campo puntual, no una sola vez para toda la página.
    const { value: enteredPassword } = await Swal.fire({
      title: 'Autenticación requerida',
      text: 'Ingresá tu contraseña para confirmar la actualización',
      input: 'password',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
    });

    if (!enteredPassword) {
      Swal.fire({
        icon: 'info',
        title: 'Actualización cancelada',
        text: 'No ingresaste tu contraseña. La operación se canceló.',
      });
      return false;
    }

    const updateData: Record<string, unknown> = { currentPassword: enteredPassword };

    if (field in fieldValidations) {
      updateData[field] = fieldValidations[field].value;
    }

    const successMessages: Record<string, string> = {
      nickUsuario: 'El nombre de usuario se actualizó correctamente.',
      nombre: 'El nombre se actualizó correctamente.',
      apellido: 'El apellido se actualizó correctamente.',
      email: 'El email se actualizó correctamente.',
      password: 'La contraseña se actualizó correctamente.',
    };

    try {
      await updateUserService(user.idUser, updateData);

      Swal.fire({
        icon: 'success',
        title: 'Actualización exitosa',
        text: successMessages[field] ?? 'Los datos se actualizaron correctamente.',
      });

      await fetchProfileData();

      // nickUsuario es el identificador de login en este proyecto (no
      // email, ver Backend/CLAUDE.md) — cambiarlo, igual que el email,
      // invalida la sesión de cara al usuario aunque el JWT siga siendo
      // técnicamente válido hasta que expire. Se cierra sesión a mano acá
      // (dispatch + navigate) en vez de con el hook useLogout() del
      // proyecto — ese hook siempre pide confirmación con otro Swal
      // ("¿Querés cerrar la sesión?"), que no corresponde acá: no es una
      // decisión del usuario, es una consecuencia obligada de lo que
      // acaba de hacer.
      if (field === 'nickUsuario' || field === 'email') {
        await Swal.fire({
          icon: 'info',
          title: field === 'nickUsuario' ? 'Cambio de usuario exitoso' : 'Cambio de email exitoso',
          text: 'Tu sesión se cerrará y deberás iniciar sesión nuevamente con tus nuevos datos.',
        });

        dispatch(resetUser());
        navigate(`/${PublicRoutes.LOGIN}`, { replace: true });
      } else {
        setNewNick('');
        setNewNombre('');
        setNewApellido('');
        setNewEmail('');
        setNewPassword('');
      }

      return true;
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: getErrorMessage(error) });
      return false;
    }
  };

  const handleFotoSeleccionada = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // permite volver a elegir el mismo archivo más adelante

    if (!file) return;

    setSubiendoFoto(true);

    try {
      await actualizarFotoService(file);
      await fetchProfileData();

      Swal.fire({
        icon: 'success',
        title: 'Foto actualizada',
        text: 'Tu foto de perfil se actualizó correctamente.',
      });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: getErrorMessage(error) });
    } finally {
      setSubiendoFoto(false);
    }
  };

  return (
    <div className="flex flex-col text-center p-6">
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 pt-10">
        <div className="hidden sm:block col-span-1" />

        <div className="border border-gray-200 rounded-md sm:col-span-3 p-6">
          {profileData && (
            <div className="max-w-lg mx-auto">
              {/* Identidad */}
              <div className="flex flex-col items-center gap-3 mb-8">
                <div className="relative">
                  {construirUrlFoto(profileData.fotoUrl) ? (
                    <img
                      src={construirUrlFoto(profileData.fotoUrl)!}
                      alt="Foto de perfil"
                      className="h-16 w-16 rounded-full object-cover ring-1 ring-inset ring-blue-200"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-lg font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                      {getIniciales(`${profileData.nombre} ${profileData.apellido}`)}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => fotoInputRef.current?.click()}
                    disabled={subiendoFoto}
                    title="Cambiar foto"
                    className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs shadow hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                  >
                    {subiendoFoto ? '…' : '✎'}
                  </button>

                  <input
                    ref={fotoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFotoSeleccionada}
                    className="hidden"
                  />
                </div>

                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {profileData.nombre} {profileData.apellido}
                  </div>
                  <div className="text-sm text-gray-500">@{profileData.nickUsuario}</div>
                </div>

                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    roleBadgeClass[user.role] ??
                    'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200'
                  }`}
                >
                  {user.role}
                </span>
              </div>

              {/* Datos de la cuenta */}
              <div className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                Datos de la cuenta
              </div>
              <div className="mb-6">
                <ProfileField
                  label="Usuario"
                  currentValue={profileData.nickUsuario}
                  value={newNick}
                  onChange={setNewNick}
                  onSave={() => handleUpdate('nickUsuario')}
                  placeholder="Nuevo nombre de usuario"
                />

                <ProfileField
                  label="Nombre"
                  currentValue={profileData.nombre}
                  value={newNombre}
                  onChange={setNewNombre}
                  onSave={() => handleUpdate('nombre')}
                  placeholder="Nuevo nombre"
                />

                <ProfileField
                  label="Apellido"
                  currentValue={profileData.apellido}
                  value={newApellido}
                  onChange={setNewApellido}
                  onSave={() => handleUpdate('apellido')}
                  placeholder="Nuevo apellido"
                />

                <ProfileField
                  label="Email"
                  currentValue={profileData.email ?? 'sin asociar'}
                  value={newEmail}
                  onChange={setNewEmail}
                  onSave={() => handleUpdate('email')}
                  type="email"
                  placeholder="Nuevo email"
                />
              </div>

              {/* Seguridad */}
              <div className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                Seguridad
              </div>
              <div>
                <ProfileField
                  label="Contraseña"
                  currentValue="••••••••"
                  value={newPassword}
                  onChange={setNewPassword}
                  onSave={() => handleUpdate('password')}
                  type="password"
                  placeholder="Nueva contraseña"
                />
              </div>
            </div>
          )}
        </div>

        <div className="hidden sm:block col-span-1" />
      </div>
    </div>
  );
}

export default ProfilePage;
