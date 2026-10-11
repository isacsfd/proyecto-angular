import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SeleccionLibro } from '../../../../shared/seleccion-libro/seleccion-libro';
import { fechaLocalISO, fechaLocalMasDias } from '../../../../core/utils/fecha';

export interface SolicitudDatos {
  book_id: number;
  loan_date: string;
  delivery_date: string;
}

/**
 * Modal de solicitud de préstamo de libro para el usuario autenticado.
 * Crea la solicitud como 'No Aprobado' (el backend lo aprueba luego).
 */
@Component({
  selector: 'app-solicitar-prestamo-modal',
  imports: [FormsModule, SeleccionLibro],
  templateUrl: './solicitar-prestamo-modal.html',
  styleUrl: './solicitar-prestamo-modal.css',
})
export class SolicitarPrestamoModal {
  @Input() sedeLibros = '';
  @Input() guardando = false;
  @Output() guardar = new EventEmitter<SolicitudDatos>();
  @Output() cerrar = new EventEmitter<void>();

  mensaje = signal('');
  enviando = false;

  form = {
    book_id: null as number | null,
    loan_date: fechaLocalISO(),
    delivery_date: fechaLocalMasDias(5),
  };

  enviar(): void {
    this.mensaje.set('');
    if (!this.form.book_id) {
      this.mensaje.set('Seleccione un libro.');
      return;
    }
    if (!this.form.delivery_date) {
      this.mensaje.set('Indique la fecha de devolución (de 4 a 6 días).');
      return;
    }
    if (this.enviando || this.guardando) return;
    this.enviando = true;
    this.guardar.emit({
      book_id: Number(this.form.book_id),
      loan_date: this.form.loan_date,
      delivery_date: this.form.delivery_date,
    });
  }

  cerrarModal(): void {
    if (this.enviando || this.guardando) return;
    this.cerrar.emit();
  }
}