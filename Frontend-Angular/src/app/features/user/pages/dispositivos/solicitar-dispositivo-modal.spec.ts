import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';

import { SolicitarDispositivoModal, SolicitudDispositivoDatos } from './solicitar-dispositivo-modal';

describe('SolicitarDispositivoModal', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [SolicitarDispositivoModal] });
    const fixture = TestBed.createComponent(SolicitarDispositivoModal);
    const comp = fixture.componentInstance as unknown as {
      dispositivo: unknown;
      fechaInicio: string;
      fechaFin: string;
      mensaje: () => string;
      enviar: () => void;
      guardar: { subscribe: (fn: (d: SolicitudDispositivoDatos) => void) => void };
    };
    comp.dispositivo = { id: 1, tipo: 'Computador', marca: 'HP', modelo: 'ProBook', sede: 'Soledad' };
    fixture.detectChanges();
    let emitido: SolicitudDispositivoDatos | undefined;
    let veces = 0;
    comp.guardar.subscribe((d) => {
      emitido = d;
      veces++;
    });
    return { comp, emitido: () => emitido, veces: () => veces };
  }

  it('rechaza una franja de más de 2 horas', () => {
    const { comp, emitido } = montar();
    comp.fechaInicio = '2026-10-10T09:00';
    comp.fechaFin = '2026-10-10T12:00';
    comp.enviar();
    expect(comp.mensaje()).toContain('no puede superar las 2 horas');
    expect(emitido()).toBeUndefined();
  });

  it('exige indicar la franja horaria', () => {
    const { comp, emitido } = montar();
    comp.fechaInicio = '';
    comp.fechaFin = '';
    comp.enviar();
    expect(comp.mensaje()).toContain('Debe indicar inicio y fin');
    expect(emitido()).toBeUndefined();
  });

  it('emite la solicitud una sola vez cuando la franja es válida', () => {
    const { comp, emitido, veces } = montar();
    comp.fechaInicio = '2026-10-10T09:00';
    comp.fechaFin = '2026-10-10T10:30';
    comp.enviar();
    comp.enviar();
    expect(emitido()?.fecha_prestamo).toBe('2026-10-10T09:00');
    expect(emitido()?.fecha_devolucion).toBe('2026-10-10T10:30');
    expect(veces()).toBe(1);
  });
});