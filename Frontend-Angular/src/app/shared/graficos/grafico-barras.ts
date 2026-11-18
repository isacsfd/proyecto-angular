import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SerieDato } from '../../core/models';
import { PALETA } from './colores';

/** Rectángulo calculado de una barra vertical (geometría pura, testeable). */
export interface BarraDato {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  color: string;
  valor: number;
}

/** Escala las series a barras verticales dentro de un lienzo SVG. */
export function calcularBarras(datos: SerieDato[], ancho: number, alto: number, margenInferior = 28): BarraDato[] {
  if (!datos.length || ancho <= 0 || alto <= 0) return [];
  const maximo = Math.max(...datos.map((d) => d.valor), 1);
  const espacio = ancho / datos.length;
  const anchoBarra = Math.max(espacio * 0.62, 2);
  const alturaUtil = alto - margenInferior - 12;
  return datos.map((d, i) => {
    const alto = (d.valor / maximo) * alturaUtil;
    return {
      x: i * espacio + (espacio - anchoBarra) / 2,
      y: alturaUtil - alto,
      ancho: anchoBarra,
      alto,
      color: PALETA[i % PALETA.length],
      valor: d.valor,
    };
  });
}

/** Gráfico de barras verticales en SVG puro (sin librerías externas). */
@Component({
  selector: 'app-grafico-barras',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (!datos.length) {
      <p class="text-muted text-center my-4 mb-0">Sin datos para graficar.</p>
    } @else {
      <svg [attr.viewBox]="'0 0 ' + ancho + ' ' + alto" class="w-100" style="height: {{ alto }}px" role="img" aria-label="Gráfico de barras">
        @for (barra of barras; track $index) {
          <rect [attr.x]="barra.x" [attr.y]="barra.y" [attr.width]="barra.ancho" [attr.height]="barra.alto"
                [attr.fill]="barra.color" rx="4">
            <title>{{ etiquetas[$index] }}: {{ barra.valor }}</title>
          </rect>
          <text [attr.x]="barra.x + barra.ancho / 2" [attr.y]="barra.y - 4" text-anchor="middle"
                font-size="11" fill="#495057">{{ barra.valor }}</text>
        }
        @for (etiqueta of etiquetas; track $index) {
          <text [attr.x]="$index * (ancho / datos.length) + (ancho / datos.length) / 2" [attr.y]="alto - 8"
                text-anchor="middle" font-size="10" fill="#6c757d">{{ etiqueta }}</text>
        }
      </svg>
    }
  `,
})
export class GraficoBarras {
  @Input() datos: SerieDato[] = [];
  @Input() ancho = 480;
  @Input() alto = 240;

  get barras(): BarraDato[] {
    return calcularBarras(this.datos, this.ancho, this.alto);
  }

  /** Etiquetas recortadas para que no se solapen. */
  get etiquetas(): string[] {
    const paso = this.datos.length ? this.ancho / this.datos.length : this.ancho;
    const limite = Math.max(Math.floor(paso / 7), 4);
    return this.datos.map((d) =>
      d.etiqueta.length > limite ? `${d.etiqueta.slice(0, limite - 1)}…` : d.etiqueta,
    );
  }
}
