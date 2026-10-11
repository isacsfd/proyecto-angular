import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, afterEach, vi } from 'vitest';

import { Login } from './login';
import { AuthService, Usuario } from '../../../../core/services/auth.service';
import { DemoService } from '../../../../core/services/demo.service';
import { environment } from '../../../../../environments/environment';

const URL_LOGIN = `${environment.apiUrl}/login`;
const ESTUDIANTE: Usuario = { id: 2, nombre: 'Ana', rol: 'Estudiante', identificacion: '1001' };
const LOGIN_OK = { message: 'ok', access_token: 't1', token_type: 'bearer', user: ESTUDIANTE };

function setup() {
  vi.useFakeTimers();
  TestBed.resetTestingModule();
  const nav = vi.fn<(_: unknown) => Promise<boolean>>(() => Promise.resolve(true));
  TestBed.configureTestingModule({
    imports: [Login],
    providers: [
      AuthService,
      DemoService,
      { provide: Router, useValue: { navigate: nav } },
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  sessionStorage.clear();
  const fixture = TestBed.createComponent(Login);
  const http = TestBed.inject(HttpTestingController);
  const comp = fixture.componentInstance as unknown as {
    identificacion: string;
    password: string;
    rol: string;
    modoDemo: { set: (v: boolean) => void };
    aceptar: () => Promise<void>;
    mensaje: () => string;
    tipoMensaje: () => string;
  };
  return { comp, nav, http };
}

describe('Login', () => {
  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('valida que se ingresen identificación y contraseña', async () => {
    const { comp, http } = setup();
    comp.identificacion = '';
    comp.password = '';
    await comp.aceptar();
    expect(comp.mensaje()).toContain('identificación y contraseña');
    http.expectNone(URL_LOGIN);
  });

  it('permite el acceso con rol coincidente y navega a la ruta del rol', async () => {
    const { comp, nav, http } = setup();
    comp.identificacion = '1001';
    comp.password = 'Clave1234!';
    comp.rol = 'Estudiante';

    const p = comp.aceptar();
    http.expectOne(URL_LOGIN).flush(LOGIN_OK);
    await p;

    expect(comp.tipoMensaje()).toBe('success');
    vi.advanceTimersByTime(900);
    expect(nav).toHaveBeenCalled();
    expect((nav.mock.calls[0][0] as string[])[0]).toBe('/inicio');
  });

  it('rechaza el rol seleccionado incorrecto, limpia sesión y no navega', async () => {
    const { comp, nav, http } = setup();
    comp.identificacion = '1001';
    comp.password = 'Clave1234!';
    comp.rol = 'Administrador';

    const p = comp.aceptar();
    http.expectOne(URL_LOGIN).flush(LOGIN_OK);
    await p;

    expect(comp.mensaje()).toBe('El rol seleccionado no coincide con tus credenciales.');
    expect(comp.tipoMensaje()).toBe('danger');
    const auth = TestBed.inject(AuthService);
    expect(auth.getToken()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
    // El desajuste cierra sesión: navega al login, nunca al panel del rol.
    expect(nav).toHaveBeenCalledWith(['/login']);
    expect(nav).not.toHaveBeenCalledWith(['/inicio']);
    expect(nav).not.toHaveBeenCalledWith(['/admin']);
  });

  it('presenta el error del backend cuando las credenciales no son válidas', async () => {
    const { comp, nav, http } = setup();
    comp.identificacion = '1001';
    comp.password = 'clave-mala';

    const p = comp.aceptar();
    http
      .expectOne(URL_LOGIN)
      .flush({ detail: 'Identificación o contraseña incorrectos' }, { status: 401, statusText: 'Unauthorized' });
    await p;

    expect(comp.mensaje()).toContain('Identificación o contraseña incorrectos');
    expect(comp.tipoMensaje()).toBe('danger');
    expect(nav).not.toHaveBeenCalled();
    expect(TestBed.inject(AuthService).getToken()).toBeNull();
  });

  it('no navega al panel cuando la autenticación real falla', async () => {
    const { comp, nav, http } = setup();
    comp.identificacion = '1001';
    comp.password = 'mal';
    const p = comp.aceptar();
    http.expectOne(URL_LOGIN).flush({ detail: 'x' }, { status: 401, statusText: 'Unauthorized' });
    await p;
    expect(nav).not.toHaveBeenCalled();
  });

  it('el modo demo entra con identidad demo sin llamar a la API', async () => {
    const { comp, nav, http } = setup();
    comp.modoDemo.set(true);
    comp.rol = 'Administrador';

    const p = comp.aceptar();
    await p;

    const demo = TestBed.inject(DemoService);
    expect(demo.activo()).toBe(true);
    expect(TestBed.inject(AuthService).isDemo()).toBe(true);
    expect(sessionStorage.getItem('jwt_token')).toBeNull();
    http.expectNone(URL_LOGIN);

    vi.advanceTimersByTime(600);
    expect(nav).toHaveBeenCalled();
    expect((nav.mock.calls[0][0] as string[])[0]).toBe('/admin');
  });
});