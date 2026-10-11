import { firstValueFrom } from 'rxjs';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AlertaService } from '../../../../core/services/alerta.service';
import { Dispositivo } from '../../../../core/models';
import {
  SolicitarDispositivoModal,
  SolicitudDispositivoDatos,
} from './solicitar-dispositivo-modal';

@Component({
  selector: 'app-user-dispositivos',
  imports: [FormsModule, SolicitarDispositivoModal],
  templateUrl: './dispositivos.html',
  styleUrl: './dispositivos.css',
})
export class UserDispositivos {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly alerta = inject(AlertaService);

  dispositivos = signal<Dispositivo[]>([]);
  cargando = signal(true);
  error = signal('');

  mostrarModal = signal(false);
  dispositivoModal = signal<Dispositivo | null>(null);
  guardandoModal = signal(false);

  constructor() {
    this.cargar();
  }

  private userId(): number {
    return this.auth.usuario()?.id ?? 0;
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.dispositivos.set(await firstValueFrom(this.api.listarDispositivos()));
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al cargar dispositivos. Verifique la conexión.');
    } finally {
      this.cargando.set(false);
    }
  }

  disponibles(): Dispositivo[] {
    return this.dispositivos().filter((d) => d.estado === 'Disponible');
  }

  abrirSolicitud(d: Dispositivo): void {
    this.dispositivoModal.set(d);
    this.guardandoModal.set(false);
    this.mostrarModal.set(true);
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
    this.dispositivoModal.set(null);
    this.guardandoModal.set(false);
  }

  async onGuardarDispositivo(datos: SolicitudDispositivoDatos): Promise<void> {
    const d = this.dispositivoModal();
    if (!d) return;
    this.guardandoModal.set(true);
    try {
      await firstValueFrom(this.api.crearPrestamoDispositivo({
        dispositivo_id: d.id,
        user_id: this.userId(),
        fecha_prestamo: datos.fecha_prestamo,
        fecha_devolucion: datos.fecha_devolucion,
        observaciones: datos.observaciones,
      }));
      await this.alerta.exito(
        `Solicitud enviada para "${d.marca} ${d.modelo}". Un administrador la aprobará.`,
      );
      this.cerrarModal();
      await this.cargar();
    } catch (err: any) {
      // El modal permanece abierto y conserva el formulario para reintentar.
      await this.alerta.error(err?.error?.detail || 'Error al solicitar el dispositivo. Verifique la conexión.');
    } finally {
      this.guardandoModal.set(false);
    }
  }

  badgeEstado(estado: string): string {
    switch (estado) {
      case 'Disponible': return 'text-bg-success';
      case 'Prestado': return 'text-bg-primary';
      case 'Dañado': return 'text-bg-danger';
      default: return 'text-bg-secondary';
    }
  }
}