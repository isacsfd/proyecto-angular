import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard, moduloGuard } from './core/guards/auth.guards';

export const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./features/auth/pages/login/login').then((m) => m.Login) },

  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./layouts/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', canActivate: [moduloGuard('dashboard')], loadComponent: () => import('./features/admin/pages/dashboard/dashboard').then((m) => m.AdminDashboard) },
      { path: 'libros', canActivate: [moduloGuard('gestion_libros')], loadComponent: () => import('./features/admin/pages/libros/libros').then((m) => m.AdminLibros) },
      { path: 'dispositivos', canActivate: [moduloGuard('gestion_dispositivos')], loadComponent: () => import('./features/admin/pages/dispositivos/dispositivos').then((m) => m.AdminDispositivos) },
      { path: 'usuarios', canActivate: [moduloGuard('gestion_usuarios')], loadComponent: () => import('./features/admin/pages/usuarios/usuarios').then((m) => m.AdminUsuarios) },
      { path: 'prestamos', canActivate: [moduloGuard('gestion_prestamos')], loadComponent: () => import('./features/admin/pages/prestamos/prestamos').then((m) => m.AdminPrestamos) },
      { path: 'estadisticas', canActivate: [moduloGuard('estadisticas')], loadComponent: () => import('./features/admin/pages/estadisticas/estadisticas').then((m) => m.AdminEstadisticas) },
      { path: 'ingresos', canActivate: [moduloGuard('ingresos')], loadComponent: () => import('./features/admin/pages/ingresos/ingresos').then((m) => m.AdminIngresos) },
    ],
  },

  {
    path: 'inicio',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/user-layout').then((m) => m.UserLayout),
    children: [
      { path: '', canActivate: [moduloGuard('inicio')], loadComponent: () => import('./features/user/pages/inicio/inicio').then((m) => m.UserInicio) },
      { path: 'catalogo', canActivate: [moduloGuard('catalogo')], loadComponent: () => import('./features/user/pages/catalogo/catalogo').then((m) => m.UserCatalogo) },
      { path: 'mis-prestamos', canActivate: [moduloGuard('mis_prestamos')], loadComponent: () => import('./features/user/pages/mis-prestamos/mis-prestamos').then((m) => m.UserMisPrestamos) },
      { path: 'dispositivos', canActivate: [moduloGuard('dispositivos')], loadComponent: () => import('./features/user/pages/dispositivos/dispositivos').then((m) => m.UserDispositivos) },
    ],
  },

  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];