import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard } from './core/guards/auth.guards';

export const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./auth/login').then((m) => m.Login) },

  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./layouts/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', loadComponent: () => import('./admin/dashboard').then((m) => m.AdminDashboard) },
      { path: 'libros', loadComponent: () => import('./admin/libros').then((m) => m.AdminLibros) },
      { path: 'dispositivos', loadComponent: () => import('./admin/dispositivos').then((m) => m.AdminDispositivos) },
      { path: 'usuarios', loadComponent: () => import('./admin/usuarios').then((m) => m.AdminUsuarios) },
      { path: 'prestamos', loadComponent: () => import('./admin/prestamos').then((m) => m.AdminPrestamos) },
      { path: 'estadisticas', loadComponent: () => import('./admin/estadisticas').then((m) => m.AdminEstadisticas) },
      { path: 'ingresos', loadComponent: () => import('./admin/ingresos').then((m) => m.AdminIngresos) },
    ],
  },

  {
    path: 'inicio',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/user-layout').then((m) => m.UserLayout),
    children: [
      { path: '', loadComponent: () => import('./user/inicio').then((m) => m.UserInicio) },
      { path: 'catalogo', loadComponent: () => import('./user/catalogo').then((m) => m.UserCatalogo) },
      { path: 'mis-prestamos', loadComponent: () => import('./user/mis-prestamos').then((m) => m.UserMisPrestamos) },
      { path: 'dispositivos', loadComponent: () => import('./user/dispositivos').then((m) => m.UserDispositivos) },
    ],
  },

  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];