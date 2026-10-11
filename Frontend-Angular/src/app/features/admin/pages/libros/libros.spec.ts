import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';

import { AdminLibros } from './libros';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AlertaService } from '../../../../core/services/alerta.service';
import { ReportesService } from '../../../../core/services/reportes.service';
import { SugerenciasService } from '../../../../core/services/sugerencias.service';
import { ActivatedRoute } from '@angular/router';
import { Libro } from '../../../../core/models';

function libro(id: number): Libro {
  return { ID: id, Titulo: `L${id}`, Autor: 'A', Programa: '', Signatura: '', sede: 'Soledad' } as Libro;
}

function generar(n: number): Libro[] {
  return Array.from({ length: n }, (_, i) => libro(i + 1));
}

function montar() {
  TestBed.configureTestingModule({
    imports: [AdminLibros],
    providers: [
      {
        provide: ApiService,
        useValue: {
          listarLibros: () => of([]),
          crearLibro: () => of({}),
          actualizarLibro: () => of({}),
          eliminarLibro: () => of({}),
        },
      },
      { provide: AuthService, useValue: { isSuper: () => false, usuario: () => ({ sede: 'Soledad' }) } },
      { provide: AlertaService, useValue: { exito: async () => {}, error: async () => {}, confirmar: async () => true } },
      { provide: ReportesService, useValue: { exportarLibros: () => {} } },
      { provide: SugerenciasService, useValue: { libros: () => [], usuarios: () => [], cargar: () => {} } },
      { provide: ActivatedRoute, useValue: { queryParamMap: of({ get: () => null }) } },
    ],
  });
  const fixture = TestBed.createComponent(AdminLibros);
  const comp = fixture.componentInstance as unknown as {
    libros: { set: (v: Libro[]) => void };
    filtro: { set: (v: string) => void };
    limite: { set: (n: number) => void };
    offset: { set: (n: number) => void; (): number };
    totalPaginas: () => number;
    filasPagina: () => Libro[];
  };
  fixture.detectChanges();
  return { comp };
}

describe('Paginación de Libros (local)', () => {
  it('menos de una página: total 1 y muestra todos los registros', () => {
    const { comp } = montar();
    comp.libros.set(generar(5));
    comp.limite.set(10);
    comp.offset.set(0);
    expect(comp.totalPaginas()).toBe(1);
    expect(comp.filasPagina()).toHaveLength(5);
  });

  it('exactamente una página completa: total 1 y filas de página 1', () => {
    const { comp } = montar();
    comp.libros.set(generar(10));
    comp.limite.set(10);
    comp.offset.set(0);
    expect(comp.totalPaginas()).toBe(1);
    expect(comp.filasPagina()).toHaveLength(10);
  });

  it('varias páginas: total correcto, sin repetir libros y última página incompleta', () => {
    const { comp } = montar();
    comp.libros.set(generar(25));
    comp.limite.set(10);
    comp.offset.set(0);
    expect(comp.totalPaginas()).toBe(3);
    const p1 = comp.filasPagina().map((l) => l.ID);
    comp.offset.set(1);
    const p2 = comp.filasPagina().map((l) => l.ID);
    comp.offset.set(2);
    const p3 = comp.filasPagina().map((l) => l.ID);
    expect(p1).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(p2[0]).toBe(11);
    expect(p3).toEqual([21, 22, 23, 24, 25]);
    const todos = [...p1, ...p2, ...p3];
    expect(new Set(todos).size).toBe(25);
  });

  it('la búsqueda recalcula el total y las páginas', () => {
    const { comp } = montar();
    comp.libros.set(generar(30));
    comp.limite.set(10);
    comp.filtro.set('L3'); // coincide con L3 y L30
    comp.offset.set(0);
    expect(comp.totalPaginas()).toBe(1);
    expect(comp.filasPagina()).toHaveLength(2);
  });

  it('sin resultados: cero filas y total 1 (página vacía sin navegación)', () => {
    const { comp } = montar();
    comp.libros.set(generar(30));
    comp.limite.set(10);
    comp.filtro.set('ZZZ-no-existe');
    comp.offset.set(0);
    expect(comp.filasPagina()).toHaveLength(0);
    expect(comp.totalPaginas()).toBe(1);
  });

  it('si se elimina el último libro de la última página, regresa a la última página válida', async () => {
    const { comp } = montar();
    comp.libros.set(generar(25));
    comp.limite.set(10);
    comp.offset.set(2); // última página (ids 21-25)
    expect(comp.filasPagina()).toHaveLength(5);
    comp.libros.set(generar(20)); // simular eliminación de los 5 últimos
    TestBed.flushEffects();
    expect(comp.offset()).toBe(1); // última página válida (ids 11-20)
    expect(comp.filasPagina()).toHaveLength(10);
  });
});