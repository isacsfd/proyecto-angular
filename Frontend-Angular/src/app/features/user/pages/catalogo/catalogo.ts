import { firstValueFrom } from 'rxjs';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';

import { ApiService } from '../../../../core/services/api.service';
import { SugerenciasService } from '../../../../core/services/sugerencias.service';
import { AlertaService } from '../../../../core/services/alerta.service';
import { BuscarSugerencias } from '../../../../shared/buscar-sugerencias/buscar-sugerencias';
import { PaginadorNgx } from '../../../../shared/paginador-ngx/paginador-ngx';
import { Libro, LibroResultado } from '../../../../core/models';

const CATEGORIAS: { clave: string; etiqueta: string }[] = [
  { clave: 'basica', etiqueta: 'Básicas y transversales' },
  { clave: 'economicas', etiqueta: 'Ciencias Económicas y Administrativas' },
  { clave: 'diseno', etiqueta: 'Diseño Gráfico' },
  { clave: 'industrial', etiqueta: 'Ingeniería Industrial' },
  { clave: 'electrica', etiqueta: 'Ingeniería Eléctrica' },
  { clave: 'seguridad', etiqueta: 'Seguridad y Salud en el Trabajo' },
  { clave: 'mecatronica', etiqueta: 'Ingeniería Mecatrónica' },
  { clave: 'telematica', etiqueta: 'Ingeniería Telemática' },
  { clave: 'licenciatura', etiqueta: 'Licenciatura en Educación Básica' },
];

@Component({
  selector: 'app-user-catalogo',
  imports: [FormsModule, BuscarSugerencias, NgxDatatableModule, PaginadorNgx],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class UserCatalogo {
  private readonly api = inject(ApiService);
  private readonly alerta = inject(AlertaService);
  readonly sugerencias = inject(SugerenciasService);

  libros = signal<Libro[]>([]);
  resultadosIA = signal<LibroResultado[]>([]);
  busqueda = '';
  categoriaSeleccionada = '';
  buscando = signal(false);
  cargando = signal(true);
  error = signal('');
  ultimoModo = signal<'todos' | 'categoria' | 'ia'>('todos');

  // Paginación local de la tabla (lista y categorías).
  filtroTabla = signal('');
  offset = signal(0);
  limite = signal(10);

  readonly filasFiltradas = computed(() => {
    const termino = this.filtroTabla().trim().toLowerCase();
    const filas = this.libros();
    if (!termino) return filas;
    return filas.filter((l) =>
      [l.Titulo, l.Autor, l.Programa ?? '', l.Editorial ?? '', l.sede ?? ''].join(' ').toLowerCase().includes(termino),
    );
  });

  readonly filasPagina = computed(() => {
    const filas = this.filasFiltradas();
    const inicio = this.offset() * this.limite();
    return filas.slice(inicio, inicio + this.limite());
  });

  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.filasFiltradas().length / this.limite())));

  readonly categorias = CATEGORIAS;

  constructor() {
    this.cargarTodos();
    this.sugerencias.cargar();
    effect(() => {
      void this.filtroTabla();
      this.offset.set(0);
    });
    effect(() => {
      if (this.offset() >= this.totalPaginas()) {
        this.offset.set(Math.max(0, this.totalPaginas() - 1));
      }
    });
  }

  async cargarTodos(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    this.offset.set(0);
    try {
      this.libros.set(await firstValueFrom(this.api.listarLibros()));
      this.resultadosIA.set([]);
      this.busqueda = '';
      this.categoriaSeleccionada = '';
      this.ultimoModo.set('todos');
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al cargar el catálogo. Verifique la conexión.');
    } finally {
      this.cargando.set(false);
    }
  }

  async buscarCategoria(clave: string): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    this.categoriaSeleccionada = clave;
    this.offset.set(0);
    try {
      this.libros.set(await firstValueFrom(this.api.listarLibrosPorCategoria(clave)));
      this.resultadosIA.set([]);
      this.busqueda = '';
      this.ultimoModo.set('categoria');
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'No hay libros en esta categoría.');
    } finally {
      this.cargando.set(false);
    }
  }

  async buscarIA(): Promise<void> {
    const q = this.busqueda.trim();
    if (!q) {
      await this.cargarTodos();
      return;
    }
    this.buscando.set(true);
    this.error.set('');
    try {
      this.resultadosIA.set(await firstValueFrom(this.api.busquedaSemantica(q, 12)));
      this.libros.set([]);
      this.categoriaSeleccionada = '';
      this.ultimoModo.set('ia');
    } catch (err: any) {
      await this.alerta.error(err?.error?.detail || 'Error en la búsqueda semántica.');
    } finally {
      this.buscando.set(false);
    }
  }
}