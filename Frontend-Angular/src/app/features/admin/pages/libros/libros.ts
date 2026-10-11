import { firstValueFrom } from 'rxjs';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';

import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AlertaService } from '../../../../core/services/alerta.service';
import { ReportesService } from '../../../../core/services/reportes.service';
import { SugerenciasService } from '../../../../core/services/sugerencias.service';
import { BuscarSugerencias } from '../../../../shared/buscar-sugerencias/buscar-sugerencias';
import { Alerta } from '../../../../shared/alerta/alerta';
import { PaginadorNgx } from '../../../../shared/paginador-ngx/paginador-ngx';
import { SEDES } from '../../../../core/models/sedes';
import { Libro } from '../../../../core/models';
import { LibroModal, LibroDatos } from './libro-modal';

@Component({
  selector: 'app-admin-libros',
  imports: [FormsModule, BuscarSugerencias, Alerta, NgxDatatableModule, PaginadorNgx, LibroModal],
  templateUrl: './libros.html',
  styleUrl: './libros.css',
})
export class AdminLibros {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly alerta = inject(AlertaService);
  private readonly reportes = inject(ReportesService);
  readonly sugerencias = inject(SugerenciasService);

  libros = signal<Libro[]>([]);
  cargando = signal(false);
  error = signal('');
  filtro = signal('');
  sedeFiltro = signal('');

  readonly sedes = SEDES;

  // Paginación superior (ngx-datatable desactivada en el pie).
  offset = signal(0);
  limite = signal(10);

  readonly filasLibros = computed(() => {
    const termino = this.filtro().trim().toLowerCase();
    const filas = this.libros();
    if (!termino) return filas;
    return filas.filter((l) =>
      [l.Titulo, l.Autor, l.Programa ?? '', l.Signatura ?? '', l.sede ?? '']
        .join(' ')
        .toLowerCase()
        .includes(termino),
    );
  });

  /** Página actual calculada a partir del arreglo filtrado real (paginación local). */
  readonly filasPagina = computed(() => {
    const filas = this.filasLibros();
    const inicio = this.offset() * this.limite();
    return filas.slice(inicio, inicio + this.limite());
  });

  /** Total de páginas real = ceil(totalFiltrado / limite). */
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.filasLibros().length / this.limite())));

  // Modal de alta/edición.
  mostrarModal = signal(false);
  libroModal = signal<Libro | null>(null);
  guardandoModal = signal(false);

  constructor(private readonly route: ActivatedRoute) {
    this.cargar();
    this.sugerencias.cargar();
    this.route.queryParamMap.subscribe((params) => {
      const termino = params.get('buscar');
      if (termino) this.filtro.set(termino);
    });
    effect(() => {
      void this.filtro();
      this.offset.set(0);
    });
    // Si el offset queda fuera de rango (p. ej. al eliminar el último libro de
    // la última página), regresa a la última página válida.
    effect(() => {
      if (this.offset() >= this.totalPaginas()) {
        this.offset.set(Math.max(0, this.totalPaginas() - 1));
      }
    });
  }

  esSuper(): boolean {
    return this.auth.isSuper();
  }

  sedeAdmin(): string {
    return this.auth.usuario()?.sede ?? 'Soledad';
  }

  sedeLibroNuevo(): string {
    return this.esSuper() ? this.sedeFiltro() || 'Soledad' : this.sedeAdmin();
  }

  cambiarSede(): void {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    this.offset.set(0);
    try {
      const sede = this.esSuper() ? this.sedeFiltro() : '';
      this.libros.set(await firstValueFrom(this.api.listarLibros(sede)));
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al cargar libros. Verifique la conexión con FastAPI.');
    } finally {
      this.cargando.set(false);
    }
  }

  abrirNuevo(): void {
    this.libroModal.set(null);
    this.guardandoModal.set(false);
    this.mostrarModal.set(true);
  }

  abrirEditar(libro: Libro): void {
    this.libroModal.set(libro);
    this.guardandoModal.set(false);
    this.mostrarModal.set(true);
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
    this.libroModal.set(null);
    this.guardandoModal.set(false);
  }

  async onGuardarLibro(datos: LibroDatos): Promise<void> {
    this.guardandoModal.set(true);
    try {
      if (datos.id !== null) {
        await firstValueFrom(this.api.actualizarLibro(datos.id, datos));
        await this.alerta.exito('El libro fue actualizado correctamente.');
      } else {
        await firstValueFrom(this.api.crearLibro(datos));
        await this.alerta.exito('El libro fue registrado correctamente.');
      }
      this.cerrarModal();
      await this.cargar();
    } catch (err: any) {
      await this.alerta.error(err?.error?.detail || 'Error al guardar el libro. Verifique la conexión.');
    } finally {
      this.guardandoModal.set(false);
    }
  }

  async eliminar(libro: Libro): Promise<void> {
    const confirmado = await this.alerta.confirmar({
      titulo: '¿Eliminar este libro?',
      texto: `Se eliminará "${libro.Titulo}" del catálogo.`,
      textoBoton: 'Sí, eliminar',
    });
    if (!confirmado) return;
    try {
      await firstValueFrom(this.api.eliminarLibro(libro.ID));
      await this.alerta.exito('Libro eliminado correctamente.');
      await this.cargar();
    } catch (err: any) {
      await this.alerta.error(err?.error?.detail || 'Error al eliminar el libro.');
    }
  }

  exportarPDF(): void {
    this.reportes.exportarLibros(this.libros(), 'pdf');
  }

  exportarExcel(): void {
    this.reportes.exportarLibros(this.libros(), 'excel');
  }
}