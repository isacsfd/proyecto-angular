import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree, CanActivateFn } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach } from 'vitest';

import { authGuard, adminGuard, guestGuard, moduloGuard } from './auth.guards';
import { AuthService } from '../services/auth.service';
import { DemoService } from '../services/demo.service';

type Result = true | UrlTree | null;

function guardOf(fn: CanActivateFn): Result {
  return TestBed.runInInjectionContext(() => fn({} as never, {} as never)) as Result;
}

function rutaDe(fn: CanActivateFn): true | string {
  const r = guardOf(fn);
  if (r === true) return true;
  if (r instanceof UrlTree) return TestBed.inject(Router).serializeUrl(r);
  return 'null';
}

function setup() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [AuthService, DemoService, provideHttpClient(), provideRouter([])],
  });
  sessionStorage.clear();
}

function sesionReal(rol: string) {
  sessionStorage.setItem('jwt_token', 'token');
  sessionStorage.setItem('sesionActiva', 'true');
  TestBed.inject(AuthService).usuario.set({ id: 1, nombre: 'A', rol, identificacion: '1' });
}

describe('Guards de navegación y permisos', () => {
  beforeEach(() => setup());

  it('authGuard rechaza a un usuario sin autenticación real', () => {
    expect(rutaDe(authGuard)).toBe('/login');
  });

  it('authGuard permite a un usuario con JWT real', () => {
    sesionReal('Estudiante');
    expect(guardOf(authGuard)).toBe(true);
  });

  it('authGuard permite las pantallas demo solo bajo la identidad demo explícita', () => {
    TestBed.inject(AuthService).loginDemo('Estudiante');
    expect(guardOf(authGuard)).toBe(true);
  });

  it('adminGuard rechaza al Estudiante autenticado y admite al Administrador', () => {
    sesionReal('Estudiante');
    expect(rutaDe(adminGuard)).toBe('/inicio');

    TestBed.inject(AuthService).usuario.set({ id: 1, nombre: 'A', rol: 'Administrador', identificacion: '1' });
    expect(guardOf(adminGuard)).toBe(true);
  });

  it('adminGuard permite el rol demo con permisos administrativos', () => {
    TestBed.inject(AuthService).loginDemo('super_administrador');
    expect(guardOf(adminGuard)).toBe(true);
  });

  it('adminGuard sin sesión real ni demo lleva al login', () => {
    expect(rutaDe(adminGuard)).toBe('/login');
  });

  it('moduloGuard bloquea módulos sin permiso y admite los permitidos al rol', () => {
    sesionReal('Estudiante');
    expect(rutaDe(moduloGuard('gestion_usuarios'))).toBe('/inicio');
    expect(rutaDe(moduloGuard('catalogo'))).toBe(true);

    TestBed.inject(AuthService).usuario.set({ id: 1, nombre: 'A', rol: 'Administrador', identificacion: '1' });
    expect(guardOf(moduloGuard('gestion_usuarios'))).toBe(true);
  });

  it('los guards no confían en un rol que no provenga del backend (sin usuario())', () => {
    sessionStorage.setItem('jwt_token', 'token');
    sessionStorage.setItem('sesionActiva', 'true');
    // Hay JWT, pero no existe identidad de usuario derivada del backend.
    expect(guardOf(authGuard)).toBe(true);
    expect(rutaDe(adminGuard)).toBe('/inicio');
    expect(rutaDe(moduloGuard('gestion_usuarios'))).toBe('/inicio');
  });

  it('guestGuard permite el login solo cuando no hay sesión real ni demo', () => {
    expect(guardOf(guestGuard)).toBe(true);
    sesionReal('Estudiante');
    expect(rutaDe(guestGuard)).toBe('/inicio');
  });

  it('el demo respeta la matriz de permisos al navegar a rutas restringidas', () => {
    TestBed.inject(AuthService).loginDemo('Estudiante');
    expect(guardOf(authGuard)).toBe(true);
    expect(rutaDe(adminGuard)).toBe('/inicio');
    expect(rutaDe(moduloGuard('gestion_usuarios'))).toBe('/inicio');
  });
});