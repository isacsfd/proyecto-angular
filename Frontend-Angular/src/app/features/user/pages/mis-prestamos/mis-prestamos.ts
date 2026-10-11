import { firstValueFrom } from 'rxjs';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';

import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AlertaService } from '../../../../core/services/alerta.service';
import { PaginadorNgx } from '../../../../shared/paginador-ngx/paginador-ngx';
import { Prestamo } from '../../../../core/models';
import { SolicitarPrestamoModal, SolicitudDatos } from './solicitar-prestamo-modal';

@Component({
  selector: 'app-user-mis-prestamos',
  imports: [CommonModule, FormsModule, NgxDatatableModule, PaginadorNgx, SolicitarPrestamoModal],
  templateUrl: './mis-prestamos.html',
  styleUrl: './mis-prestamos.css',
})
export class UserMisPrestamos {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly alerta = inject(AlertaService);

  misPrestamos = signal<Prestamo[]>([]);
  cargando = signal(true);
  error = signal('');
  filtro = signal('');

  // Paginación superior (local).
  offset = signal(0);
  limite = signal(10);

  readonly filasFiltradas = computed(() => {
    const termino = this.filtro().trim().toLowerCase();
    const filas = this.misPrestamos();
    if (!termino) return filas;
    return filas.filter((p) =>
      [p.book ?? '', p.state ?? '', p.prestamo_state ?? ''].join(' ').toLowerCase().includes(termino),
    );
  });

  readonly filasPagina = computed(() => {
    const filas = this.filasFiltradas();
    const inicio = this.offset() * this.limite();
    return filas.slice(inicio, inicio + this.limite());
  });

  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.filasFiltradas().length / this.limite())));

  mostrarSolicitud = signal(false);
  guardandoSolicitud = signal(false);

  constructor() {
    this.cargar();
    effect(() => {
      void this.filtro();
      this.offset.set(0);
    });
    effect(() => {
      if (this.offset() >= this.totalPaginas()) {
        this.offset.set(Math.max(0, this.totalPaginas() - 1));
      }
    });
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
    this.offset.set(0);
    try {
      const todos = await firstValueFrom(this.api.listarPrestamos());
      this.misPrestamos.set(todos.filter((p) => p.user_id === this.userId()));
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al cargar tus préstamos. Verifique la conexión con FastAPI.');
    } finally {
      this.cargando.set(false);
    }
  }

  abrirSolicitud(): void {
    this.guardandoSolicitud.set(false);
    this.mostrarSolicitud.set(true);
  }

  cerrarSolicitud(): void {
    this.mostrarSolicitud.set(false);
    this.guardandoSolicitud.set(false);
  }

  async onSolicitar(datos: SolicitudDatos): Promise<void> {
    this.guardandoSolicitud.set(true);
    try {
      await firstValueFrom(this.api.crearPrestamo({
        user_id: this.userId(),
        book_id: datos.book_id,
        loan_date: datos.loan_date,
        delivery_date: datos.delivery_date,
        prestamo_state: 'No Aprobado',
      }));
      await this.alerta.exito('Solicitud enviada. El administrador la revisará próximamente.');
      this.cerrarSolicitud();
      await this.cargar();
    } catch (err: any) {
      await this.alerta.error(err?.error?.detail || 'Error al enviar la solicitud. Verifique la conexión.');
    } finally {
      this.guardandoSolicitud.set(false);
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