import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

/** Permite el acceso al panel administrativo solo si el rol tiene algún módulo admin. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated() && auth.isAdmin()) {
    return true;
  }
  return router.createUrlTree(['/inicio']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree([auth.rutaInicial()]);
};

/**
 * moduloGuard — impide el acceso por URL directa a módulos no autorizados.
 * Si el rol no tiene el módulo, redirige a su ruta inicial.
 */
export function moduloGuard(modulo: string): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (auth.tienePermiso(modulo)) {
      return true;
    }
    return router.createUrlTree([auth.rutaInicial()]);
  };
}