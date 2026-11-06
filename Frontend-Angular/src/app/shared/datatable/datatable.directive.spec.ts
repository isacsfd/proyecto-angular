import { describe, it, expect } from 'vitest';

import { tablaCompatibleConDatatables } from './datatable.directive';

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

describe('tablaCompatibleConDatatables', () => {
  it('con filas completas es compatible (se inicializa DataTables)', () => {
    const tabla = montar(['A', 'B'], [
      ['1', '2'],
      ['3', '4'],
    ]);
    expect(tablaCompatibleConDatatables(tabla)).toBe(true);
  });

  it('con fila estado vacio de una celda (colspan) NO es compatible', () => {
    const tabla = montar(['A', 'B'], [['Estado vacío de una sola celda']]);
    expect(tablaCompatibleConDatatables(tabla)).toBe(false);
  });

  it('sin filas en el tbody no es compatible', () => {
    const tabla = montar(['A'], []);
    expect(tablaCompatibleConDatatables(tabla)).toBe(false);
  });

  it('sin thead no es compatible', () => {
    const tabla = montar(['A'], [['1']]);
    tabla.deleteTHead();
    expect(tablaCompatibleConDatatables(tabla)).toBe(false);
  });
});
