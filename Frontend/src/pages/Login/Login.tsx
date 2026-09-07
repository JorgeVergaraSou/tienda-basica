import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { createUser } from '@/redux/states/user';
import { loginService } from '@/services';
import { getErrorMessage, getRoleRoute } from '@/utilities';
import { Roles } from '@/models';
import { Button } from '@/components/ui';

function Login() {
  const [nickUsuarioInput, setNickUsuarioInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!nickUsuarioInput || !passwordInput) {
      return setError('Todos los campos son obligatorios');
    }
    setLoading(true);
    setError('');
    try {
      const { token, nickUsuario, role, name, idUser } = await loginService(nickUsuarioInput, passwordInput);

      dispatch(createUser({ nickUsuario, role, token, name, idUser }));

      const roleRoute = getRoleRoute(role as Roles);

      // Obtener la ruta de redirección de la query string
      const query = new URLSearchParams(location.search);
      const redirectPath = query.get('redirect') || roleRoute;

      navigate(redirectPath, { replace: true });

    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div>

        <div></div>

        <div>
          <h2>LOGIN</h2>
          <form onSubmit={handleLogin} >
            <div>
              <label htmlFor='nickUsuario' >
                Usuario
              </label>
              <input
                name='nickUsuario'
                id='nickUsuario'
                type='text'
                placeholder='usuario'
                onChange={(e) => setNickUsuarioInput(e.target.value)}
              />
              <label htmlFor='password'>
                Contraseña
              </label>
              <input
                name='password'
                id='password'
                type='password'
                placeholder='******'
                onChange={(e) => setPasswordInput(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>Entrar</Button>

            {error && <p>{error}</p>} {/* Mostrar el error */}
          </form>
        </div>
      </div>

      <div></div>

    </div>
  );
}

export default Login;
