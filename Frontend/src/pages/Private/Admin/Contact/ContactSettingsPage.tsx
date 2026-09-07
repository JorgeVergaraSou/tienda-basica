import { useEffect, useState } from 'react';
import { getContactSettingsService, updateContactSettingsService } from '@/services';
import { getErrorMessage } from '@/utilities';
import { showSuccess } from '@/utilities/alerts/alert.utils';
import { Button } from '@/components/ui';

interface SettingsFormState {
  email: string;
  whatsapp: string;
}

/** Configuración del canal de contacto (ADMIN-only) — dónde le llegan al
 * negocio los mensajes del formulario público (pages/Public/Contact/).
 * No es parte de Profile.tsx a propósito: es un dato del negocio (puede
 * haber varios ADMIN, ver Admin/Users/), no de una cuenta personal
 * puntual, y no tiene relación con el email de *login* de nadie. */
function ContactSettingsPage() {
  const [form, setForm] = useState<SettingsFormState>({ email: '', whatsapp: '' });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      setLoading(true);
      setLoadError('');

      try {
        const data = await getContactSettingsService();
        if (cancelado) return;

        setForm({
          email: data.email ?? '',
          whatsapp: data.whatsapp ?? '',
        });
      } catch (error) {
        if (!cancelado) setLoadError(getErrorMessage(error));
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaving(true);
    setFormError('');

    try {
      // input vacío = mandar null (vaciar el campo) — ver
      // UpdateContactSettingsData, este endpoint sí distingue "vaciar" de
      // "no tocar", pero acá siempre se mandan los dos.
      await updateContactSettingsService({
        email: form.email.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
      });

      await showSuccess('Configuración de contacto actualizada');
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Cargando...</p>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Contacto</h2>
      <p className="text-sm text-gray-500 mb-4">
        Acá llegan los mensajes que los clientes mandan desde la página pública de contacto.
      </p>

      {loadError && <p className="text-red-600 mb-4">{loadError}</p>}

      <form
        onSubmit={handleSubmit}
        className="border border-gray-200 rounded-md p-4 max-w-md flex flex-col gap-3"
      >
        <div>
          <label htmlFor="email">Email de contacto</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Sin configurar — el formulario público no va a funcionar"
            className="border border-gray-300 rounded-md px-3 py-2 w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Los mensajes del formulario de contacto llegan acá. Sin un email configurado, los
            clientes no van a poder enviar mensajes.
          </p>
        </div>

        <div>
          <label htmlFor="whatsapp">WhatsApp</label>
          <input
            id="whatsapp"
            type="text"
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            placeholder="Ej: +5491122334455"
            className="border border-gray-300 rounded-md px-3 py-2 w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Por ahora este número solo se guarda — todavía no envía notificaciones automáticas por
            WhatsApp.
          </p>
        </div>

        {formError && <p className="text-red-600 text-sm">{formError}</p>}

        <div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ContactSettingsPage;
