import { useSelector } from "react-redux";
import { AppStore } from "@/redux/store";
import { useEffect, useState } from "react";
import { profileService, updateUserService } from "@/services";
import { getErrorMessage } from "@/utilities";
import { User } from "@/interfaces";
import { Button } from "@/components/ui";

function ProfilePage() {
  const user = useSelector((state: AppStore) => state.user);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [message, setMessage] = useState('');
  const [profileData, setProfileData] = useState<User | null>(null); // Estado para los datos del perfil

  // Función para obtener datos del perfil
  const fetchProfileData = async () => {

    try {
      const response = await profileService();
      setProfileData(response); // /auth/profile devuelve el perfil directo, sin envolver
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  };

  // No usa fetchProfileData() acá: el linter (react-hooks/set-state-in-effect,
  // desde eslint-plugin-react-hooks 7) marca como error llamar dentro de un
  // efecto a una función que termina llamando setState, aunque sea async.
  // Encadenar la promesa evita el falso positivo; fetchProfileData() sigue
  // usándose para refrescar el perfil después de un update (handleUpdate).
  useEffect(() => {
    profileService()
      .then((response) => setProfileData(response))
      .catch((error) => setMessage(getErrorMessage(error)));
  }, []);

  const handleUpdate = async (field: string) => {

    const fieldValidations: Record<string, { value: string; message: string }> = {
      nombre: { value: newName, message: 'El campo nombre no puede estar vacío.' },
      email: { value: newEmail, message: 'El campo email no puede estar vacío.' },
      password: { value: newPassword, message: 'El campo contraseña no puede estar vacío.' },
    };

    // Verifica si el campo que se está actualizando tiene un valor vacío
    if (fieldValidations[field] && fieldValidations[field].value.trim() === '') {
      setMessage(fieldValidations[field].message);
      return;
    }

    // Crea el objeto de datos a actualizar
    const updateData: Record<string, unknown> = { currentPassword };

    // Asigna el valor al campo correspondiente
    if (field in fieldValidations) {
      updateData[field] = fieldValidations[field].value;
    }

    try {
      // PATCH /auth/updateUser/:id no devuelve body (void) — no hay
      // response.message que leer, el éxito se confirma con el 2xx.
      await updateUserService(user.idUser, updateData);

      setMessage('Perfil actualizado correctamente.');

      await fetchProfileData();

    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setCurrentPassword('');
    }
  };


  return (
    <div>
      <div><h1>Perfil {user.role}</h1></div>
      <div>
        <div>

        </div>
        <div>

          <ul>


            {profileData && (
              <>
                <li>
                  <div>
                    <label>Nombre: {profileData.nombre} {profileData.apellido}</label>
                    <input
                      type="text"
                      placeholder="Cambiar nombre"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)} />
                    <Button onClick={() => handleUpdate('nombre')}>Cambiar nombre</Button>
                  </div>
                </li>
                <li>
                  <div>
                    <label>Email: {profileData.email}</label>
                    <input
                      type="email"
                      placeholder="Cambiar email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                    <Button onClick={() => handleUpdate('email')}>Cambiar email</Button>
                  </div>
                </li>
                <li>
                  <div>
                    <label>Cambiar contraseña:</label>
                    <input
                      type="password"
                      placeholder="Nueva contraseña"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Button onClick={() => handleUpdate('password')}>Cambiar contraseña</Button>
                  </div>
                </li>

              </>
            )}
            <li>


              <div>
                <div>
                  Contraseña actual:
                  <input
                    type="password"
                    placeholder="Ingresa tu contraseña actual"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
              </div>
            </li>
          </ul>

          {/* Mostrar mensaje de éxito o error */}
          {message && <div>{message}</div>}
        </div>
        <div></div>
      </div>
    </div>
  );
}

export default ProfilePage;
