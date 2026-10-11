import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * PaginadorNgx — barra de paginación superior para ngx-datatable.
 * Muestra selector de tamaño de página, rango de registros y controles
 * anterior/siguiente con números, en la parte superior izquierda; el contenido
 * (búsqueda) se inyecta a la derecha vía ng-content.
 */
@Component({
  selector: 'app-paginador-ngx',
  imports: [FormsModule],
  templateUrl: './paginador-ngx.html',
  styleUrl: './paginador-ngx.css',
})
export class PaginadorNgx {
  @Input({ required: true }) count = 0;
  @Input({ required: true }) offset = 0;
  @Input() limit = 10;
  @Output() offsetChange = new EventEmitter<number>();
  @Output() limitChange = new EventEmitter<number>();

  readonly opciones = [10, 25, 50];

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.count / this.limit));
  }

  get paginaActual(): number {
    return this.count === 0 ? 1 : Math.floor(this.offset / this.limit) + 1;
  }

  get inicio(): number {
    return this.count === 0 ? 0 : this.offset + 1;
  }

  get fin(): number {
    return Math.min(this.offset + this.limit, this.count);
  }

  paginas(): number[] {
    const total = this.totalPaginas;
    const actual = this.paginaActual;
    const inicio = Math.max(1, actual - 2);
    const fin = Math.min(total, inicio + 4);
    const numeros: number[] = [];
    for (let i = inicio; i <= fin; i++) numeros.push(i);
    return numeros;
  }

  cambiarLimite(): void {
    this.offsetChange.emit(0);
    this.limitChange.emit(this.limit);
  }

  irPagina(numero: number): void {
    if (numero < 1 || numero > this.totalPaginas) return;
    this.offsetChange.emit((numero - 1) * this.limit);
  }

  anterior(): void {
    if (this.offset <= 0) return;
    this.offsetChange.emit(this.offset - this.limit);
  }

  siguiente(): void {
    if (this.paginaActual >= this.totalPaginas) return;
    this.offsetChange.emit(this.offset + this.limit);
  }
}