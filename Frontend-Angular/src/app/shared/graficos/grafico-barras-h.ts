import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SerieDato } from '../../core/models';
import { PALETA } from './colores';

/** Rectángulo calculado de una barra horizontal (geometría pura, testeable). */
export interface BarraHorizontal {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  color: string;
  valor: number;
}

/** Escala las series a barras horizontales (rankings) dentro del lienzo. */
export function calcularBarrasHorizontales(
  datos: SerieDato[],
  ancho: number,
  alto: number,
  margenEtiqueta = 118,
  margenValor = 36,
): BarraHorizontal[] {
  if (!datos.length || ancho <= 0 || alto <= 0) return [];
  const maximo = Math.max(...datos.map((d) => d.valor), 1);
  const espacio = alto / datos.length;
  const altoBarra = Math.max(espacio * 0.55, 3);
  const anchoUtil = ancho - margenEtiqueta - margenValor;
  return datos.map((d, i) => ({
    x: margenEtiqueta,
    y: i * espacio + (espacio - altoBarra) / 2,
    ancho: (d.valor / maximo) * anchoUtil,
    alto: altoBarra,
    color: PALETA[i % PALETA.length],
    valor: d.valor,
  }));
}

/** Gráfico de barras horizontales en SVG puro (rankings tipo top-N). */
@Component({
  selector: 'app-grafico-barras-h',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (!datos.length) {
      <p class="text-muted text-center my-4 mb-0">Sin datos para graficar.</p>
    } @else {
      <svg [attr.viewBox]="'0 0 ' + ancho + ' ' + alto" class="w-100" style="height: {{ alto }}px" role="img" aria-label="Ranking en barras horizontales">
        @for (barra of barras; track $index) {
          <rect [attr.x]="barra.x" [attr.y]="barra.y" [attr.width]="barra.ancho" [attr.height]="barra.alto"
                [attr.fill]="barra.color" rx="4">
            <title>{{ datos[$index].etiqueta }}: {{ barra.valor }}</title>
          </rect>
          <text [attr.x]="barra.x - 6" [attr.y]="barra.y + barra.alto" text-anchor="end" font-size="10" fill="#495057">
            {{ etiquetas[$index] }}
          </text>
          <text [attr.x]="barra.x + barra.ancho + 6" [attr.y]="barra.y + barra.alto" font-size="10" fill="#6c757d">
            {{ barra.valor }}
          </text>
        }
      </svg>
    }
  `,
})
export class GraficoBarrasHorizontales {
  @Input() datos: SerieDato[] = [];
  @Input() ancho = 480;
  @Input() alto = 260;

  get barras(): BarraHorizontal[] {
    return calcularBarrasHorizontales(this.datos, this.ancho, this.alto);
  }

  get etiquetas(): string[] {
    return this.datos.map((d) => (d.etiqueta.length > 16 ? `${d.etiqueta.slice(0, 15)}…` : d.etiqueta));
  }
}
