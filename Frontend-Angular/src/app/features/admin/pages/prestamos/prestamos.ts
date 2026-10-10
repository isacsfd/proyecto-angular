import { firstValueFrom } from 'rxjs';
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ReportesService } from '../../../../core/services/reportes.service';
import { SugerenciasService } from '../../../../core/services/sugerencias.service';
import { BuscarSugerencias } from '../../../../shared/buscar-sugerencias/buscar-sugerencias';
import { SeleccionLibro } from '../../../../shared/seleccion-libro/seleccion-libro';
import { DatatableDirective } from '../../../../shared/datatable/datatable.directive';
import { fechaLocalISO, fechaLocalISOCompleta } from '../../../../core/utils/fecha';
import { Prestamo, PrestamoDispositivo, Dispositivo, Usuario } from '../../../../core/models';

@Component({
  selector: 'app-admin-prestamos',
  imports: [CommonModule, FormsModule, BuscarSugerencias, DatatableDirective, SeleccionLibro],
  templateUrl: './prestamos.html',
  styleUrl: './prestamos.css',
})
export class AdminPrestamos {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly reportes = inject(ReportesService);
  readonly sugerencias = inject(SugerenciasService);

  prestamos = signal<Prestamo[]>([]);
  prestamosDispositivos = signal<PrestamoDispositivo[]>([]);
  cargando = signal(false);
  error = signal('');
  filtro = signal('');

  // Formulario préstamo de libro
  mostrarFormLibro = signal(false);
  usuarios = signal<Usuario[]>([]);
  formLibro: any = {};

  // Formulario préstamo de dispositivo
  mostrarFormDispositivo = signal(false);
  dispositivos = signal<Dispositivo[]>([]);
  formDispositivo: any = {};

  constructor() {
    this.cargar();
    this.sugerencias.cargar();
  }

  /** Sede para la búsqueda de libros: super admin ve todas, el resto su propia sede. */
  sedeLibros(): string {
    return this.auth.isSuper() ? '' : (this.auth.usuario()?.sede ?? '');
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const [prestamos, prestamosDispositivos] = await Promise.all([
        firstValueFrom(this.api.listarPrestamos()),
        firstValueFrom(this.api.listarPrestamosDispositivos()),
      ]);
      this.prestamos.set(prestamos);
      this.prestamosDispositivos.set(prestamosDispositivos);
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al cargar préstamos.');
    } finally {
      this.cargando.set(false);
    }
  }

  async abrirFormLibro(): Promise<void> {
    this.error.set('');
    try {
      const usuarios = await firstValueFrom(this.api.listarUsuarios());
      this.usuarios.set(usuarios);
      this.formLibro = { user_id: null, book_id: null, loan_date: fechaLocalISO(), delivery_date: '' };
      this.mostrarFormLibro.set(true);
    } catch (err: any) {
      this.error.set('No se pudieron cargar los usuarios.');
    }
  }

  async guardarLibro(): Promise<void> {
    if (!this.formLibro.user_id || !this.formLibro.book_id) {
      this.error.set('Seleccione usuario y libro.');
      return;
    }
    if (!this.formLibro.delivery_date) {
      this.error.set('Indique la fecha de entrega.');
      return;
    }
    this.error.set('');
    try {
      await firstValueFrom(this.api.crearPrestamo({
        user_id: Number(this.formLibro.user_id),
        book_id: Number(this.formLibro.book_id),
        loan_date: this.formLibro.loan_date,
        delivery_date: this.formLibro.delivery_date,
        prestamo_state: 'Aprobado',
      }));
      this.mostrarFormLibro.set(false);
      await this.cargar();
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al crear el préstamo.');
    }
  }

  async aprobar(p: Prestamo): Promise<void> {
    try {
      await firstValueFrom(this.api.actualizarPrestamo(p.id, { prestamo_state: 'Aprobado' }));
      await this.cargar();
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al aprobar.');
    }
  }

  async rechazar(p: Prestamo): Promise<void> {
    try {
      await firstValueFrom(this.api.actualizarPrestamo(p.id, { prestamo_state: 'Rechazado', state: 'Devuelto' }));
      await this.cargar();
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al rechazar.');
    }
  }

  async devolver(p: Prestamo): Promise<void> {
    try {
      await firstValueFrom(this.api.actualizarPrestamo(p.id, {
        state: 'Devuelto',
        prestamo_state: 'Aprobado',
        entry_date: fechaLocalISOCompleta(),
      }));
      await this.cargar();
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al registrar la devolución.');
    }
  }

  async abrirFormDispositivo(): Promise<void> {
    this.error.set('');
    try {
      const [dispositivos, usuarios] = await Promise.all([
        firstValueFrom(this.api.listarDispositivos()),
        firstValueFrom(this.api.listarUsuarios()),
      ]);
      this.dispositivos.set(dispositivos.filter((d) => d.estado === 'Disponible'));
      this.usuarios.set(usuarios);
      const ini = fechaLocalISO();
      const fin = fechaLocalISO(new Date(new Date(ini).getTime() + 60 * 60000));
      this.formDispositivo = { dispositivo_id: null, user_id: null, fecha_prestamo: ini, fecha_devolucion: fin, observaciones: '' };
      this.mostrarFormDispositivo.set(true);
    } catch (err: any) {
      this.error.set('No se pudieron cargar dispositivos o usuarios.');
    }
  }

  async guardarDispositivo(): Promise<void> {
    if (!this.formDispositivo.dispositivo_id || !this.formDispositivo.user_id) {
      this.error.set('Seleccione dispositivo y usuario.');
      return;
    }
    if (!this.formDispositivo.fecha_devolucion) {
      this.error.set('Indique el fin de la franja horaria.');
      return;
    }
    const ini = new Date(this.formDispositivo.fecha_prestamo);
    const fin = new Date(this.formDispositivo.fecha_devolucion);
    const horas = (fin.getTime() - ini.getTime()) / 3600000;
    if (horas > 2) {
      this.error.set('La franja horaria no puede superar las 2 horas.');
      return;
    }
    this.error.set('');
    try {
      await firstValueFrom(this.api.crearPrestamoDispositivo({
        dispositivo_id: Number(this.formDispositivo.dispositivo_id),
        user_id: Number(this.formDispositivo.user_id),
        fecha_prestamo: this.formDispositivo.fecha_prestamo,
        fecha_devolucion: this.formDispositivo.fecha_devolucion,
        observaciones: this.formDispositivo.observaciones,
      }));
      this.mostrarFormDispositivo.set(false);
      await this.cargar();
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al crear el préstamo del dispositivo.');
    }
  }

  async aprobarDispositivo(p: PrestamoDispositivo): Promise<void> {
    try {
      await firstValueFrom(this.api.actualizarPrestamoDispositivo(p.id, { estado: 'Activo' }));
      await this.cargar();
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al aprobar la solicitud.');
    }
  }

  async rechazarDispositivo(p: PrestamoDispositivo): Promise<void> {
    if (!confirm('¿Rechazar la solicitud del dispositivo?')) return;
    try {
      await firstValueFrom(this.api.actualizarPrestamoDispositivo(p.id, { estado: 'Rechazado' }));
      await this.cargar();
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al rechazar la solicitud.');
    }
  }

  async devolverDispositivo(p: PrestamoDispositivo): Promise<void> {
    try {
      await firstValueFrom(this.api.actualizarPrestamoDispositivo(p.id, {
        estado: 'Completado',
        fecha_devolucion: fechaLocalISOCompleta(),
      }));
      await this.cargar();
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al registrar la devolución.');
    }
  }

  async danarDispositivo(p: PrestamoDispositivo): Promise<void> {
    if (!confirm('¿Marcar el dispositivo como dañado?')) return;
    try {
      await firstValueFrom(this.api.actualizarPrestamoDispositivo(p.id, { estado: 'Dañado' }));
      await this.cargar();
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al marcar el dispositivo.');
    }
  }

  exportarPDFLibros(): void {
    this.reportes.exportarPrestamosLibros(this.prestamos(), 'pdf');
  }

  exportarExcelLibros(): void {
    this.reportes.exportarPrestamosLibros(this.prestamos(), 'excel');
  }

  exportarPDFDispositivos(): void {
    this.reportes.exportarPrestamosDispositivos(this.prestamosDispositivos(), 'pdf');
  }

  exportarExcelDispositivos(): void {
    this.reportes.exportarPrestamosDispositivos(this.prestamosDispositivos(), 'excel');
  }

  badgePrestamo(estado: string): string {
    switch (estado) {
      case 'Activo': return 'text-bg-primary';
      case 'Pendiente': return 'text-bg-warning';
      case 'Rechazado': return 'text-bg-secondary';
      case 'Dañado': return 'text-bg-danger';
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