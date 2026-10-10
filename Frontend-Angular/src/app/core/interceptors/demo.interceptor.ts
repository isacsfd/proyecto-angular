import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DemoService } from '../services/demo.service';

/**
 * demoInterceptor — En modo demostración NO se llama a la API:
 * se devuelven datos estáticos realistas (DemoService).
 * En modo real, la petición continúa normalmente (no se altera nada).
 */
export const demoInterceptor: HttpInterceptorFn = (req, next) => {
  const demo = inject(DemoService);
  if (!demo.activo()) {
    return next(req);
  }

  const path = new URL(req.url, 'http://localhost').pathname;
  const params: Record<string, string> = {};
  req.params.keys().forEach((k) => (params[k] = req.params.get(k) ?? ''));

  const respuesta = demo.responder(req.method, path, params);
  if (respuesta !== undefined) {
    return of(new HttpResponse({ status: 200, body: respuesta })) as Observable<HttpEvent<unknown>>;
  }
  // Endpoint no cubierto en demo: devolver vacío (nunca tocar la API en modo demo)
  return of(new HttpResponse({ status: 200, body: [] })) as Observable<HttpEvent<unknown>>;
};