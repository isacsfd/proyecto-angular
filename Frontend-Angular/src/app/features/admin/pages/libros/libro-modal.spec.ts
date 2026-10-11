import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';

import { LibroModal, LibroDatos } from './libro-modal';

describe('LibroModal', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [LibroModal] });
    const fixture = TestBed.createComponent(LibroModal);
    const comp = fixture.componentInstance as unknown as {
      sedes: Array<{ clave: string; nombre: string }>;
      libro: unknown;
      form: Record<string, unknown>;
      mensaje: () => string;
      guardarLibro: () => void;
      guardar: { subscribe: (fn: (d: LibroDatos) => void) => void };
    };
    comp.sedes = [{ clave: 'Soledad', nombre: 'Soledad' }];
    fixture.detectChanges();
    let emitido: LibroDatos | undefined;
    comp.guardar.subscribe((d) => (emitido = d));
    return { comp, emitido: () => emitido };
  }

  it('valida título y autor obligatorios', () => {
    const { comp, emitido } = montar();
    comp.form['Titulo'] = '';
    comp.form['Autor'] = '';
    comp.guardarLibro();
    expect(comp.mensaje()).toContain('Título y autor son obligatorios.');
    expect(emitido()).toBeUndefined();
  });

  it('emite los datos completos para un libro nuevo', () => {
    const { comp, emitido } = montar();
    comp.form['Titulo'] = 'Clean Code';
    comp.form['Autor'] = 'Martin';
    comp.guardarLibro();
    expect(emitido()?.id).toBeNull();
    expect(emitido()?.Titulo).toBe('Clean Code');
    expect(emitido()?.Autor).toBe('Martin');
  });

  it('bloquea envíos duplicados', () => {
    const { comp } = montar();
    comp.form['Titulo'] = 'X';
    comp.form['Autor'] = 'Y';
    let veces = 0;
    comp.guardar.subscribe(() => veces++);
    comp.guardarLibro();
    comp.guardarLibro();
    expect(veces).toBe(1);
  });
});