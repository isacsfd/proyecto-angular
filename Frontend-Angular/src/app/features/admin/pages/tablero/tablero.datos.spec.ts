import { describe, it, expect } from 'vitest';

import { Acceso, Dispositivo, Libro, Prestamo, Usuario } from '../../../../core/models';
import {
  accesosPorDia,
  agregarPor,
  calcularIndicadores,
  claveMes,
  ordenarPorValor,
  prestamosPorMes,
  topN,
} from './tablero.datos';

const prestamo = (over: Partial<Prestamo>): Prestamo => ({
  id: 1,
  user_id: 1,
  user: 'Usuario',
  book_id: '1',
  book: 'Libro',
  loan_date: '2026-01-10T10:00:00Z',
  delivery_date: '2026-01-16T10:00:00Z',
  state: 'Activo',
  prestamo_state: 'Aprobado',
  created_at: '2026-01-10T10:00:00Z',
  ...over,
});

/** ISO en hora local (sin Z): así el día del texto es el día que ve el usuario. */
const isoLocal = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const acceso = (over: Partial<Acceso>): Acceso => ({
  id: 1,
  user_id: 1,
  user_name: 'Usuario',
  user_identificacion: '10001',
  message: 'Ingreso',
  status: true,
  created_at: isoLocal(new Date()),
  ...over,
});

describe('agregarPor', () => {
  it('cuenta elementos por clave y omite vacíos', () => {
    const libros: Libro[] = [
      { ID: 1, Titulo: 'A', Autor: 'x', Signatura: 's', sede: 'Soledad', Programa: 'Ing.' },
      { ID: 2, Titulo: 'B', Autor: 'x', Signatura: 's', sede: 'Soledad', Programa: 'Ing.' },
      { ID: 3, Titulo: 'C', Autor: 'x', Signatura: 's', sede: 'Barranquilla' },
      { ID: 4, Titulo: 'D', Autor: 'x', Signatura: 's' },
    ];
    expect(agregarPor(libros, (l) => l.sede)).toEqual([
      { etiqueta: 'Soledad', valor: 2 },
      { etiqueta: 'Barranquilla', valor: 1 },
    ]);
  });
});

describe('ordenarPorValor / topN', () => {
  it('ordena descendente y recorta el top-N', () => {
    const serie = [
      { etiqueta: 'a', valor: 3 },
      { etiqueta: 'b', valor: 9 },
      { etiqueta: 'c', valor: 5 },
    ];
    expect(ordenarPorValor(serie)).toEqual([
      { etiqueta: 'b', valor: 9 },
      { etiqueta: 'c', valor: 5 },
      { etiqueta: 'a', valor: 3 },
    ]);
    expect(topN(serie, 2)).toEqual([
      { etiqueta: 'b', valor: 9 },
      { etiqueta: 'c', valor: 5 },
    ]);
  });
});

describe('claveMes / prestamosPorMes', () => {
  it('agrupa préstamos por mes en orden cronológico', () => {
    const prestamos = [
      prestamo({ loan_date: '2026-01-05T00:00:00Z' }),
      prestamo({ loan_date: '2026-01-20T00:00:00Z' }),
      prestamo({ loan_date: '2025-11-02T00:00:00Z' }),
      prestamo({ loan_date: '2026-02-01T00:00:00Z' }),
    ];
    const serie = prestamosPorMes(prestamos);
    expect(serie.map((s) => s.etiqueta)).toEqual(['nov 25', 'ene 26', 'feb 26']);
    expect(serie[1]).toEqual({ etiqueta: 'ene 26', valor: 2 });
  });

  it('ignora fechas inválidas y limita a los últimos meses', () => {
    const prestamos = [
      prestamo({ loan_date: '2023-01-01T00:00:00Z' }),
      prestamo({ loan_date: '2024-05-01T00:00:00Z' }),
    ];
    expect(prestamosPorMes(prestamos, 1)).toEqual([{ etiqueta: 'may 24', valor: 1 }]);
  });

  it('claveMes devuelve cadena vacía para fechas inválidas', () => {
    expect(claveMes('no-es-fecha')).toBe('');
    expect(claveMes(undefined)).toBe('');
    expect(claveMes('2026-03-15T00:00:00Z')).toBe('2026-03');
  });
});

describe('accesosPorDia', () => {
  it('devuelve la ventana de días con ceros incluidos y cuenta los accesos', () => {
    const hoy = new Date();
    const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
    const accesos = [
      acceso({}),
      acceso({ created_at: isoLocal(ayer), status: false }),
      acceso({ created_at: '2020-01-01T00:00:00' }), // fuera de la ventana
    ];
    const serie = accesosPorDia(accesos, 14);
    expect(serie).toHaveLength(14);
    expect(serie[serie.length - 1]).toEqual({ etiqueta: serie[serie.length - 1].etiqueta, valor: 1 });
    expect(serie[serie.length - 2].valor).toBe(1);
    expect(serie.reduce((s, d) => s + d.valor, 0)).toBe(2);
  });
});

describe('calcularIndicadores', () => {
  it('calcula los indicadores del tablero con usuarios y sin usuarios', () => {
    const libros: Libro[] = [
      { ID: 1, Titulo: 'A', Autor: 'x', Signatura: 's' },
      { ID: 2, Titulo: 'B', Autor: 'x', Signatura: 's' },
    ];
    const prestamos = [
      prestamo({ state: 'Activo' }),
      prestamo({ state: 'Activo' }),
      prestamo({ state: 'Vencido' }),
      prestamo({ state: 'Devuelto' }),
    ];
    const dispositivos: Dispositivo[] = [
      { id: 1, tipo: 'Computador', marca: 'm', modelo: 'm', sede: 'Soledad', estado: 'Disponible' },
      { id: 2, tipo: 'Tablet', marca: 'm', modelo: 'm', sede: 'Soledad', estado: 'Prestado' },
    ];
    const accesos = [acceso({ status: true }), acceso({ status: false })];
    const usuarios: Usuario[] = [
      { id: 1, nombre: 'a', rol: 'Estudiante', identificacion: '1' },
      { id: 2, nombre: 'b', rol: 'Estudiante', identificacion: '2' },
    ];

    const ind = calcularIndicadores(libros, prestamos, dispositivos, accesos, usuarios);
    expect(ind).toEqual({
      libros: 2,
      prestamosActivos: 2,
      prestamosVencidos: 1,
      dispositivosDisponibles: 1,
      dispositivosTotal: 2,
      usuarios: 2,
      accesosExitosos: 1,
    });

    const sinUsuarios = calcularIndicadores(libros, prestamos, dispositivos, accesos, null);
    expect(sinUsuarios.usuarios).toBeNull();
  });
});
