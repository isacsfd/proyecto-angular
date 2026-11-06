import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

/** ¿La URL pertenece a una API propia configurada (FastAPI o Express)? */
export function esApiPrincipal(url: string): boolean {
  try {
    const destino = new URL(url, window.location.origin);
    const bases = [environment.apiUrl, environment.expressApiUrl]
      .filter(Boolean)
      .map((baseUrl) => new URL(baseUrl, window.location.origin));
    return bases.some((base) => {
      if (destino.origin !== base.origin) return false;
      const baseRuta = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
      return (
        destino.pathname === base.pathname.replace(/\/$/, '') ||
        destino.pathname.startsWith(baseRuta)
      );
    });
  } catch {
    return false;
  }
}

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();
  const esPrincipal = esApiPrincipal(req.url);

  let request = req;
  // El token solo viaja al origen autorizado de la API, nunca a terceros.
  if (token && esPrincipal && !req.url.endsWith('/login')) {
    request = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(request).pipe(
    catchError((err) => {
      // Solo un 401 de la API principal (FastAPI) invalida la sesión global.
      // Los 401 de cualquier otra API secundaria se propagan sin cerrar la
      // sesión, para que la página muestre un error comprensible.
      if (err.status === 401 && esPrincipal) {
        auth.limpiarSesionLocal();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
