import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { ReportesService } from '../../../../core/services/reportes.service';
import { SugerenciasService } from '../../../../core/services/sugerencias.service';
import { BuscarSugerencias } from '../../../../shared/buscar-sugerencias/buscar-sugerencias';
import { DatatableDirective } from '../../../../shared/datatable/datatable.directive';
import { Acceso } from '../../../../core/models';

@Component({
  selector: 'app-admin-ingresos',
  imports: [CommonModule, BuscarSugerencias, DatatableDirective],
  templateUrl: './ingresos.html',
  styleUrl: './ingresos.css',
})
export class AdminIngresos {
  private readonly api = inject(ApiService);
  private readonly reportes = inject(ReportesService);
  readonly sugerencias = inject(SugerenciasService);

  accesos = signal<Acceso[]>([]);
  cargando = signal(false);
  error = signal('');
  filtro = signal('');
  mensajeLector = signal('');
  activandoLector = signal(false);

  private timer: any = null;

  constructor() {
    this.cargar();
    this.sugerencias.cargar();
    this.timer = setInterval(() => this.cargar(false), 5000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async cargar(conSpinner = true): Promise<void> {
    if (conSpinner) this.cargando.set(true);
    this.error.set('');
    try {
      this.accesos.set(await firstValueFrom(this.api.listarAccesos()));
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al cargar los ingresos.');
    } finally {
      if (conSpinner) this.cargando.set(false);
    }
  }

  async activarLector(): Promise<void> {
    this.activandoLector.set(true);
    this.mensajeLector.set('');
    try {
      const res = await firstValueFrom(this.api.iniciarLector());
      this.mensajeLector.set(res.mensaje);
    } catch (err: any) {
      this.mensajeLector.set(err?.error?.detail || 'No se pudo iniciar el lector QR.');
    } finally {
      this.activandoLector.set(false);
    }
  }

  totalExitosos(): number {
    return this.accesos().filter((a) => a.status).length;
  }

  exportarPDF(): void {
    this.reportes.exportarIngresos(this.accesos(), 'pdf');
  }

  exportarExcel(): void {
    this.reportes.exportarIngresos(this.accesos(), 'excel');
  }
}