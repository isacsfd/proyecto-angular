import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SerieDato } from '../../core/models';
import { PALETA } from './colores';

/** Segmento de la dona (geometría pura sobre pathLength=100, testeable). */
export interface SegmentoDona {
  offset: number;
  longitud: number;
  color: string;
  etiqueta: string;
  valor: number;
  porcentaje: number;
}

/** Convierte series en segmentos de una dona (unidades: porcentaje). */
export function calcularSegmentosDona(datos: SerieDato[]): SegmentoDona[] {
  const total = datos.reduce((suma, d) => suma + d.valor, 0);
  if (total <= 0) return [];
  let acumulado = 0;
  return datos.map((d, i) => {
    const porcentaje = (d.valor / total) * 100;
    const segmento: SegmentoDona = {
      offset: acumulado,
      longitud: Math.max(porcentaje, 0.4),
      color: PALETA[i % PALETA.length],
      etiqueta: d.etiqueta,
      valor: d.valor,
      porcentaje: Math.round(porcentaje * 10) / 10,
    };
    acumulado += porcentaje;
    return segmento;
  });
}

/** Gráfico de dona (composición) en SVG puro con leyenda. */
@Component({
  selector: 'app-grafico-dona',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (!datos.length) {
      <p class="text-muted text-center my-4 mb-0">Sin datos para graficar.</p>
    } @else {
      <div class="d-flex align-items-center gap-3 flex-wrap justify-content-center">
        <svg viewBox="0 0 120 120" width="150" height="150" role="img" aria-label="Gráfico de dona">
          <g transform="rotate(-90 60 60)">
            @for (segmento of segmentos; track $index) {
              <circle cx="60" cy="60" r="44" fill="none" stroke-width="18" pathLength="100"
                      [attr.stroke]="segmento.color"
                      [attr.stroke-dasharray]="segmento.longitud + ' ' + (100 - segmento.longitud)"
                      [attr.stroke-dashoffset]="-segmento.offset">
                <title>{{ segmento.etiqueta }}: {{ segmento.valor }} ({{ segmento.porcentaje }}%)</title>
              </circle>
            }
          </g>
          <text x="60" y="57" text-anchor="middle" font-size="17" font-weight="600" fill="#212529">{{ total }}</text>
          <text x="60" y="72" text-anchor="middle" font-size="9" fill="#6c757d">total</text>
        </svg>
        <ul class="list-unstyled mb-0 small leyenda-dona">
          @for (segmento of segmentos; track $index) {
            <li class="d-flex align-items-center gap-2">
              <span class="punto-color" [style.background]="segmento.color"></span>
              <span class="flex-grow-1">{{ segmento.etiqueta }}</span>
              <span class="text-muted">{{ segmento.valor }} · {{ segmento.porcentaje }}%</span>
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: `
    .leyenda-dona { min-width: 170px; }
    .punto-color { width: .8rem; height: .8rem; border-radius: 3px; display: inline-block; }
  `,
})
export class GraficoDona {
  @Input() datos: SerieDato[] = [];

  get segmentos(): SegmentoDona[] {
    return calcularSegmentosDona(this.datos);
  }

  get total(): number {
    return this.datos.reduce((suma, d) => suma + d.valor, 0);
  }
}
