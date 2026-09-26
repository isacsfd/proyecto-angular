import {
  Directive,
  ElementRef,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  SimpleChanges,
} from '@angular/core';

declare const $: any;

/**
 * DatatableDirective — Convierte una <table> ya renderizada por Angular en una
 * DataTable (DataTables.js + Bootstrap 5). La fila se mantiene como la escribe
 * Angular (@for); DataTables aporta ordenamiento, paginación e info en español.
 *
 * Uso:
 *   <table class="table" appDatatable [dtData]="filas()" [dtBuscar]="filtro()" [dtOrden]="0">
 */
@Directive({
  selector: 'table[appDatatable]',
  standalone: true,
})
export class DatatableDirective implements AfterViewInit, OnChanges, OnDestroy {
  /** Arreglo fuente. Cuando cambia la referencia, la tabla se re-inicializa. */
  @Input() dtData: unknown[] = [];
  /** Término de búsqueda externo (se aplica con dt.search). */
  @Input() dtBuscar = '';
  /** Columna por la que ordenar descendente por defecto (null = sin orden). */
  @Input() dtOrden: number | null = null;

  private readonly el: HTMLTableElement;
  private dt: any = null;
  private reinitPendiente = false;
  private destruyendo = false;
  private firmaAnterior = '';

  private static readonly IDIOMA = {
    processing: 'Procesando...',
    search: 'Buscar:',
    lengthMenu: 'Mostrar _MENU_ registros',
    info: 'Mostrando _START_ a _END_ de _TOTAL_ registros',
    infoEmpty: 'Mostrando 0 a 0 de 0 registros',
    infoFiltered: '(filtrados de _MAX_ registros totales)',
    loadingRecords: 'Cargando...',
    zeroRecords: 'No se encontraron registros coincidentes',
    emptyTable: 'No hay datos disponibles en la tabla',
    paginate: {
      first: 'Primero',
      previous: 'Anterior',
      next: 'Siguiente',
      last: 'Último',
    },
    aria: {
      sortAscending: ': activar para ordenar la columna de forma ascendente',
      sortDescending: ': activar para ordenar la columna de forma descendente',
    },
  };

  constructor() {
    this.el = inject(ElementRef).nativeElement as HTMLTableElement;
  }

  ngAfterViewInit(): void {
    this.init();
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['dtData'] && !cambios['dtData'].firstChange) {
      const nueva = cambios['dtData'].currentValue as unknown[];
      const firma = this.firma(nueva);
      if (firma !== this.firmaAnterior) {
        this.firmaAnterior = firma;
        this.programarReinicio();
      }
    }
    if (cambios['dtBuscar'] && this.dt) {
      this.dt.search(this.dtBuscar ?? '').draw();
    }
  }

  /** Firma rápida del arreglo para evitar reinicializaciones sin cambios reales. */
  private firma(datos: unknown[]): string {
    try {
      const muestras = datos.slice(0, 20).map((x) => {
        const id = (x as any)?.id ?? (x as any)?.ID;
        return id === undefined ? JSON.stringify(x) : String(id);
      });
      return `${datos.length}|${muestras.join(',')}`;
    } catch {
      return `${datos.length}`;
    }
  }

  ngOnDestroy(): void {
    this.destruyendo = true;
    this.liberar();
  }

  private programarReinicio(): void {
    if (this.reinitPendiente) return;
    this.reinitPendiente = true;
    requestAnimationFrame(() => {
      this.reinitPendiente = false;
      if (this.destruyendo || !this.el.isConnected) return;
      this.liberar();
      this.init();
    });
  }

  private liberar(): void {
    if (this.dt) {
      try {
        this.dt.destroy();
      } catch {
        /* sin importar */
      }
      this.dt = null;
    }
  }

  private init(): void {
    if (this.dt) return;
    try {
      this.dt = $(this.el).DataTable({
        language: DatatableDirective.IDIOMA,
        pageLength: 10,
        lengthMenu: [
          [5, 10, 25, 50, -1],
          [5, 10, 25, 50, 'Todos'],
        ],
        order: this.dtOrden != null ? [[this.dtOrden, 'desc']] : [],
        dom:
          '<"row mb-2"<"col-sm-12 col-md-6"l>>' +
          '<"row"<"col-sm-12"tr>>' +
          '<"row mt-2"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
      });
      if (this.dtBuscar) {
        this.dt.search(this.dtBuscar).draw();
      }
    } catch (err) {
      console.error('Error al inicializar DataTable:', err);
    }
  }
}