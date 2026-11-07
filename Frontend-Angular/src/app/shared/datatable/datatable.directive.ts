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
 * ¿El DOM de la tabla es compatible con la autodetección de DataTables?
 * DataTables toma las columnas del primer <thead> y luego espera que TODAS
 * las filas del <tbody> tengan ese mismo número de celdas. Las filas de
 * estado vacío con <td colspan="N"> rompen ese contrato y provocan el error
 * "Requested unknown parameter 'N' ...".
 * Regla: compatible solo si hay al menos una fila, en TODOS los tbodies, y
 * todas comparten el número de columnas del encabezado sin rowspan/colspan.
 */
export function tablaCompatibleConDatatables(tabla: HTMLTableElement | null): boolean {
  if (!tabla || !tabla.tHead || !tabla.tBodies.length) return false;
  const columnas = tabla.tHead.rows[0]?.cells.length ?? 0;
  if (columnas === 0) return false;
  let total = 0;
  for (const cuerpo of Array.from(tabla.tBodies)) {
    for (let i = 0; i < cuerpo.rows.length; i++) {
      const fila = cuerpo.rows[i];
      if (fila.cells.length !== columnas) return false;
      for (let c = 0; c < fila.cells.length; c++) {
        if (fila.cells[c].colSpan !== 1 || fila.cells[c].rowSpan !== 1) return false;
      }
      total++;
    }
  }
  return total > 0;
}

/**
 * ¿El número de filas del DOM coincide con el de `dtData`?
 * Puede haber filas restauradas por DataTables (destroy) o filas pendientes de
 * render por change detection diferido (zoneless); inicializar en ese estado
 * corrige mal los datos. La verificación se hace justo antes de construir y
 * después de construir la instancia.
 */
export function tablaCoincideConDatos(tabla: HTMLTableElement | null, esperadas: number): boolean {
  if (!tabla) return false;
  let total = 0;
  for (const cuerpo of Array.from(tabla.tBodies)) {
    // Solo se cuentan filas reales de datos; la fila de estado vacío varias
    // celdas cuenta igualmente (el guard de compatibilidad la rechaza antes).
    total += cuerpo.rows.length;
  }
  return total === esperadas;
}

/**
 * Decisión única de inicialización: el DOM debe ser compatible con DataTables
 * Y el número de filas visible debe corresponder exactamente a `dtData`.
 * (Ver datatable.directive.ts Init(): se reevalúa en el mismo latido.)
 */
export function puedeInicializarDatatables(tabla: HTMLTableElement | null, filasEsperadas: number): boolean {
  return tablaCompatibleConDatatables(tabla) && tablaCoincideConDatos(tabla, filasEsperadas);
}

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
        // Destrucción SINCRÓNICA antes de que Angular re-renderice tbody:
        // DataTables restaura en sessionStorage las filas que capturó al
        // construirse; si se destruye dentro del rAF, Angular ya pudo haber
        // cambiado el tbody y el destroy reinyecta filas fantasma (orígenes del
        // warning). Aquí el DOM aún es el que dt conoce, por lo que la
        // restauración es exactamente lo que Angular va a reemplazar.
        this.liberar();
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
    const correr = () => {
      this.reinitPendiente = false;
      if (this.destruyendo || !this.el.isConnected) return;
      this.init();
    };
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(correr);
    } else {
      setTimeout(correr, 0);
    }
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
    // Doble verificación en el MISMO latido en que se construye DataTables:
    // 1) el DOM debe ser compatible (todas las filas completas, sin colspan) y
    // 2) el número de filas del DOM debe coincidir EXACTAMENTE con dtData:
    //    si Angular (zoneless) aún no ha re-renderizado tbody o ya dejó la
    //    fila de estado vacío, inicializar aquí consumiría filas inválidas
    //    ("Requested unknown parameter ..."). En ese caso se queda la tabla
    //    plana y se reintenta con el siguiente cambio de datos.
    if (!puedeInicializarDatatables(this.el, this.dtData.length)) {
      this.liberar();
      return;
    }
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
      // Verificación posterior: DataTables debió registrar exactamente las
      // filas de dtData. Cualquier desajuste (restauraciones u otras
      // mutaciones) invalida la instancia para no mostrar datos corruptos.
      if (this.dt && this.dt.rows().count() !== this.dtData.length) {
        this.liberar();
        return;
      }
      if (this.dt && this.dtBuscar) {
        this.dt.search(this.dtBuscar).draw();
      }
    } catch (err) {
      console.error('Error al inicializar DataTable:', err);
      this.liberar();
    }
  }
}
