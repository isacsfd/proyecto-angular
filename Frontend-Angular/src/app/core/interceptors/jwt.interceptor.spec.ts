import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { jwtInterceptor } from './jwt.interceptor';
import { AuthService } from '../services/auth.service';
import { DemoService } from '../services/demo.service';
import { environment } from '../../../environments/environment';

const URL_FASTAPI = `${environment.apiUrl}/usuarios/`;
// API secundaria genÃ©rica (cualquier origen distinto de FastAPI) para verificar
// que sus 401 no cierran la sesiÃ³n global.
const URL_SECUNDARIA = 'http://localhost:3002/api/proveedores';

function setup() {
  TestBed.resetTestingModule();
  const nav = vi.fn(() => Promise.resolve(true));
  TestBed.configureTestingModule({
    providers: [
      AuthService,
      DemoService,
      { provide: Router, useValue: { navigate: nav } },
      provideHttpClient(withInterceptors([jwtInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  sessionStorage.clear();
  return { nav };
}

function sesionReal() {
  sessionStorage.setItem('jwt_token', 'token-de-prueba');
  sessionStorage.setItem('sesionActiva', 'true');
  sessionStorage.setItem(
    'userData',
    JSON.stringify({ id: 1, nombre: 'A', rol: 'super_administrador', identificacion: '1' }),
  );
}

async function peticion(url: string, status: number): Promise<number> {
  const http = TestBed.inject(HttpClient);
  const ctrl = TestBed.inject(HttpTestingController);
  const promesa = firstValueFrom(http.get<unknown>(url)).then(
    () => 0,
    (e: HttpErrorResponse) => e.status,
  );
  ctrl.expectOne(url).flush({}, { status, statusText: status === 401 ? 'Unauthorized' : 'Error' });
  return promesa;
}

describe('jwtInterceptor', () => {
  afterEach(() => sessionStorage.clear());

  it('un 401 de FastAPI limpia la sesiÃ³n y redirige al login', async () => {
    const { nav } = setup();
    sesionReal();
    const status = await peticion(URL_FASTAPI, 401);
    expect(status).toBe(401);
    expect(sessionStorage.getItem('jwt_token')).toBeNull();
    expect(sessionStorage.getItem('userData')).toBeNull();
    expect(sessionStorage.getItem('sesionActiva')).toBeNull();
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    expect(nav).toHaveBeenCalledWith(['/login']);
  });

  it('un 401 de una API secundaria NO cierra la sesión global y se propaga', async () => {
    const { nav } = setup();
    sesionReal();
    const status = await peticion(URL_SECUNDARIA, 401);
    expect(status).toBe(401);
    expect(sessionStorage.getItem('jwt_token')).toBe('token-de-prueba');
    expect(sessionStorage.getItem('sesionActiva')).toBe('true');
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(true);
    expect(nav).not.toHaveBeenCalled();
  });

  it('errores 401 de una ruta relativa (API secundaria sin host) tampoco cierran sesión', async () => {
    const { nav } = setup();
    sesionReal();
    const status = await peticion('/api/proveedores', 401);
    expect(status).toBe(401);
    expect(sessionStorage.getItem('sesionActiva')).toBe('true');
    expect(nav).not.toHaveBeenCalled();
  });

  it('un error 500 de FastAPI no cierra la sesiÃ³n', async () => {
    const { nav } = setup();
    sesionReal();
    const status = await peticion(URL_FASTAPI, 500);
    expect(status).toBe(500);
    expect(sessionStorage.getItem('sesionActiva')).toBe('true');
    expect(nav).not.toHaveBeenCalled();
  });
});