import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { demoInterceptor } from './core/interceptors/demo.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // demoInterceptor primero: en modo demostración evita llamar a la API.
    provideHttpClient(withInterceptors([demoInterceptor, jwtInterceptor])),
  ],
};