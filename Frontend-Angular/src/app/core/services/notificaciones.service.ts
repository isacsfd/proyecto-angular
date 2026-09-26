import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

const INTERVALO_MS = 10000;

/**
 * NotificacionesService — Consulta periódicamente los préstamos (libros y
 * dispositivos) y expone cuántas solicitudes están pendientes de aprobación,
 * para mostrarlo como indicador en el panel de administración.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly api = inject(ApiService);

  /** Cantidad de solicitudes pendientes (libros "No Aprobado" + dispositivos "Pendiente"). */
  pendientes = signal(0);

  /** Detalle para el tooltip / lista. */
  pendientesLibros = signal(0);
  pendientesDispositivos = signal(0);

  private timer: any = null;

  iniciar(): void {
    if (this.timer) return;
    this.consultar();
    this.timer = setInterval(() => this.consultar(), INTERVALO_MS);
  }

  detener(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async consultar(): Promise<void> {
    try {
      const [prestamos, prestamosDispositivos] = await Promise.all([
        firstValueFrom(this.api.listarPrestamos()),
        firstValueFrom(this.api.listarPrestamosDispositivos()),
      ]);
      const libros = prestamos.filter((p) => p.prestamo_state === 'No Aprobado').length;
      const disp = prestamosDispositivos.filter((p) => p.estado === 'Pendiente').length;
      this.pendientesLibros.set(libros);
      this.pendientesDispositivos.set(disp);
      this.pendientes.set(libros + disp);
    } catch {
      /* si la API no responde, se conserva el último conteo */
    }
  }
}