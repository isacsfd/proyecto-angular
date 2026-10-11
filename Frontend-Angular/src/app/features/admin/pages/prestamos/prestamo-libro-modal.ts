import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SeleccionLibro } from '../../../../shared/seleccion-libro/seleccion-libro';
import { Prestamo, Usuario } from '../../../../core/models';
import { fechaLocalISO } from '../../../../core/utils/fecha';

export interface PrestamoAccion {
  accion: 'crear' | 'aprobar' | 'rechazar' | 'devolver';
  prestamo: Prestamo | null;
  user_id?: number;
  book_id?: number;
  loan_date?: string;
  delivery_date?: string;
}

/**
 * Modal de préstamo de libro (admin): registrar uno nuevo o gestionar uno
 * existente (aprobar, rechazar, registrar devolución). No envía peticiones;
 * emite la acción al padre y bloquea envíos duplicados.
 */
@Component({
  selector: 'app-prestamo-libro-modal',
  imports: [CommonModule, FormsModule, SeleccionLibro],
  templateUrl: './prestamo-libro-modal.html',
  styleUrl: './prestamo-libro-modal.css',
})
export class PrestamoLibroModal {
  @Input() prestamo: Prestamo | null = null;
  @Input() usuarios: Usuario[] = [];
  @Input() guardando = false;
  @Input() sedeLibros = '';
  @Output() guardar = new EventEmitter<PrestamoAccion>();
  @Output() cerrar = new EventEmitter<void>();

  mensaje = signal('');
  enviando = false;

  form = {
    user_id: null as number | null,
    book_id: null as number | null,
    loan_date: fechaLocalISO(),
    delivery_date: '',
  };

  esNuevo(): boolean {
    return this.prestamo === null;
  }

  puedeAprobar(): boolean {
    return !!this.prestamo && this.prestamo.prestamo_state === 'No Aprobado';
  }

  puedeDevolver(): boolean {
    return !!this.prestamo && this.prestamo.state === 'Activo';
  }

  private emitir(accion: PrestamoAccion): void {
    if (this.enviando || this.guardando) {
      return;
    }
    this.enviando = true;
    this.guardar.emit(accion);
  }

  guardarNuevo(): void {
    this.mensaje.set('');
    if (!this.form.user_id || !this.form.book_id) {
      this.mensaje.set('Seleccione usuario y libro.');
      return;
    }
    if (!this.form.delivery_date) {
      this.mensaje.set('Indique la fecha de entrega (de 4 a 6 días).');
      return;
    }
    this.emitir({
      accion: 'crear',
      prestamo: null,
      user_id: Number(this.form.user_id),
      book_id: Number(this.form.book_id),
      loan_date: this.form.loan_date,
      delivery_date: this.form.delivery_date,
    });
  }

  aprobar(p: Prestamo): void {
    this.mensaje.set('');
    this.emitir({ accion: 'aprobar', prestamo: p });
  }

  rechazar(p: Prestamo): void {
    this.mensaje.set('');
    this.emitir({ accion: 'rechazar', prestamo: p });
  }

  devolver(p: Prestamo): void {
    this.mensaje.set('');
    this.emitir({ accion: 'devolver', prestamo: p });
  }

  cancelar(): void {
    if (this.enviando || this.guardando) {
      return;
    }
    this.cerrar.emit();
  }
}