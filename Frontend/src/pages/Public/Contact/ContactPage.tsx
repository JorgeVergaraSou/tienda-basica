import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendContactMessageService } from '@/services';
import { getErrorMessage } from '@/utilities';
import { Button } from '@/components/ui';

interface ContactFormState {
  nombre: string;
  email: string;
  mensaje: string;
}

const emptyForm: ContactFormState = { nombre: '', email: '', mensaje: '' };

/** Página pública de contacto — sin login (ver POST /contacto en el
 * backend, sin @Auth). El mensaje le llega al ADMIN por mail, al email
 * que haya configurado en el panel (Admin/Contact/ContactSettingsPage.tsx)
 * — si todavía no configuró ninguno, el backend responde 400 con un
 * mensaje claro en vez de fallar en silencio, y se lo mostramos tal cual
 * llega (getErrorMessage ya lo normaliza). */
function ContactPage() {
  const [form, setForm] = useState<ContactFormState>(emptyForm);
  const [enviando, setEnviando] = useState(false);
  const [formError, setFormError] = useState('');
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.nombre.trim() || !form.email.trim() || !form.mensaje.trim()) {
      setFormError('Todos los campos son obligatorios');
      return;
    }

    setEnviando(true);
    setFormError('');

    try {
      await sendContactMessageService({
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        mensaje: form.mensaje.trim(),
      });

      setForm(emptyForm);
      setEnviado(true);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link to="/" className="text-blue-600 hover:underline text-sm">
        ← Volver al catálogo
      </Link>

      <h1 className="text-2xl font-semibold mt-4 mb-2">Contacto</h1>
      <p className="text-gray-600 mb-6">
        ¿Tenés una consulta? Escribinos y te respondemos a la brevedad.
      </p>

      {enviado ? (
        <p className="text-green-700 bg-green-50 border border-green-200 rounded-md px-4 py-3">
          ¡Gracias! Tu mensaje se envió correctamente, te vamos a responder pronto.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
            />
          </div>

          <div>
            <label htmlFor="mensaje">Mensaje</label>
            <textarea
              id="mensaje"
              value={form.mensaje}
              onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
              rows={5}
              className="border border-gray-300 rounded-md px-3 py-2 w-full"
            />
          </div>

          {formError && <p className="text-red-600 text-sm">{formError}</p>}

          <div>
            <Button type="submit" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar mensaje'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default ContactPage;
