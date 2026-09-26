import { firstValueFrom } from 'rxjs';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/services/api.service';
import { ReportesService } from '../core/services/reportes.service';
import { SugerenciasService } from '../core/services/sugerencias.service';
import { BuscarSugerencias } from '../shared/buscar-sugerencias/buscar-sugerencias';
import { DatatableDirective } from '../shared/datatable/datatable.directive';
import { Dispositivo } from '../core/models';

const SEDES = ['Soledad', 'Barranquilla', 'Colsamiro'];
const TIPOS = ['Computador', 'Tablet'];
const ESTADOS = ['Disponible', 'Prestado', 'Dañado', 'En Mantenimiento'];

@Component({
  selector: 'app-admin-dispositivos',
  imports: [FormsModule, BuscarSugerencias, DatatableDirective],
  templateUrl: './dispositivos.html',
  styleUrl: './dispositivos.css',
})
export class AdminDispositivos {
  private readonly api = inject(ApiService);
  private readonly reportes = inject(ReportesService);
  readonly sugerencias = inject(SugerenciasService);

  dispositivos = signal<Dispositivo[]>([]);
  cargando = signal(false);
  error = signal('');
  filtro = signal('');

  mostrarForm = signal(false);
  editandoId: number | null = null;
  form: any = {};

  readonly sedes = SEDES;
  readonly tipos = TIPOS;
  readonly estados = ESTADOS;

  constructor() {
    this.cargar();
    this.sugerencias.cargar();
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

  nuevo(): void {
    this.editandoId = null;
    this.form = { tipo: 'Computador', marca: '', modelo: '', sede: 'Soledad', estado: 'Disponible' };
    this.mostrarForm.set(true);
  }

  editar(d: Dispositivo): void {
    this.editandoId = d.id;
    this.form = { ...d };
    this.mostrarForm.set(true);
  }

  cancelar(): void {
    this.mostrarForm.set(false);
    this.editandoId = null;
  }

  async guardar(): Promise<void> {
    if (!this.form.marca || !this.form.modelo) {
      this.error.set('Marca y modelo son obligatorios.');
      return;
    }
    this.error.set('');
    try {
      if (this.editandoId) {
        await firstValueFrom(this.api.actualizarDispositivo(this.editandoId, this.form));
      } else {
        await firstValueFrom(this.api.crearDispositivo(this.form));
      }
      this.mostrarForm.set(false);
      this.editandoId = null;
      await this.cargar();
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al guardar el dispositivo.');
    }
  }

  async eliminar(d: Dispositivo): Promise<void> {
    if (!confirm(`¿Eliminar ${d.tipo} ${d.marca} ${d.modelo}?`)) return;
    try {
      await firstValueFrom(this.api.eliminarDispositivo(d.id));
      await this.cargar();
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al eliminar el dispositivo.');
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

  exportarPDF(): void {
    this.reportes.exportarDispositivos(this.dispositivos(), 'pdf');
  }

  exportarExcel(): void {
    this.reportes.exportarDispositivos(this.dispositivos(), 'excel');
  }
}