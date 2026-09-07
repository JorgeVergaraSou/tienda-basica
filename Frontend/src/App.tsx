
import { BrowserRouter, Route } from 'react-router-dom'
import { PrivateRoutes, PublicRoutes, Roles } from './models'
import { AuthGuard } from './guards'
import { Suspense, lazy } from 'react'
import { Provider } from 'react-redux'
import store from './redux/store'
import RoleGuard from './guards/rol.guard'
import Admin from './pages/Private/Admin/Admin'
import Header from './components/Header'
import UserPage from './pages/Private/User/User'
import ProfilePage from './pages/Private/Profile'
import { LogoutRoute } from './components/Logout/LogoutRoute'
import RoutesWithNotFound from './utilities/RoutesWithNotFound.utility'
import GuestPage from './pages/Private/Guest/Guest'
import Catalog from './pages/Public/Catalog/Catalog'
import ProductDetail from './pages/Public/ProductDetail/ProductDetail'
import ServiceUnavailable from './pages/Public/ServiceUnavailable/ServiceUnavailable'

const Login = lazy(() => import('./pages/Login/Login'))
const Private = lazy(() => import('./pages/Private/Private'))

function App() {

  return (
    <div>
      <div></div>
      <div>
        <Suspense fallback={<div>Loading...</div>}>

          <Provider store={store}>

            <BrowserRouter>
              <Header />

              <RoutesWithNotFound>

                {/* Rutas públicas — el catálogo es la home del sitio, sin login */}
                <Route path='/' element={<Catalog />} />
                <Route path='productos/:id' element={<ProductDetail />} />
                <Route path={PublicRoutes.LOGIN} element={<Login />} />
                {/* destino del interceptor de axios cuando no hay respuesta del
                    servidor (ver src/api/axios.ts) — pública, sin login, y sin
                    fetch propio al montarse (ver ServiceUnavailable.tsx) */}
                <Route
                  path={PublicRoutes.SERVICE_UNAVAILABLE}
                  element={<ServiceUnavailable />}
                />
                {/* No hay signup público en el backend (POST /auth/nuevo-usuario
                    requiere ADMIN) — la ruta de registro queda deshabilitada.
                    pages/Register/Register.tsx y services/register.service.ts
                    quedan sin usar por ahora, sin borrar (ver CLAUDE.md). */}

                {/* Rutas privadas protegidas por AuthGuard */}
                <Route element={<AuthGuard privateValidation={true} />}>

                  {/* Rutas accesibles para todos los usuarios autenticados */}
                  <Route path={`${PrivateRoutes.PRIVATE}/*`} element={<Private />} />
                  <Route path={PrivateRoutes.PERFIL} element={<ProfilePage />} />

                  {/* Rutas protegidas por RoleGuard */}
                  <Route element={<RoleGuard roles={[Roles.ADMIN]} />}>
                    {/* /* porque Admin tiene su propio sub-ruteo interno
                        (productos, productos/nuevo, productos/:id/editar,
                        categorias) — ver pages/Private/Admin/Admin.tsx */}
                    <Route path={`${PrivateRoutes.ADMIN}/*`} element={<Admin />} />
                  </Route>

                  <Route element={<RoleGuard roles={[Roles.USER]} />}>
                    {/* /* porque UserPage tiene su propio sub-ruteo interno
                        (cargar producto, mis-productos) — ver
                        pages/Private/User/User.tsx */}
                    <Route path={`${PrivateRoutes.USER}/*`} element={<UserPage />} />
                  </Route>

                  <Route element={<RoleGuard roles={[Roles.GUEST]} />}>
                    <Route path={PrivateRoutes.GUEST} element={<GuestPage />} />
                  </Route>

                  {/* Ruta para logout */}
                  <Route path={PrivateRoutes.LOGOUT} element={<LogoutRoute />} />
                </Route>
              </RoutesWithNotFound>
            </BrowserRouter>

          </Provider>

        </Suspense>

      </div>
    </div>
  )
}

export default App
