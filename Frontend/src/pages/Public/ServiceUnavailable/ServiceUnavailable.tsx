import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';

/** Destino público al que redirige el interceptor de axios
 * (src/api/axios.ts) cuando una request no obtiene respuesta del
 * servidor (caído, sin red, ERR_CONNECTION_REFUSED, etc.) — reemplaza el
 * redirect viejo a /login, que no tenía sentido para un visitante
 * anónimo navegando el catálogo público: nunca tuvo sesión, y el login
 * tampoco iba a poder autenticar con el servidor caído.
 *
 * A propósito esta página NO le pega a la API al montarse (sin
 * getProductsService, sin nada) — si lo hiciera, aterrizar acá con el
 * servidor todavía caído dispararía el mismo error de conexión de nuevo. */
function ServiceUnavailable() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold mb-2">Servicio no disponible</h1>
      <p className="text-gray-600 mb-6">
        No pudimos conectarnos con el servidor. Puede ser algo temporal — probá de nuevo en unos
        minutos.
      </p>
      <Button onClick={() => navigate('/')}>Volver al catálogo</Button>
    </div>
  );
}

export default ServiceUnavailable;
