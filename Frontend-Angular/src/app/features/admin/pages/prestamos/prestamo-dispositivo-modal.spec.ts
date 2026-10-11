import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';

import { PrestamoDispositivoModal, PrestamoDispositivoAccion } from './prestamo-dispositivo-modal';

describe('PrestamoDispositivoModal', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [PrestamoDispositivoModal] });
    const fixture = TestBed.createComponent(PrestamoDispositivoModal);
    const comp = fixture.componentInstance as unknown as {
      dispositivos: unknown[];
      usuarios: unknown[];
      form: { dispositivo_id: number | null; user_id: number | null; fecha_prestamo: string; fecha_devolucion: string };
      mensaje: () => string;
      guardarNuevo: () => void;
      guardar: { subscribe: (fn: (a: PrestamoDispositivoAccion) => void) => void };
    };
    comp.dispositivos = [{ id: 1, tipo: 'Computador' }];
    comp.usuarios = [{ id: 1, nombre: 'Ana' }];
    fixture.detectChanges();
    let emitido: PrestamoDispositivoAccion | undefined;
    comp.guardar.subscribe((a) => (emitido = a));
    return { comp, emitido: () => emitido };
  }

  it('valida los campos obligatorios al registrar', () => {
    const { comp, emitido } = montar();
    comp.form.dispositivo_id = null;
    comp.form.user_id = null;
    comp.guardarNuevo();
    expect(comp.mensaje()).toContain('Seleccione dispositivo y usuario.');
    expect(emitido()).toBeUndefined();
  });

  it('rechaza una franja de más de 2 horas', () => {
    const { comp, emitido } = montar();
    comp.form.dispositivo_id = 1;
    comp.form.user_id = 1;
    comp.form.fecha_prestamo = '2026-10-10T09:00';
    comp.form.fecha_devolucion = '2026-10-10T12:00';
    comp.guardarNuevo();
    expect(comp.mensaje()).toContain('no puede superar las 2 horas');
    expect(emitido()).toBeUndefined();
  });

  it('emite una sola acción de crear cuando el formulario es válido', () => {
    const { comp, emitido } = montar();
    comp.form.dispositivo_id = 1;
    comp.form.user_id = 1;
    comp.form.fecha_prestamo = '2026-10-10T09:00';
    comp.form.fecha_devolucion = '2026-10-10T10:30';
    let veces = 0;
    comp.guardar.subscribe(() => veces++);
    comp.guardarNuevo();
    comp.guardarNuevo();
    expect(emitido()?.accion).toBe('crear');
    expect(veces).toBe(1);
  });
});