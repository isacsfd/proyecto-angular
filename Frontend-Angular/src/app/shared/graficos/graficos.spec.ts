import { describe, it, expect } from 'vitest';

import { calcularBarras } from './grafico-barras';
import { calcularBarrasHorizontales } from './grafico-barras-h';
import { calcularSegmentosDona } from './grafico-dona';
import { calcularPuntosLinea } from './grafico-lineas';

describe('calcularBarras (barras verticales)', () => {
  it('la barra del máximo llena el área útil y las demás escalan', () => {
    const datos = [
      { etiqueta: 'a', valor: 10 },
      { etiqueta: 'b', valor: 5 },
    ];
    const barras = calcularBarras(datos, 200, 100);
    expect(barras).toHaveLength(2);
    const alturaUtil = 100 - 28 - 12;
    expect(barras[0].alto).toBeCloseTo(alturaUtil, 5);
    expect(barras[1].alto).toBeCloseTo(alturaUtil / 2, 5);
    // Apiladas verticalmente: y + alto = alturaUtil.
    expect(barras[0].y + barras[0].alto).toBeCloseTo(alturaUtil, 5);
  });

  it('devuelve vacío sin datos o con lienzo inválido', () => {
    expect(calcularBarras([], 100, 100)).toEqual([]);
    expect(calcularBarras([{ etiqueta: 'a', valor: 1 }], 0, 100)).toEqual([]);
    expect(calcularBarras([{ etiqueta: 'a', valor: 1 }], 100, 0)).toEqual([]);
  });

  it('con valor 0 la barra tiene altura 0 pero se posiciona', () => {
    const barras = calcularBarras([{ etiqueta: 'a', valor: 0 }], 100, 100);
    expect(barras[0].alto).toBe(0);
    expect(barras[0].y).toBe(100 - 28 - 12);
  });
});

describe('calcularPuntosLinea (línea)', () => {
  it('reparte los puntos en el ancho e invierte el eje Y', () => {
    const datos = [
      { etiqueta: 'a', valor: 1 },
      { etiqueta: 'b', valor: 3 },
      { etiqueta: 'c', valor: 3 },
    ];
    const puntos = calcularPuntosLinea(datos, 210, 100, 28, 10);
    expect(puntos[0].x).toBe(10);
    expect(puntos[2].x).toBeCloseTo(200, 5);
    // El valor máximo queda arriba (y menor) y el mínimo abajo.
    expect(puntos[0].y).toBeGreaterThan(puntos[1].y);
    expect(puntos[1].y).toBe(puntos[2].y);
  });

  it('un único dato queda centrado sin división por cero', () => {
    const puntos = calcularPuntosLinea([{ etiqueta: 'a', valor: 2 }], 100, 50);
    expect(puntos).toHaveLength(1);
    expect(Number.isFinite(puntos[0].x)).toBe(true);
  });
});

describe('calcularSegmentosDona (dona)', () => {
  it('los segmentos cubren el 100% con offsets acumulados', () => {
    const datos = [
      { etiqueta: 'Activo', valor: 3 },
      { etiqueta: 'Vencido', valor: 1 },
    ];
    const segmentos = calcularSegmentosDona(datos);
    expect(segmentos).toHaveLength(2);
    expect(segmentos[0].porcentaje).toBe(75);
    expect(segmentos[1].porcentaje).toBe(25);
    expect(segmentos[0].offset).toBe(0);
    expect(segmentos[1].offset).toBe(75);
    expect(segmentos.reduce((s, x) => s + x.longitud, 0)).toBeCloseTo(100, 1);
  });

  it('devuelve vacío cuando no hay datos o el total es 0', () => {
    expect(calcularSegmentosDona([])).toEqual([]);
    expect(calcularSegmentosDona([{ etiqueta: 'a', valor: 0 }])).toEqual([]);
  });
});

describe('calcularBarrasHorizontales (ranking)', () => {
  it('la barra del máximo llena el ancho útil y las etiquetas no invaden', () => {
    const datos = [
      { etiqueta: 'Ingeniería Industrial', valor: 20 },
      { etiqueta: 'Diseño Gráfico', valor: 10 },
    ];
    const barras = calcularBarrasHorizontales(datos, 400, 100);
    expect(barras[0].x).toBe(118); // margen de etiqueta
    expect(barras[0].ancho + 118 + 36).toBeLessThanOrEqual(400 + 1);
    expect(barras[1].ancho).toBeCloseTo(barras[0].ancho / 2, 5);
    expect(barras[1].y).toBeGreaterThan(barras[0].y);
  });

  it('devuelve vacío sin datos', () => {
    expect(calcularBarrasHorizontales([], 100, 100)).toEqual([]);
  });
});
