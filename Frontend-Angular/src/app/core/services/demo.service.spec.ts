import { describe, it, expect, beforeEach } from 'vitest';

import { DemoService } from './demo.service';

describe('DemoService persistencia y recarga', () => {
  beforeEach(() => sessionStorage.clear());

  it('activar demo permite utilizarla durante la sesión actual', () => {
    const demo = new DemoService();
    expect(demo.activo()).toBe(false);
    demo.activar('Administrador');
    expect(demo.activo()).toBe(true);
    expect(demo.usuarioActual()?.rol).toBe('Administrador');
    // no escribe claves de sesión real
    expect(sessionStorage.getItem('jwt_token')).toBeNull();
    expect(sessionStorage.getItem('sesionActiva')).toBeNull();
    expect(sessionStorage.getItem('userData')).toBeNull();
  });

  it('una instancia nueva (recarga de página) no restaura automáticamente el modo demo', () => {
    const d1 = new DemoService();
    d1.activar('Estudiante');
    const d2 = new DemoService();
    expect(d2.activo()).toBe(false);
    expect(d2.usuarioActual()).toBeNull();
  });

  it('la información demo no se persiste como una sesión JWT', () => {
    const demo = new DemoService();
    demo.activar('Docente');
    expect(sessionStorage.getItem('demoModo')).toBeNull();
    expect(sessionStorage.getItem('jwt_token')).toBeNull();
    expect(sessionStorage.getItem('sesionActiva')).toBeNull();
  });

  it('desactivar elimina la identidad demo de la sesión actual', () => {
    const demo = new DemoService();
    demo.activar('Estudiante');
    demo.desactivar();
    expect(demo.activo()).toBe(false);
    expect(demo.usuarioActual()).toBeNull();
  });
});