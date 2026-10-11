import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { describe, it, expect, vi, afterEach } from 'vitest';

import { AuthService, Usuario } from './auth.service';
import { DemoService } from './demo.service';
import { environment } from '../../../environments/environment';

const USUARIO: Usuario = { id: 1, nombre: 'Ana Pérez', rol: 'Estudiante', identificacion: '1001' };
const RESPUESTA = {
  message: 'Inicio de sesión exitoso',
  access_token: 'jwt-de-prueba',
  token_type: 'bearer',
  user: USUARIO,
};

function setup() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      AuthService,
      DemoService,
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: Router, useValue: { navigate: vi.fn(() => Promise.resolve(true)) } },
    ],
  });
  sessionStorage.clear();
  const auth = TestBed.inject(AuthService);
  const demo = TestBed.inject(DemoService);
  const http = TestBed.inject(HttpTestingController);
  return { auth, demo, http };
}

describe('AuthService', () => {
  afterEach(() => sessionStorage.clear());

  it('no autentica cuando no existe un JWT válido almacenado', () => {
    const { auth } = setup();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.getToken()).toBeNull();
    expect(auth.usuario()).toBeNull();
  });

  it('procesa correctamente una respuesta de login válida del backend', () => {
    const { auth, http } = setup();
    let resultado: unknown;
    auth.login('1001', 'Clave1234!').subscribe((r) => (resultado = r));
    const req = http.expectOne(`${environment.apiUrl}/login`);
    expect(req.request.method).toBe('POST');
    req.flush(RESPUESTA);

    expect(resultado).toBeTruthy();
    expect(auth.getToken()).toBe('jwt-de-prueba');
    expect(sessionStorage.getItem('sesionActiva')).toBe('true');
    expect(auth.usuario()?.rol).toBe('Estudiante');
    expect(auth.isAuthenticated()).toBe(true);
    http.verify();
  });

  it('gestiona el error de autenticación sin iniciar sesión', () => {
    const { auth, http } = setup();
    let error = false;
    auth.login('1001', 'clave-mala').subscribe({ error: () => (error = true) });
    http
      .expectOne(`${environment.apiUrl}/login`)
      .flush({ detail: 'Identificación o contraseña incorrectos' }, { status: 401, statusText: 'Unauthorized' });

    expect(error).toBe(true);
    expect(auth.getToken()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.usuario()).toBeNull();
    http.verify();
  });

  it('el modo demo establece una identidad demo sin fingir un JWT real', () => {
    const { auth, demo } = setup();
    auth.loginDemo('super_administrador');
    expect(demo.activo()).toBe(true);
    expect(auth.isDemo()).toBe(true);
    expect(auth.getToken()).toBeNull();
    expect(sessionStorage.getItem('sesionActiva')).toBeNull();
    expect(sessionStorage.getItem('userData')).toBeNull();
    expect(auth.usuario()?.rol).toBe('super_administrador');
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('cerrar sesión elimina credenciales, usuario y desactiva el demo', () => {
    const { auth, http } = setup();
    auth.login('1001', 'Clave1234!').subscribe();
    http.expectOne(`${environment.apiUrl}/login`).flush(RESPUESTA);
    auth.loginDemo('Estudiante');

    auth.logout();

    expect(auth.getToken()).toBeNull();
    expect(sessionStorage.getItem('userData')).toBeNull();
    expect(sessionStorage.getItem('sesionActiva')).toBeNull();
    expect(auth.usuario()).toBeNull();
    expect(auth.isDemo()).toBe(false);
    expect(auth.isAuthenticated()).toBe(false);
  });
});