import { firstValueFrom } from 'rxjs';
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { DatatableDirective } from '../shared/datatable/datatable.directive';
import { SeleccionLibro } from '../shared/seleccion-libro/seleccion-libro';
import { fechaLocalISO, fechaLocalMasDias } from '../core/utils/fecha';
import { Prestamo } from '../core/models';

@Component({
  selector: 'app-user-mis-prestamos',
  imports: [CommonModule, FormsModule, DatatableDirective, SeleccionLibro],
  templateUrl: './mis-prestamos.html',
  styleUrl: './mis-prestamos.css',
})
export class UserMisPrestamos {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  misPrestamos = signal<Prestamo[]>([]);
  cargando = signal(true);
  error = signal('');
  filtro = signal('');
  mensajeExito = signal('');

  // Solicitud
  mostrarSolicitud = signal(false);
  formSolicitud: any = {};

  constructor() {
    this.cargar();
  }

  private userId(): number {
    return this.auth.usuario()?.id ?? 0;
  }

  sedeUsuario(): string {
    return this.auth.usuario()?.sede ?? '';
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const todos = await firstValueFrom(this.api.listarPrestamos());
      this.misPrestamos.set(todos.filter((p) => p.user_id === this.userId()));
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al cargar tus préstamos.');
    } finally {
      this.cargando.set(false);
    }
  }

  async abrirSolicitud(): Promise<void> {
    this.error.set('');
    this.formSolicitud = { book_id: null, loan_date: fechaLocalISO(), delivery_date: fechaLocalMasDias(5) };
    this.mostrarSolicitud.set(true);
  }

  async solicitar(): Promise<void> {
    if (!this.formSolicitud.book_id) {
      this.error.set('Seleccione un libro.');
      return;
    }
    this.error.set('');
    this.mensajeExito.set('');
    try {
      await firstValueFrom(this.api.crearPrestamo({
        user_id: this.userId(),
        book_id: Number(this.formSolicitud.book_id),
        loan_date: this.formSolicitud.loan_date,
        delivery_date: this.formSolicitud.delivery_date,
        prestamo_state: 'No Aprobado',
      }));
      this.mostrarSolicitud.set(false);
      this.mensajeExito.set('Solicitud enviada. El administrador la revisará próximamente.');
      await this.cargar();
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al enviar la solicitud.');
    }
  }

  badgePrestamo(estado: string): string {
    switch (estado) {
      case 'Activo': return 'text-bg-primary';
      case 'Vencido': return 'text-bg-danger';
      default: return 'text-bg-success';
    }
  }

  badgeSolicitud(estado: string): string {
    switch (estado) {
      case 'Aprobado': return 'text-bg-success';
      case 'Rechazado': return 'text-bg-danger';
      default: return 'text-bg-warning';
    }
  }
}