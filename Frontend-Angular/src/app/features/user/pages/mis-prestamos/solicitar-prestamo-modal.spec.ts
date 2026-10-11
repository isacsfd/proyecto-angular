import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';

import { SolicitarPrestamoModal, SolicitudDatos } from './solicitar-prestamo-modal';

describe('SolicitarPrestamoModal', () => {
  function montar() {
    TestBed.configureTestingModule({
      imports: [SolicitarPrestamoModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(SolicitarPrestamoModal);
    const comp = fixture.componentInstance as unknown as {
      form: { book_id: number | null; loan_date: string; delivery_date: string };
      mensaje: () => string;
      enviar: () => void;
      guardar: { subscribe: (fn: (d: SolicitudDatos) => void) => void };
    };
    fixture.detectChanges();
    let emitido: SolicitudDatos | undefined;
    let veces = 0;
    comp.guardar.subscribe((d) => {
      emitido = d;
      veces++;
    });
    return { comp, emitido: () => emitido, veces: () => veces };
  }

  it('valida la selección de un libro', () => {
    const { comp, emitido } = montar();
    comp.form.book_id = null;
    comp.enviar();
    expect(comp.mensaje()).toContain('Seleccione un libro.');
    expect(emitido()).toBeUndefined();
  });

  it('emite la solicitud con sus datos y no permite envíos duplicados', () => {
    const { comp, emitido, veces } = montar();
    comp.form.book_id = 3;
    comp.form.loan_date = '2026-10-10T09:00';
    comp.form.delivery_date = '2026-10-15T09:00';
    comp.enviar();
    comp.enviar();
    expect(emitido()?.book_id).toBe(3);
    expect(emitido()?.delivery_date).toBe('2026-10-15T09:00');
    expect(veces()).toBe(1);
  });
});