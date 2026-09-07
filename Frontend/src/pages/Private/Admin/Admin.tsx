import { Navigate, NavLink, Route } from 'react-router-dom';
import { PrivateRoutes } from '@/models';
import RoutesWithNotFound from '@/utilities/RoutesWithNotFound.utility';
import ProductsListPage from './Products/ProductsListPage';
import ProductFormPage from './Products/ProductFormPage';
import CategoriesPage from './Categories/CategoriesPage';
import UsersPage from './Users/UsersPage';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium border-b-2 transition-colors ${
    isActive
      ? 'text-blue-700 border-blue-600'
      : 'text-gray-600 border-transparent hover:text-blue-700 hover:border-blue-200'
  }`;

/** Panel de administración (protegido por RoleGuard ADMIN en App.tsx).
 * Layout con una navegación entre tres páginas separadas por
 * responsabilidad — antes vivían todas juntas en un solo componente:
 * - /admin/productos        listado (ProductsListPage)
 * - /admin/productos/nuevo  crear (ProductFormPage, sin :id)
 * - /admin/productos/:id/editar  editar (ProductFormPage, con :id)
 * - /admin/categorias       gestión de categorías (CategoriesPage)
 * - /admin/usuarios         gestión de usuarios (UsersPage) — crear/editar
 *   en un modal (UserFormModal) en vez de una página aparte, no una ruta
 *   propia como los productos.
 */
function Admin() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Panel de administración</h1>

      <nav className="flex gap-2 border-b border-gray-200 mb-6">
        <NavLink to={`/${PrivateRoutes.ADMIN}/productos`} end className={tabClass}>
          Productos
        </NavLink>
        <NavLink to={`/${PrivateRoutes.ADMIN}/productos/nuevo`} className={tabClass}>
          Nuevo producto
        </NavLink>
        <NavLink to={`/${PrivateRoutes.ADMIN}/categorias`} className={tabClass}>
          Categorías
        </NavLink>
        <NavLink to={`/${PrivateRoutes.ADMIN}/usuarios`} className={tabClass}>
          Usuarios
        </NavLink>
      </nav>

      <RoutesWithNotFound>
        <Route path="/" element={<Navigate to="productos" replace />} />
        <Route path="productos" element={<ProductsListPage />} />
        <Route path="productos/nuevo" element={<ProductFormPage />} />
        <Route path="productos/:id/editar" element={<ProductFormPage />} />
        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="usuarios" element={<UsersPage />} />
      </RoutesWithNotFound>
    </div>
  );
}

export default Admin;
