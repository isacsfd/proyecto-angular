import { firstValueFrom } from 'rxjs';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';

import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AlertaService } from '../../../../core/services/alerta.service';
import { ReportesService } from '../../../../core/services/reportes.service';
import { SugerenciasService } from '../../../../core/services/sugerencias.service';
import { BuscarSugerencias } from '../../../../shared/buscar-sugerencias/buscar-sugerencias';
import { DatatableDirective } from '../../../../shared/datatable/datatable.directive';
import { PaginadorNgx } from '../../../../shared/paginador-ngx/paginador-ngx';
import { fechaLocalISOCompleta } from '../../../../core/utils/fecha';
import { Prestamo, PrestamoDispositivo, Dispositivo, Usuario } from '../../../../core/models';
import { PrestamoLibroModal, PrestamoAccion } from './prestamo-libro-modal';
import {
  PrestamoDispositivoModal,
  PrestamoDispositivoAccion,
} from './prestamo-dispositivo-modal';

@Component({
  selector: 'app-admin-prestamos',
  imports: [
    CommonModule,
    FormsModule,
    BuscarSugerencias,
    DatatableDirective,
    NgxDatatableModule,
    PaginadorNgx,
    PrestamoLibroModal,
    PrestamoDispositivoModal,
  ],
  templateUrl: './prestamos.html',
  styleUrl: './prestamos.css',
})
export class AdminPrestamos {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly alerta = inject(AlertaService);
  private readonly reportes = inject(ReportesService);
  readonly sugerencias = inject(SugerenciasService);

  prestamos = signal<Prestamo[]>([]);
  prestamosDispositivos = signal<PrestamoDispositivo[]>([]);
  cargando = signal(false);
  error = signal('');
  filtro = signal('');

  // Paginación superior de la tabla de préstamos de libros.
  offsetLibros = signal(0);
  limiteLibros = signal(10);

  readonly filasPrestamosLibros = computed(() => {
    const termino = this.filtro().trim().toLowerCase();
    const filas = this.prestamos();
    if (!termino) return filas;
    return filas.filter((p) =>
      [p.user ?? '', p.book ?? '', p.state ?? '', p.prestamo_state ?? '']
        .join(' ')
        .toLowerCase()
        .includes(termino),
    );
  });

  // Modal préstamo de libro.
  mostrarModalLibro = signal(false);
  modalPrestamo = signal<Prestamo | null>(null);
  modalUsuariosLibro = signal<Usuario[]>([]);
  guardandoModalLibro = signal(false);

  // Modal préstamo de dispositivo.
  mostrarModalDispo = signal(false);
  modalDispo = signal<PrestamoDispositivo | null>(null);
  dispositivos = signal<Dispositivo[]>([]);
  usuarios = signal<Usuario[]>([]);
  guardandoModalDispo = signal(false);

  constructor() {
    this.cargar();
    this.sugerencias.cargar();
    effect(() => {
      void this.filtro();
      this.offsetLibros.set(0);
    });
  }

  sedeLibros(): string {
    return this.auth.isSuper() ? '' : (this.auth.usuario()?.sede ?? '');
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    this.offsetLibros.set(0);
    try {
      const [prestamos, prestamosDispositivos] = await Promise.all([
        firstValueFrom(this.api.listarPrestamos()),
        firstValueFrom(this.api.listarPrestamosDispositivos()),
      ]);
      this.prestamos.set(prestamos);
      this.prestamosDispositivos.set(prestamosDispositivos);
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al cargar préstamos. Verifique la conexión con FastAPI.');
    } finally {
      this.cargando.set(false);
    }
  }

  // ─── Modal préstamo de libro ────────────────────────────────────────────────
  async abrirModalRegistrarLibro(): Promise<void> {
    this.error.set('');
    try {
      const usuarios = await firstValueFrom(this.api.listarUsuarios());
      this.modalUsuariosLibro.set(usuarios);
      this.modalPrestamo.set(null);
      this.guardandoModalLibro.set(false);
      this.mostrarModalLibro.set(true);
    } catch {
      await this.alerta.error('No se pudieron cargar los usuarios.');
    }
  }

  abrirModalConsultarLibro(p: Prestamo): void {
    this.modalPrestamo.set(p);
    this.modalUsuariosLibro.set(this.usuarios());
    this.guardandoModalLibro.set(false);
    this.mostrarModalLibro.set(true);
  }

  cerrarModalLibro(): void {
    this.mostrarModalLibro.set(false);
    this.modalPrestamo.set(null);
    this.guardandoModalLibro.set(false);
  }

  async onGuardarLibro(accion: PrestamoAccion): Promise<void> {
    this.guardandoModalLibro.set(true);
    try {
      if (accion.accion === 'crear') {
        await firstValueFrom(this.api.crearPrestamo({
          user_id: accion.user_id as number,
          book_id: accion.book_id as number,
          loan_date: accion.loan_date as string,
          delivery_date: accion.delivery_date as string,
          prestamo_state: 'Aprobado',
        }));
        await this.alerta.exito('Préstamo registrado correctamente.');
        this.cerrarModalLibro();
      } else if (accion.prestamo) {
        const p = accion.prestamo;
        if (accion.accion === 'aprobar') {
          await this._confirmarAccionLibro(p, '¿Aprobar esta solicitud?', { prestamo_state: 'Aprobado' }, 'Solicitud aprobada.');
        } else if (accion.accion === 'rechazar') {
          await this._confirmarAccionLibro(p, '¿Rechazar esta solicitud?', { prestamo_state: 'Rechazado', state: 'Devuelto' }, 'Solicitud rechazada.');
        } else if (accion.accion === 'devolver') {
          await this._confirmarAccionLibro(
            p,
            '¿Registrar la devolución del libro?',
            { state: 'Devuelto', prestamo_state: 'Aprobado', entry_date: fechaLocalISOCompleta() },
            'Devolución registrada.',
          );
        }
      }
    } catch (err: any) {
      await this.alerta.error(err?.error?.detail || 'Error al procesar la operación. Verifique la conexión.');
    } finally {
      this.guardandoModalLibro.set(false);
    }
  }

  private async _confirmarAccionLibro(p: Prestamo, titulo: string, datos: unknown, exito: string): Promise<void> {
    if (!(await this.alerta.confirmar({ titulo }))) return;
    await firstValueFrom(this.api.actualizarPrestamo(p.id, datos as never));
    await this.alerta.exito(exito);
    this.cerrarModalLibro();
    await this.cargar();
  }

  // ─── Modal préstamo de dispositivo ──────────────────────────────────────────
  async abrirModalRegistrarDispo(): Promise<void> {
    this.error.set('');
    try {
      const [dispositivos, usuarios] = await Promise.all([
        firstValueFrom(this.api.listarDispositivos()),
        firstValueFrom(this.api.listarUsuarios()),
      ]);
      this.dispositivos.set(dispositivos.filter((d) => d.estado === 'Disponible'));
      this.usuarios.set(usuarios);
      this.modalDispo.set(null);
      this.guardandoModalDispo.set(false);
      this.mostrarModalDispo.set(true);
    } catch {
      await this.alerta.error('No se pudieron cargar dispositivos o usuarios.');
    }
  }

  abrirModalConsultarDispo(p: PrestamoDispositivo): void {
    this.modalDispo.set(p);
    this.guardandoModalDispo.set(false);
    this.mostrarModalDispo.set(true);
  }

  cerrarModalDispo(): void {
    this.mostrarModalDispo.set(false);
    this.modalDispo.set(null);
    this.guardandoModalDispo.set(false);
  }

  async onGuardarDispostivo(accion: PrestamoDispositivoAccion): Promise<void> {
    this.guardandoModalDispo.set(true);
    try {
      if (accion.accion === 'crear') {
        await firstValueFrom(this.api.crearPrestamoDispositivo({
          dispositivo_id: accion.dispositivo_id as number,
          user_id: accion.user_id as number,
          fecha_prestamo: accion.fecha_prestamo as string,
          fecha_devolucion: accion.fecha_devolucion as string,
          observaciones: accion.observaciones,
        }));
        await this.alerta.exito('Préstamo del dispositivo registrado.');
        this.cerrarModalDispo();
      } else if (accion.prestamo) {
        const p = accion.prestamo;
        const porEstado: Record<string, { titulo: string; datos: { estado: string } | { estado: string; fecha_devolucion: string }; exito: string }> = {
          aprobar: { titulo: '¿Aprobar la solicitud?', datos: { estado: 'Activo' }, exito: 'Solicitud aprobada.' },
          rechazar: { titulo: '¿Rechazar la solicitud?', datos: { estado: 'Rechazado' }, exito: 'Solicitud rechazada.' },
          completar: { titulo: '¿Registrar la devolución?', datos: { estado: 'Completado', fecha_devolucion: fechaLocalISOCompleta() }, exito: 'Devolución registrada.' },
          danar: { titulo: '¿Marcar el dispositivo como dañado?', datos: { estado: 'Dañado' }, exito: 'Dispositivo marcado como dañado.' },
        };
        const regla = porEstado[accion.accion];
        if (regla) {
          if (!(await this.alerta.confirmar({ titulo: regla.titulo }))) return;
          await firstValueFrom(this.api.actualizarPrestamoDispositivo(p.id, regla.datos as never));
          await this.alerta.exito(regla.exito);
          this.cerrarModalDispo();
          await this.cargar();
        }
      }
    } catch (err: any) {
      await this.alerta.error(err?.error?.detail || 'Error al procesar la operación. Verifique la conexión.');
    } finally {
      this.guardandoModalDispo.set(false);
    }
  }

  // ─── Acciones rápidas (tabla) ───────────────────────────────────────────────
  async aprobar(p: Prestamo): Promise<void> {
    if (!(await this.alerta.confirmar({ titulo: '¿Aprobar esta solicitud?' }))) return;
    try {
      await firstValueFrom(this.api.actualizarPrestamo(p.id, { prestamo_state: 'Aprobado' }));
      await this.alerta.exito('Solicitud aprobada.');
      await this.cargar();
    } catch (err: any) {
      await this.alerta.error(err?.error?.detail || 'Error al aprobar.');
    }
  }

  async rechazar(p: Prestamo): Promise<void> {
    if (!(await this.alerta.confirmar({ titulo: '¿Rechazar esta solicitud?' }))) return;
    try {
      await firstValueFrom(this.api.actualizarPrestamo(p.id, { prestamo_state: 'Rechazado', state: 'Devuelto' }));
      await this.alerta.exito('Solicitud rechazada.');
      await this.cargar();
    } catch (err: any) {
      await this.alerta.error(err?.error?.detail || 'Error al rechazar.');
    }
  }

  async devolver(p: Prestamo): Promise<void> {
    if (!(await this.alerta.confirmar({ titulo: '¿Registrar la devolución?' }))) return;
    try {
      await firstValueFrom(this.api.actualizarPrestamo(p.id, {
        state: 'Devuelto',
        prestamo_state: 'Aprobado',
        entry_date: fechaLocalISOCompleta(),
      }));
      await this.alerta.exito('Devolución registrada.');
      await this.cargar();
    } catch (err: any) {
      await this.alerta.error(err?.error?.detail || 'Error al registrar la devolución.');
    }
  }

  async aprobarDispositivo(p: PrestamoDispositivo): Promise<void> {
    try {
      await firstValueFrom(this.api.actualizarPrestamoDispositivo(p.id, { estado: 'Activo' }));
      await this.alerta.exito('Solicitud aprobada.');
      await this.cargar();
    } catch (err: any) {
      await this.alerta.error(err?.error?.detail || 'Error al aprobar la solicitud.');
    }
  }

  async rechazarDispositivo(p: PrestamoDispositivo): Promise<void> {
    if (!(await this.alerta.confirmar({ titulo: '¿Rechazar la solicitud del dispositivo?' }))) return;
    try {
      await firstValueFrom(this.api.actualizarPrestamoDispositivo(p.id, { estado: 'Rechazado' }));
      await this.alerta.exito('Solicitud rechazada.');
      await this.cargar();
    } catch (err: any) {
      await this.alerta.error(err?.error?.detail || 'Error al rechazar la solicitud.');
    }
  }

  async devolverDispositivo(p: PrestamoDispositivo): Promise<void> {
    try {
      await firstValueFrom(this.api.actualizarPrestamoDispositivo(p.id, {
        estado: 'Completado',
        fecha_devolucion: fechaLocalISOCompleta(),
      }));
      await this.alerta.exito('Devolución registrada.');
      await this.cargar();
    } catch (err: any) {
      await this.alerta.error(err?.error?.detail || 'Error al registrar la devolución.');
    }
  }

  async danarDispositivo(p: PrestamoDispositivo): Promise<void> {
    if (!(await this.alerta.confirmar({ titulo: '¿Marcar el dispositivo como dañado?' }))) return;
    try {
      await firstValueFrom(this.api.actualizarPrestamoDispositivo(p.id, { estado: 'Dañado' }));
      await this.alerta.exito('Dispositivo marcado como dañado.');
      await this.cargar();
    } catch (err: any) {
      await this.alerta.error(err?.error?.detail || 'Error al marcar el dispositivo.');
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