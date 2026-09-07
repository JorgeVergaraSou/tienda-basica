//src/services/contact.service.ts
import { api } from '@/api/axios';
import { ContactSettings } from '@/interfaces';

export interface ContactMessageData {
  nombre: string;
  email: string;
  mensaje: string;
}

/** público — POST /contacto no requiere login, es la página de contacto
 * del catálogo. No devuelve body (ver ContactController.enviarMensaje). */
export const sendContactMessageService = async (data: ContactMessageData): Promise<void> => {
  await api.post('/contacto', data);
};

/** ADMIN — email/WhatsApp donde el negocio recibe los mensajes de
 * contacto, para precargar el form de configuración del panel. */
export const getContactSettingsService = async (): Promise<ContactSettings> => {
  const res = await api.get('/contacto/configuracion');
  return res.data;
};

export interface UpdateContactSettingsData {
  // null explícito = vaciar el campo (a diferencia de otros services de
  // este proyecto, acá no se distingue "no tocar" de "vaciar" — el form
  // de configuración siempre manda los dos campos, ver
  // ContactSettingsPage.tsx).
  email: string | null;
  whatsapp: string | null;
}

export const updateContactSettingsService = async (
  data: UpdateContactSettingsData,
): Promise<ContactSettings> => {
  const res = await api.patch('/contacto/configuracion', data);
  return res.data;
};
