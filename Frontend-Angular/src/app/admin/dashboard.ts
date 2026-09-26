import { firstValueFrom } from 'rxjs';
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/services/api.service';
import { DashboardIA, EstadoIA } from '../core/models';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class AdminDashboard {
  private readonly api = inject(ApiService);

  cargando = signal(true);
  error = signal('');
  datos = signal<DashboardIA | null>(null);
  estadoIa = signal<EstadoIA | null>(null);

  maximoTendencia = 1;

  constructor() {
    this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const [dashboard, estado] = await Promise.all([
        firstValueFrom(this.api.dashboardIA()),
        firstValueFrom(this.api.estadoIA()),
      ]);
      this.datos.set(dashboard);
      this.estadoIa.set(estado);
      const series = dashboard.tendencia.series;
      if (series.length) {
        this.maximoTendencia = Math.max(...series.map((s) => s.total), 1);
      }
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'No se pudo cargar el panel de IA.');
    } finally {
      this.cargando.set(false);
    }
  }
}