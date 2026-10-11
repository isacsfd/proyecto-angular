import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();

  let request = req;
  if (token) {
    request = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(request).pipe(
    catchError((err) => {
      // Solo un 401 de la API principal (FastAPI) invalida la sesión global.
      // Los 401 de cualquier otra API secundaria se propagan sin cerrar la
      // sesión, para que la página muestre un error comprensible.
      const esApiPrincipal = req.url.startsWith(environment.apiUrl);
      if (err.status === 401 && esApiPrincipal) {
        sessionStorage.removeItem('jwt_token');
        sessionStorage.removeItem('userData');
        sessionStorage.removeItem('sesionActiva');
        auth.usuario.set(null);
        router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};