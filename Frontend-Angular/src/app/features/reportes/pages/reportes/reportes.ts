import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CorreoService } from '../../../../core/services/correo.service';
import {
  DatosReportes,
  DefinicionReporte,
  FormatoArchivo,
  ReportesService,
} from '../../../../core/services/reportes.service';
import { DatatableDirective } from '../../../../shared/datatable/datatable.directive';
import {
  Acceso,
  Dispositivo,
  Libro,
  NotificacionEmail,
  Prestamo,
  TipoReporte,
  Usuario,
} from '../../../../core/models';

interface OpcionReporte {
  valor: TipoReporte;
  texto: string;
  requiereModulo?: string;
  nota?: string;
}

const SEDES = ['Soledad', 'Barranquilla', 'Colsamiro'];

/**
 * PaginaReportes — Reportes consolidados filtrables (parcial 2).
 * Descarga local PDF/XLSX (jsPDF + SheetJS, encabezado institucional) y
 * opción de envío al correo registrado; los administradores ven el
 * seguimiento del estado de cada envío/notificación.
 */
@Component({
  selector: 'app-pagina-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, DatatableDirective],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class PaginaReportes {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly reportes = inject(ReportesService);
  private readonly correoSrv = inject(CorreoService);

  readonly OPCIONES: OpcionReporte[] = [
    { valor: 'libros', texto: 'Catálogo de libros' },
    { valor: 'dispositivos', texto: 'Inventario de dispositivos' },
    { valor: 'prestamos', texto: 'Préstamos de libros', nota: 'Cada usuario ve su alcance' },
    { valor: 'usuarios', texto: 'Usuarios registrados', requiereModulo: 'gestion_usuarios' },
    { valor: 'ingresos', texto: 'Ingresos a biblioteca', requiereModulo: 'ingresos' },
  ];

  readonly sedes = SEDES;

  // ─── Filtros de consulta ────────────────────────────────────────────────
  readonly tipo = signal<TipoReporte>('libros');
  readonly sede = signal('');
  readonly estado = signal('');
  readonly fechaInicio = signal('');
  readonly fechaFin = signal('');
  readonly busqueda = signal('');
  readonly formatoEnvio = signal<FormatoArchivo>('pdf');

  // ─── Estado de la página ────────────────────────────────────────────────
  readonly cargando = signal(false);
  readonly enviando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');
  readonly tipoMensaje = signal('info');
  readonly definicion = signal<DefinicionReporte | null>(null);

  // Datos crudos por reporte (se filtran en el cliente).
  private readonly libros = signal<Libro[]>([]);
  private readonly dispositivos = signal<Dispositivo[]>([]);
  private readonly prestamos = signal<Prestamo[]>([]);
  private readonly usuarios = signal<Usuario[]>([]);
  private readonly ingresos = signal<Acceso[]>([]);

  // ─── Correo y seguimiento ───────────────────────────────────────────────
  readonly smtpConfigurado = signal<boolean | null>(null);
  readonly notificaciones = signal<NotificacionEmail[]>([]);
  readonly filtroTipoNotificacion = signal('');
  readonly filtroEstadoNotificacion = signal('');
  readonly esAdmin = computed(() => this.auth.isAdmin());
  readonly correoRegistrado = computed(() => this.auth.usuario()?.email ?? '');

  readonly opcionesDisponibles = computed(() =>
    this.OPCIONES.filter((o) => !o.requiereModulo || this.auth.tienePermiso(o.requiereModulo)),
  );

  constructor() {
    this.cargar();
    this.consultarSMTP();
    if (this.esAdmin()) this.cargarNotificaciones();
  }

  /** Carga los datos del reporte seleccionado y recalcula la vista. */
  async cargar(): Promise<void> {
    if (!this.opcionesDisponibles().some((o) => o.valor === this.tipo())) {
      this.tipo.set(this.opcionesDisponibles()[0]?.valor ?? 'libros');
    }
    this.cargando.set(true);
    this.error.set('');
    this.mensaje.set('');
    try {
      switch (this.tipo()) {
        case 'usuarios':
          this.usuarios.set(await firstValueFrom(this.api.listarUsuarios()));
          break;
        case 'prestamos':
          this.prestamos.set(await firstValueFrom(this.api.listarPrestamos()));
          break;
        case 'dispositivos':
          this.dispositivos.set(await firstValueFrom(this.api.listarDispositivos()));
          break;
        case 'ingresos':
          this.ingresos.set(await firstValueFrom(this.api.listarAccesos()));
          break;
        case 'libros':
        default:
          this.libros.set(await firstValueFrom(this.api.listarLibros()));
          break;
      }
      this.recalcular();
    } catch (err) {
      this.error.set(this.detalleDe(err, 'No se pudieron cargar los datos del reporte.'));
    } finally {
      this.cargando.set(false);
    }
  }

  /** Recalcula la definición aplicando los filtros (sin volver a pedir datos). */
  recalcular(): void {
    const data: DatosReportes = {
      libros: this.filtrarLibros(),
      dispositivos: this.filtrarDispositivos(),
      prestamos: this.filtrarPrestamos(),
      usuarios: this.filtrarUsuarios(),
      ingresos: this.filtrarIngresos(),
    };
    this.definicion.set(this.reportes.definicion(this.tipo(), data));
  }

  /** ¿El dataset actual tiene dimensión de sede? */
  aplicaSede(): boolean {
    return ['libros', 'dispositivos', 'usuarios'].includes(this.tipo());
  }

  /** ¿El dataset actual tiene dimensión de estado? */
  aplicaEstado(): boolean {
    return ['prestamos', 'dispositivos', 'ingresos'].includes(this.tipo());
  }

  /** ¿El dataset actual se filtra por rango de fechas? */
  aplicaFechas(): boolean {
    return ['prestamos', 'ingresos'].includes(this.tipo());
  }

  estadosDisponibles(): string[] {
    switch (this.tipo()) {
      case 'prestamos':
        return ['Activo', 'Vencido', 'Devuelto'];
      case 'dispositivos':
        return ['Disponible', 'Prestado', 'Dañado', 'En Mantenimiento'];
      case 'ingresos':
        return ['Permitido', 'Denegado'];
      default:
        return [];
    }
  }

  // ─── Acciones ───────────────────────────────────────────────────────────

  descargar(formato: 'pdf' | 'excel'): void {
    const def = this.definicion();
    if (!def) return;
    this.reportes.descargar(def, formato);
  }

  async enviarPorCorreo(): Promise<void> {
    const def = this.definicion();
    const correo = this.correoRegistrado();
    if (!def || !correo) {
      this.mensaje.set('Su usuario no tiene un correo electrónico registrado para recibir el reporte.');
      this.tipoMensaje.set('warning');
      return;
    }
    const blob = this.reportes.blob(def, this.formatoEnvio());
    if (!blob) {
      this.mensaje.set('No hay datos que enviar con los filtros actuales.');
      this.tipoMensaje.set('warning');
      return;
    }
    this.enviando.set(true);
    this.mensaje.set('');
    try {
      const respuesta = await firstValueFrom(
        this.correoSrv.enviarReporte(blob, this.formatoEnvio(), def.titulo),
      );
      this.mensaje.set(`${respuesta.mensaje} (registro #${respuesta.id} · ${respuesta.destinatario})`);
      this.tipoMensaje.set(respuesta.estado === 'enviado' ? 'success' : 'warning');
      if (this.esAdmin()) await this.cargarNotificaciones();
    } catch (err) {
      this.mensaje.set(this.detalleDe(err, 'No se pudo enviar el reporte al correo.'));
      this.tipoMensaje.set('danger');
    } finally {
      this.enviando.set(false);
    }
  }

  async consultarSMTP(): Promise<void> {
    try {
      const estado = await firstValueFrom(this.correoSrv.estadoSMTP());
      this.smtpConfigurado.set(estado.configurado);
    } catch {
      this.smtpConfigurado.set(null);
    }
  }

  async cargarNotificaciones(): Promise<void> {
    try {
      this.notificaciones.set(
        await firstValueFrom(
          this.correoSrv.listar({
            tipo: this.filtroTipoNotificacion() || undefined,
            estado: this.filtroEstadoNotificacion() || undefined,
          }),
        ),
      );
    } catch (err) {
      // El seguimiento es informativo: no bloquea la generación de reportes.
      this.notificaciones.set([]);
    }
  }

  claseEstadoNotificacion(estado: string): string {
    switch (estado) {
      case 'enviado':
        return 'text-bg-success';
      case 'fallido':
        return 'text-bg-danger';
      case 'no_configurado':
        return 'text-bg-warning';
      default:
        return 'text-bg-secondary';
    }
  }

  /** Cambia el tipo de reporte y recarga sus datos. */
  async cambiarTipo(t: TipoReporte): Promise<void> {
    this.tipo.set(t);
    this.estado.set('');
    await this.cargar();
  }

  /** Valores de una fila en el orden de las columnas (para la vista previa). */
  valoresDe(fila: Record<string, unknown>): unknown[] {
    return Object.values(fila);
  }

  // ─── Filtros por dataset (client-side, sin `any`) ────────────────────────

  private filtrarLibros(): Libro[] {
    const sede = this.sede();
    const q = this.busqueda().trim().toLowerCase();
    return this.libros().filter((l) => {
      if (sede && l.sede !== sede) return false;
      if (q && !this.contiene(l, q)) return false;
      return true;
    });
  }

  private filtrarDispositivos(): Dispositivo[] {
    const sede = this.sede();
    const estado = this.estado();
    const q = this.busqueda().trim().toLowerCase();
    return this.dispositivos().filter((d) => {
      if (sede && d.sede !== sede) return false;
      if (estado && d.estado !== estado) return false;
      if (q && !this.contiene(d, q)) return false;
      return true;
    });
  }

  private filtrarPrestamos(): Prestamo[] {
    const estado = this.estado();
    const q = this.busqueda().trim().toLowerCase();
    return this.prestamos().filter((p) => {
      if (estado && p.state !== estado) return false;
      if (!this.dentroDeRango(p.loan_date)) return false;
      if (q && !this.contiene(p, q)) return false;
      return true;
    });
  }

  private filtrarUsuarios(): Usuario[] {
    const sede = this.sede();
    const q = this.busqueda().trim().toLowerCase();
    return this.usuarios().filter((u) => {
      if (sede && u.sede !== sede) return false;
      if (q && !this.contiene(u, q)) return false;
      return true;
    });
  }

  private filtrarIngresos(): Acceso[] {
    const estado = this.estado();
    const q = this.busqueda().trim().toLowerCase();
    return this.ingresos().filter((a) => {
      if (estado && (estado === 'Permitido') !== a.status) return false;
      if (!this.dentroDeRango(a.created_at)) return false;
      if (q && !this.contiene(a, q)) return false;
      return true;
    });
  }

  /** Coincidencia de texto en los campos visibles del registro. */
  private contiene(item: unknown, q: string): boolean {
    try {
      return JSON.stringify(item).toLowerCase().includes(q);
    } catch {
      return false;
    }
  }

  private dentroDeRango(fechaIso: string | null | undefined): boolean {
    const inicio = this.fechaInicio();
    const fin = this.fechaFin();
    if (!inicio && !fin) return true;
    if (!fechaIso) return false;
    const t = new Date(fechaIso).getTime();
    if (Number.isNaN(t)) return false;
    const min = inicio ? new Date(`${inicio}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
    const max = fin ? new Date(`${fin}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;
    return t >= min && t <= max;
  }

  private detalleDe(err: unknown, porDefecto: string): string {
    const e = err as { error?: { detail?: string } };
    return e?.error?.detail || porDefecto;
  }
}
