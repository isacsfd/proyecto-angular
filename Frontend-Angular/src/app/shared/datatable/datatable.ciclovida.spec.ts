import { describe, it, expect, afterEach, vi } from 'vitest';

import { tablaCompatibleConDatatables, tablaCoincideConDatos, puedeInicializarDatatables } from './datatable.directive';

function montar(thead: string[], filas: string[][] | null): HTMLTableElement {
  const tabla = document.createElement('table');
  const head = tabla.createTHead()!;
  const filaHead = head.insertRow();
  for (const c of thead) filaHead.insertCell().textContent = c;
  if (filas !== null) {
    const tbody = tabla.createTBody();
    for (const fila of filas) {
      const tr = tbody.insertRow();
      for (const c of fila) tr.insertCell().textContent = c;
    }
  }
  document.body.appendChild(tabla);
  return tabla;
}

const TABS_CREADAS: HTMLTableElement[] = [];
afterEach(() => {
  for (const t of TABS_CREADAS.splice(0)) t.remove();
  vi.restoreAllMocks();
});

function montarRastreada(thead: string[], filas: string[][] | null): HTMLTableElement {
  const t = montar(thead, filas);
  TABS_CREADAS.push(t);
  return t;
}

describe('tablaCompatibleConDatatables', () => {
  it('con filas completas es compatible (se inicializa DataTables)', () => {
    const tabla = montarRastreada(['A', 'B'], [
      ['1', '2'],
      ['3', '4'],
    ]);
    expect(tablaCompatibleConDatatables(tabla)).toBe(true);
  });

  it('con fila estado vacio de una celda (colspan) NO es compatible', () => {
    const tabla = montarRastreada(['A', 'B'], [['Estado vacío de una sola celda']]);
    expect(tablaCompatibleConDatatables(tabla)).toBe(false);
  });

  it('sin filas en el tbody no es compatible', () => {
    const tabla = montarRastreada(['A'], []);
    expect(tablaCompatibleConDatatables(tabla)).toBe(false);
  });

  it('sin thead no es compatible', () => {
    const tabla = montarRastreada(['A'], [['1']]);
    tabla.deleteTHead();
    expect(tablaCompatibleConDatatables(tabla)).toBe(false);
  });

  it('una celda con colspan explicito dentro de una fila completa NO es compatible', () => {
    const tabla = montarRastreada(['A', 'B'], [
      ['mescla', 'normal'],
      ['otra', 'fila'],
    ]);
    tabla.tBodies[0].rows[0].cells[0].colSpan = 2;
    expect(tablaCompatibleConDatatables(tabla)).toBe(false);
  });

  it('filas fantasma en un segundo tbody rompen la compatibilidad', () => {
    const tabla = montarRastreada(['A', 'B'], [['1', '2']]);
    const fantasma = tabla.createTBody();
    const fila = fantasma.insertRow();
    fila.insertCell(); // solo 1 celda: fila restaurada por destroy()
    expect(tablaCompatibleConDatatables(tabla)).toBe(false);
  });
});

describe('tablaCoincideConDatos', () => {
  it('coincide cuando el DOM tiene exactamente las filas de dtData', () => {
    const tabla = montarRastreada(['A', 'B'], [
      ['1', '2'],
      ['3', '4'],
    ]);
    expect(tablaCoincideConDatos(tabla, 2)).toBe(true);
  });

  it('NO coincide si el DOM aun tiene la fila de estado vacio y dtData ya va vacio', () => {
    const tabla = montarRastreada(['A', 'B'], [['Sin registros']]);
    expect(tablaCoincideConDatos(tabla, 0)).toBe(false);
  });

  it('NO coincide con filas fantasma restauradas por destroy', () => {
    const tabla = montarRastreada(['A', 'B'], [
      ['1', '2'],
      ['3', '4'],
    ]);
    const fantasma = tabla.createTBody();
    fantasma.insertRow().insertCell();
    expect(tablaCoincideConDatos(tabla, 2)).toBe(false);
  });
});

describe('puedeInicializarDatatables: decisión contra el warning de columnas', () => {
  it('estado vacío con fila colspan: NO se inicializa (aunque el conteo de filas coincida)', () => {
    const tabla = montarRastreada(['ID', 'Razon social'], [['Sin proveedores registrados.']]);
    expect(puedeInicializarDatatables(tabla, 0)).toBe(false);
    expect(puedeInicializarDatatables(tabla, 1)).toBe(false);
  });

  it('datos reales: la decisión es SI (DOM y dtData coinciden)', () => {
    const tabla = montarRastreada(['ID', 'Razon social'], [
      ['1', 'Proveedor A'],
      ['2', 'Proveedor B'],
    ]);
    expect(puedeInicializarDatatables(tabla, 2)).toBe(true);
  });

  it('cambio de datos sin flush del render (DOM con fila anterior, dtData ya vacío): NO se inicializa', () => {
    const tabla = montarRastreada(['ID', 'Razon social'], [
      ['1', 'Proveedor A'],
    ]);
    expect(puedeInicializarDatatables(tabla, 0)).toBe(false);
  });
});
