import { firstValueFrom } from 'rxjs';
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/services/api.service';
import { ReportesService } from '../core/services/reportes.service';
import { SugerenciasService } from '../core/services/sugerencias.service';
import { BuscarSugerencias } from '../shared/buscar-sugerencias/buscar-sugerencias';
import { DatatableDirective } from '../shared/datatable/datatable.directive';
import { Acceso, Dispositivo } from '../core/models';

@Component({
  selector: 'app-admin-estadisticas',
  imports: [CommonModule, BuscarSugerencias, DatatableDirective],
  templateUrl: './estadisticas.html',
  styleUrl: './estadisticas.css',
})
export class AdminEstadisticas {
  private readonly api = inject(ApiService);
  private readonly reportes = inject(ReportesService);
  readonly sugerencias = inject(SugerenciasService);

  cargando = signal(false);
  error = signal('');
  accesos = signal<Acceso[]>([]);
  dispositivos = signal<Dispositivo[]>([]);
  filtro = signal('');

  constructor() {
    this.cargar();
    this.sugerencias.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const [accesos, dispositivos] = await Promise.all([
        firstValueFrom(this.api.listarAccesos()),
        firstValueFrom(this.api.listarDispositivos()),
      ]);
      this.accesos.set(accesos);
      this.dispositivos.set(dispositivos);
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al cargar estadísticas.');
    } finally {
      this.cargando.set(false);
    }
  }

  porSede(): { sede: string; total: number }[] {
    const mapa = new Map<string, number>();
    for (const d of this.dispositivos()) {
      mapa.set(d.sede, (mapa.get(d.sede) ?? 0) + 1);
    }
    return [...mapa.entries()].map(([sede, total]) => ({ sede, total }));
  }

  porEstado(): { estado: string; total: number }[] {
    const mapa = new Map<string, number>();
    for (const d of this.dispositivos()) {
      mapa.set(d.estado, (mapa.get(d.estado) ?? 0) + 1);
    }
    return [...mapa.entries()].map(([estado, total]) => ({ estado, total }));
  }

  totalAccesosExitosos(): number {
    return this.accesos().filter((a) => a.status).length;
  }

  exportarPDF(): void {
    this.reportes.exportarIngresos(this.accesos(), 'pdf');
  }

  exportarExcel(): void {
    this.reportes.exportarIngresos(this.accesos(), 'excel');
  }
}