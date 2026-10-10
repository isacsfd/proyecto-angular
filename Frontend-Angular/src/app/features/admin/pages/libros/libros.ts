import { firstValueFrom } from 'rxjs';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ReportesService } from '../../../../core/services/reportes.service';
import { SugerenciasService } from '../../../../core/services/sugerencias.service';
import { BuscarSugerencias } from '../../../../shared/buscar-sugerencias/buscar-sugerencias';
import { DatatableDirective } from '../../../../shared/datatable/datatable.directive';
import { Alerta } from '../../../../shared/alerta/alerta';
import { SEDES } from '../../../../core/models/sedes';
import { Libro } from '../../../../core/models';

@Component({
  selector: 'app-admin-libros',
  imports: [FormsModule, BuscarSugerencias, DatatableDirective, Alerta],
  templateUrl: './libros.html',
  styleUrl: './libros.css',
})
export class AdminLibros {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly reportes = inject(ReportesService);
  readonly sugerencias = inject(SugerenciasService);

  libros = signal<Libro[]>([]);
  cargando = signal(false);
  error = signal('');
  filtro = signal('');
  sedeFiltro = signal('');

  readonly sedes = SEDES;

  // Formulario
  mostrarForm = signal(false);
  editandoId: number | null = null;
  form: any = {};

  constructor(private readonly route: ActivatedRoute) {
    this.cargar();
    this.sugerencias.cargar();
    this.route.queryParamMap.subscribe((params) => {
      const termino = params.get('buscar');
      if (termino) this.filtro.set(termino);
    });
  }

  esSuper(): boolean {
    return this.auth.isSuper();
  }

  sedeAdmin(): string {
    return this.auth.usuario()?.sede ?? 'Soledad';
  }

  /** Sede por defecto para los libros nuevos (la del admin o el filtro elegido). */
  sedeLibroNuevo(): string {
    return this.esSuper() ? this.sedeFiltro() || 'Soledad' : this.sedeAdmin();
  }

  cambiarSede(): void {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const sede = this.esSuper() ? this.sedeFiltro() : '';
      this.libros.set(await firstValueFrom(this.api.listarLibros(sede)));
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al cargar libros.');
    } finally {
      this.cargando.set(false);
    }
  }

  nuevo(): void {
    this.editandoId = null;
    this.form = {
      Autor: '',
      Titulo: '',
      Programa: '',
      Item: 0,
      Signatura: '',
      Areas: 0,
      Ejemplar: 1,
      Editorial: '',
      Año: new Date().getFullYear(),
      Idioma: 'Español',
      sede: this.sedeLibroNuevo(),
    };
    this.mostrarForm.set(true);
  }

  editar(libro: Libro): void {
    this.editandoId = libro.ID;
    this.form = { ...libro };
    this.mostrarForm.set(true);
  }

  cancelar(): void {
    this.mostrarForm.set(false);
    this.editandoId = null;
  }

  async guardar(): Promise<void> {
    if (!this.form.Titulo || !this.form.Autor) {
      this.error.set('Título y autor son obligatorios.');
      return;
    }
    this.error.set('');
    try {
      if (this.editandoId) {
        await firstValueFrom(this.api.actualizarLibro(this.editandoId, this.form));
      } else {
        await firstValueFrom(this.api.crearLibro(this.form));
      }
      this.mostrarForm.set(false);
      this.editandoId = null;
      await this.cargar();
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al guardar el libro.');
    }
  }

  async eliminar(libro: Libro): Promise<void> {
    if (!confirm(`¿Eliminar "${libro.Titulo}" del catálogo?`)) return;
    try {
      await firstValueFrom(this.api.eliminarLibro(libro.ID));
      await this.cargar();
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al eliminar el libro.');
    }
  }

  exportarPDF(): void {
    this.reportes.exportarLibros(this.libros(), 'pdf');
  }

  exportarExcel(): void {
    this.reportes.exportarLibros(this.libros(), 'excel');
  }
}