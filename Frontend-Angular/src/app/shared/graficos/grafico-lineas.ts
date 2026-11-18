import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SerieDato } from '../../core/models';

/** Punto calculado de la polilínea (geometría pura, testeable). */
export interface PuntoLinea {
  x: number;
  y: number;
}

/** Escala las series a puntos de una línea dentro de un lienzo SVG. */
export function calcularPuntosLinea(
  datos: SerieDato[],
  ancho: number,
  alto: number,
  margenInferior = 28,
  margenLateral = 10,
): PuntoLinea[] {
  if (!datos.length || ancho <= 0 || alto <= 0) return [];
  const maximo = Math.max(...datos.map((d) => d.valor), 1);
  const alturaUtil = alto - margenInferior - 12;
  const anchoUtil = ancho - 2 * margenLateral;
  const paso = datos.length > 1 ? anchoUtil / (datos.length - 1) : 0;
  return datos.map((d, i) => ({
    x: margenLateral + i * paso,
    y: alturaUtil - (d.valor / maximo) * alturaUtil,
  }));
}

/** Gráfico de línea con puntos en SVG puro (evolución temporal). */
@Component({
  selector: 'app-grafico-lineas',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (!datos.length) {
      <p class="text-muted text-center my-4 mb-0">Sin datos para graficar.</p>
    } @else {
      <svg [attr.viewBox]="'0 0 ' + ancho + ' ' + alto" class="w-100" style="height: {{ alto }}px" role="img" aria-label="Gráfico de línea">
        <polyline [attr.points]="puntosTexto" fill="none" stroke="#0d6efd" stroke-width="2.5" />
        @for (punto of puntos; track $index) {
          <circle [attr.cx]="punto.x" [attr.cy]="punto.y" r="4" fill="#0d6efd">
            <title>{{ datos[$index].etiqueta }}: {{ datos[$index].valor }}</title>
          </circle>
        }
        @for (dato of datos; track $index) {
          @if ($index % saltoEtiquetas === 0) {
            <text [attr.x]="puntos[$index].x" [attr.y]="alto - 8" text-anchor="middle" font-size="10" fill="#6c757d">
              {{ dato.etiqueta }}
            </text>
          }
        }
      </svg>
    }
  `,
})
export class GraficoLineas {
  @Input() datos: SerieDato[] = [];
  @Input() ancho = 480;
  @Input() alto = 240;

  get puntos(): PuntoLinea[] {
    return calcularPuntosLinea(this.datos, this.ancho, this.alto);
  }

  get puntosTexto(): string {
    return this.puntos.map((p) => `${p.x},${p.y}`).join(' ');
  }

  /** Muestra una etiqueta de cada N para que no se solapen. */
  get saltoEtiquetas(): number {
    return Math.max(Math.ceil(this.datos.length / 8), 1);
  }
}
