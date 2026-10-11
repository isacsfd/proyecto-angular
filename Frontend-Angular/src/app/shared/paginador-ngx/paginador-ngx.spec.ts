import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';

import { PaginadorNgx } from './paginador-ngx';

describe('PaginadorNgx', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [PaginadorNgx] });
    const fixture = TestBed.createComponent(PaginadorNgx);
    const comp = fixture.componentInstance as unknown as PaginadorNgx & {
      count: number;
      offset: number;
      limit: number;
    };
    return comp;
  }

  it('calcula total de páginas y rango mostrado', () => {
    const comp = montar();
    comp.count = 25;
    comp.offset = 0;
    comp.limit = 10;
    expect(comp.totalPaginas).toBe(3);
    expect(comp.inicio).toBe(1);
    expect(comp.fin).toBe(10);
  });

  it('emite offset al ir a una página concreta', () => {
    const comp = montar();
    comp.count = 25;
    comp.offset = 0;
    comp.limit = 10;
    let offset = -1;
    comp.offsetChange.subscribe((o: number) => (offset = o));
    comp.irPagina(3);
    expect(offset).toBe(20);
  });

  it('no navega más allá de los límites en anterior/siguiente', () => {
    const comp = montar();
    comp.count = 25;
    comp.offset = 20;
    comp.limit = 10;
    let offset = -1;
    comp.offsetChange.subscribe((o: number) => (offset = o));
    comp.siguiente();
    expect(offset).toBe(-1);
    comp.offset = 0;
    comp.anterior();
    expect(offset).toBe(-1);
  });

  it('emitir el tamaño de página reinicia al inicio', () => {
    const comp = montar();
    comp.count = 100;
    comp.offset = 40;
    comp.limit = 25;
    let offset = -1;
    let limite = -1;
    comp.offsetChange.subscribe((o: number) => (offset = o));
    comp.limitChange.subscribe((l: number) => (limite = l));
    comp.cambiarLimite();
    expect(offset).toBe(0);
    expect(limite).toBe(25);
  });
});