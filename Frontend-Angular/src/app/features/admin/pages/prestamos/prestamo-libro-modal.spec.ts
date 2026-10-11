import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';

import { PrestamoLibroModal, PrestamoAccion } from './prestamo-libro-modal';

describe('PrestamoLibroModal', () => {
  function montar() {
    TestBed.configureTestingModule({
      imports: [PrestamoLibroModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(PrestamoLibroModal);
    const comp = fixture.componentInstance as unknown as {
      usuarios: unknown[];
      prestamo: unknown;
      guardando: boolean;
      form: { user_id: number | null; book_id: number | null; loan_date: string; delivery_date: string };
      mensaje: () => string;
      guardarNuevo: () => void;
      aprobar: (p: unknown) => void;
      devolver: (p: unknown) => void;
      guardar: { subscribe: (fn: (a: PrestamoAccion) => void) => void };
    };
    comp.usuarios = [{ id: 1, nombre: 'Ana', rol: 'Estudiante', identificacion: '1001' }];
    fixture.detectChanges();
    let emitido: PrestamoAccion | undefined;
    let veces = 0;
    comp.guardar.subscribe((a: PrestamoAccion) => {
      emitido = a;
      veces++;
    });
    return { comp, obtenerEmision: () => emitido, veces: () => veces };
  }

  it('valida los campos obligatorios al registrar y no emite la acción', () => {
    const { comp, obtenerEmision } = montar();
    comp.guardarNuevo();
    expect(comp.mensaje()).toContain('usuario y libro');
    expect(obtenerEmision()).toBeUndefined();
  });

  it('emite la acción de crear con sus datos cuando el formulario está completo', () => {
    const { comp, obtenerEmision } = montar();
    comp.form.user_id = 1;
    comp.form.book_id = 2;
    comp.form.delivery_date = '2026-10-20T10:00:00';
    comp.guardarNuevo();
    expect(obtenerEmision()?.accion).toBe('crear');
    expect(obtenerEmision()?.user_id).toBe(1);
    expect(obtenerEmision()?.book_id).toBe(2);
    expect(obtenerEmision()?.delivery_date).toBe('2026-10-20T10:00:00');
  });

  it('bloquea envíos duplicados (una sola emisión por clic repetido)', () => {
    const { comp, veces } = montar();
    comp.form.user_id = 1;
    comp.form.book_id = 2;
    comp.form.delivery_date = '2026-10-20T10:00:00';
    comp.guardarNuevo();
    comp.guardarNuevo();
    expect(veces()).toBe(1);
  });

  it('emite la acción de devolución para un préstamo activo', () => {
    const { comp, obtenerEmision } = montar();
    const prestamo = {
      id: 5,
      user_id: 1,
      user: 'Ana',
      book: 'Libro',
      loan_date: '2026-10-01T09:00:00',
      delivery_date: '2026-10-06T09:00:00',
      state: 'Activo',
      prestamo_state: 'Aprobado',
    };
    comp.prestamo = prestamo as never;
    (comp.devolver as (p: unknown) => void)(prestamo as never);
    expect(obtenerEmision()?.accion).toBe('devolver');
  });
});