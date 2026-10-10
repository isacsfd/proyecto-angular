import { firstValueFrom } from 'rxjs';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { fechaLocalHoyA } from '../../../../core/utils/fecha';
import { Dispositivo } from '../../../../core/models';

@Component({
  selector: 'app-user-dispositivos',
  imports: [FormsModule],
  templateUrl: './dispositivos.html',
  styleUrl: './dispositivos.css',
})
export class UserDispositivos {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  dispositivos = signal<Dispositivo[]>([]);
  cargando = signal(true);
  error = signal('');
  mensajeExito = signal('');

  mostrarSolicitud = signal(false);
  dispositivoSeleccionado: Dispositivo | null = null;
  observaciones = '';
  fechaInicio = '';
  fechaFin = '';

  constructor() {
    this.cargar();
  }

  private userId(): number {
    return this.auth.usuario()?.id ?? 0;
  }

  private hoyA(horas: number, minutos = 0): string {
    return fechaLocalHoyA(horas, minutos);
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.dispositivos.set(await firstValueFrom(this.api.listarDispositivos()));
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al cargar dispositivos.');
    } finally {
      this.cargando.set(false);
    }
  }

  disponibles(): Dispositivo[] {
    return this.dispositivos().filter((d) => d.estado === 'Disponible');
  }

  abrirSolicitud(d: Dispositivo): void {
    this.dispositivoSeleccionado = d;
    this.observaciones = '';
    // Franja sugerida: hoy de 09:00 a 10:00 (máx. 2 h, servicio 08:00-20:00)
    this.fechaInicio = this.hoyA(9);
    this.fechaFin = this.hoyA(10);
    this.mostrarSolicitud.set(true);
  }

  private validarFranja(): string {
    if (!this.fechaInicio || !this.fechaFin) return 'Debe indicar inicio y fin de la franja horaria.';
    const ini = new Date(this.fechaInicio);
    const fin = new Date(this.fechaFin);
    if (fin <= ini) return 'La fecha de fin debe ser posterior al inicio.';
    const horas = (fin.getTime() - ini.getTime()) / 3600000;
    if (horas > 2) return 'La franja horaria no puede superar las 2 horas.';
    const enH = (d: Date) => {
      const m = d.getHours() + d.getMinutes() / 60;
      return m >= 8 && m <= 20;
    };
    if (!enH(ini) || !enH(fin)) return 'El servicio opera de 8:00 a.m. a 8:00 p.m.';
    return '';
  }

  async solicitar(): Promise<void> {
    if (!this.dispositivoSeleccionado) return;
    const errorFranja = this.validarFranja();
    if (errorFranja) {
      this.error.set(errorFranja);
      return;
    }
    this.error.set('');
    this.mensajeExito.set('');
    try {
      await firstValueFrom(this.api.crearPrestamoDispositivo({
          dispositivo_id: this.dispositivoSeleccionado.id,
          user_id: this.userId(),
          fecha_prestamo: this.fechaInicio,
          fecha_devolucion: this.fechaFin,
          observaciones: this.observaciones,
        }));
      this.mostrarSolicitud.set(false);
      this.mensajeExito.set(`Solicitud enviada para "${this.dispositivoSeleccionado.marca} ${this.dispositivoSeleccionado.modelo}". Un administrador la aprobará.`);
      this.dispositivoSeleccionado = null;
      await this.cargar();
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al solicitar el dispositivo.');
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