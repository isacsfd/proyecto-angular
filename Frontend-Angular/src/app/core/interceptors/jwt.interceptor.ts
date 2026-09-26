import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

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
      if (err.status === 401) {
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