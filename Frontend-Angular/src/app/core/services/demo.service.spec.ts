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

  it('una instancia nueva (recarga de página) restaura el modo demo persistido', () => {
    const d1 = new DemoService();
    d1.activar('Estudiante');
    const d2 = new DemoService(); // simula la recarga: relee sessionStorage
    expect(d2.activo()).toBe(true);
    expect(d2.usuarioActual()?.rol).toBe('Estudiante');
    expect(d2.usuarioActual()?.demo).toBe(true);
  });

  it('la información demo se persiste solo en `demoModo`, nunca como una sesión JWT', () => {
    const demo = new DemoService();
    demo.activar('Docente');
    expect(sessionStorage.getItem('demoModo')).toBe('Docente');
    // claves de sesión real intactas: la demo no genera tokens ni sesión JWT
    expect(sessionStorage.getItem('jwt_token')).toBeNull();
    expect(sessionStorage.getItem('sesionActiva')).toBeNull();
    expect(sessionStorage.getItem('userData')).toBeNull();
  });

  it('desactivar elimina la identidad demo y su persistencia', () => {
    const demo = new DemoService();
    demo.activar('Estudiante');
    demo.desactivar();
    expect(demo.activo()).toBe(false);
    expect(demo.usuarioActual()).toBeNull();
    expect(sessionStorage.getItem('demoModo')).toBeNull();
  });
});