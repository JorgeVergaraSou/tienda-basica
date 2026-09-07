//src/api/axios.ts
import axios from 'axios';
import { apiUrl } from '@/utilities';
import { UserKey } from '@/redux/states/user';
import { PublicRoutes } from '@/models';
import { servidorNoDisponibleAlert } from '@/utilities/alerts/session-alerts.utils';

export const api = axios.create({
  baseURL: apiUrl,
});

/**
 * Evita disparar varias alertas/redirecciones a la vez cuando el
 * servidor está caído: varios componentes pueden estar pidiendo datos
 * en paralelo y todos van a fallar con el mismo error de conexión casi
 * al mismo tiempo.
 */
let avisandoServidorCaido = false;

api.interceptors.request.use(
  (config) => {
    const userStorage = localStorage.getItem(UserKey);

    if (userStorage) {
      const user = JSON.parse(userStorage);

      if (user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,

  (error) => {

    if (error.response?.status === 401) {

      localStorage.removeItem(UserKey);

      window.location.href = `/${PublicRoutes.LOGIN}`;

    } else if (!error.response) {

      // No hubo respuesta del servidor: caído, sin red, o similar
      // (ej. ERR_CONNECTION_REFUSED). Se cierra la sesión igual que en
      // un 401, para forzar un login nuevo cuando el servidor vuelva.
      const enLogin = window.location.pathname.startsWith(`/${PublicRoutes.LOGIN}`);

      if (!avisandoServidorCaido && !enLogin) {
        avisandoServidorCaido = true;

        localStorage.removeItem(UserKey);

        servidorNoDisponibleAlert().then(() => {
          window.location.href = `/${PublicRoutes.LOGIN}`;
        });
      }
    }

    const message =
      error.response?.data?.message ||
      (!error.response ? 'No se pudo conectar con el servidor' : 'Error desconocido');

    return Promise.reject(
      new Error(message),
    );
  },
);
