import { useCallback, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AppStore } from '@/redux/store';
import { PrivateRoutes, Roles } from '@/models';
import { useClickOutside } from '@/hooks';
import useLogout from '../Logout/Logout';

interface MenuLink {
  label: string;
  path: string;
  isAction?: boolean;
}

// Header oscuro (slate-800) a propósito, para separarse claramente del
// catálogo y el resto de las páginas (fondo claro). El link de la página
// actual se marca con un borde inferior celeste, aunque no se esté con el
// mouse encima — mismo criterio de "dónde estoy parado" que un navbar de
// e-commerce típico.
const linkBaseClass =
  'px-3 py-2 rounded-md text-sm font-medium cursor-pointer focus:outline-none transition-colors border-b-2';
const linkInactiveClass =
  'text-slate-200 hover:bg-white/10 hover:text-white border-transparent';
const linkActiveClass = 'text-white border-blue-400';
// "Cerrar sesión" no es una página más — se distingue con un tono rojizo
// para que no se confunda con el resto de la navegación.
const logoutClass =
  'text-red-300 hover:bg-white/10 hover:text-red-100 border-transparent';

/** Menú real de la tienda. Sin submenús desplegables a propósito: a
 * diferencia de un panel con decenas de secciones, acá cada rol tiene
 * como máximo un puñado de links (Catálogo, Panel/Cargar producto,
 * Perfil, Cerrar sesión) — no hace falta agrupar nada todavía. Si el
 * catálogo de páginas crece (ej. "Pedidos", "Reportes"), ahí sí conviene
 * agregar la lógica de agrupar + desplegar por sección. */
function DropdownMenu() {
  const user = useSelector((state: AppStore) => state.user);
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const logOut = useLogout();

  const links: MenuLink[] = [
    { label: 'Catálogo', path: '/' },
    ...(user.role === Roles.ADMIN
      ? [{ label: 'Panel de administración', path: `/${PrivateRoutes.ADMIN}` }]
      : []),
    ...(user.role === Roles.USER
      ? [{ label: 'Cargar producto', path: `/${PrivateRoutes.USER}` }]
      : []),
    { label: 'Perfil', path: `/${PrivateRoutes.PERFIL}` },
    { label: 'Cerrar sesión', path: PrivateRoutes.LOGOUT, isAction: true },
  ];

  const handleSelect = (link: MenuLink) => {
    if (link.isAction) {
      logOut();
    }
    setIsOpen(false);
  };

  // Cierra el menú mobile si se clickea afuera, sin necesidad de tocar
  // cada link a mano.
  const menuRef = useRef<HTMLUListElement>(null);
  const cerrarMenu = useCallback(() => setIsOpen(false), []);
  useClickOutside(menuRef, cerrarMenu);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const linkClass = (link: MenuLink) => {
    if (link.isAction) {
      return `${linkBaseClass} ${logoutClass}`;
    }
    return `${linkBaseClass} ${isActive(link.path) ? linkActiveClass : linkInactiveClass}`;
  };

  const renderLink = (link: MenuLink, mobile: boolean) => {
    const className = `${linkClass(link)} ${mobile ? 'block w-full text-left' : ''}`.trim();

    if (link.isAction) {
      return (
        <button type="button" onClick={() => handleSelect(link)} className={className}>
          {link.label}
        </button>
      );
    }

    return (
      <Link to={link.path} onClick={() => handleSelect(link)} className={className}>
        {link.label}
      </Link>
    );
  };

  return (
    <nav className="bg-slate-800 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">
          Hola, {user.name || 'Usuario'}
        </span>

        <ul className="hidden md:flex md:items-center md:gap-1">
          {links.map((link) => (
            <li key={link.path}>{renderLink(link, false)}</li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Menu
        </button>
      </div>

      {isOpen && (
        <ul ref={menuRef} className="md:hidden flex flex-col gap-1 px-4 pb-4">
          {links.map((link) => (
            <li key={link.path}>{renderLink(link, true)}</li>
          ))}
        </ul>
      )}
    </nav>
  );
}

export default DropdownMenu;
