import { firstValueFrom } from 'rxjs';
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DatatableDirective } from '../../../../shared/datatable/datatable.directive';

import { ComprasService, Compra, DetalleCompra, Proveedor } from '../../../../core/services/compras.service';

@Component({
  selector: 'app-admin-compras',
  imports: [CommonModule, FormsModule, DatatableDirective],
  templateUrl: './compras.html',
  styleUrl: './compras.css',
})
export class AdminCompras {
  private readonly api = inject(ComprasService);

  compras = signal<Compra[]>([]);
  proveedores = signal<Proveedor[]>([]);
  detalles = signal<DetalleCompra[]>([]);
  seleccionada = signal<Compra | null>(null);
  cargandoCompras = signal(false);
  cargandoProveedores = signal(false);
  /** Estado agregado para el botón (compatibilidad con la plantilla). */
  cargando = computed(() => this.cargandoCompras() || this.cargandoProveedores());
  mensaje = signal('');
  tipoMensaje = signal<'danger' | 'success' | ''>('');
  mensajeProveedores = signal('');
  tipoProveedores = signal<'danger' | 'success' | ''>('');

  formCompra = { proveedor_id: 0, numero_factura: '', fecha: '', total: 0 };
  formDetalle = { descripcion: '', cantidad: 1, precio_unitario: 0 };
  editandoDetalleId: number | null = null;

  constructor() {
    void this.cargar();
  }

  private avisar(texto: string, tipo: 'danger' | 'success' | '' = 'danger'): void {
    this.mensaje.set(texto);
    this.tipoMensaje.set(tipo);
  }

  private avisarProveedores(texto: string, tipo: 'danger' | 'success' | '' = 'danger'): void {
    this.mensajeProveedores.set(texto);
    this.tipoProveedores.set(tipo);
  }

  private _detalleError(e: unknown, textoFijo: string): string {
    const err = e as { error?: { detail?: string; error?: string } };
    return err?.error?.detail || err?.error?.error || textoFijo;
  }

  totalDetalles(detalles: DetalleCompra[]): number {
    return detalles.reduce((suma, d) => suma + d.cantidad * d.precio_unitario, 0);
  }

  /** Cargas independientes: una falla no bloquea la otra. */
  cargar(): void {
    void this.cargarCompras();
    void this.cargarProveedores();
  }

  async cargarCompras(): Promise<void> {
    this.cargandoCompras.set(true);
    try {
      this.compras.set(await firstValueFrom(this.api.listarCompras()));
      this.avisar('');
    } catch (e: unknown) {
      this.avisar(this._detalleError(e, 'No se pudieron cargar las compras. Verifique que la API de compras esté activa.'));
    } finally {
      this.cargandoCompras.set(false);
    }
  }

  async cargarProveedores(): Promise<void> {
    this.cargandoProveedores.set(true);
    try {
      this.proveedores.set(await firstValueFrom(this.api.listarProveedores()));
      this.avisarProveedores('');
    } catch (e: unknown) {
      this.avisarProveedores(this._detalleError(e, 'No se pudieron cargar los proveedores. Verifique que la API de compras esté activa.'));
    } finally {
      this.cargandoProveedores.set(false);
    }
  }

  async seleccionar(c: Compra): Promise<void> {
    this.seleccionada.set(c);
    this.formDetalle = { descripcion: '', cantidad: 1, precio_unitario: 0 };
    this.editandoDetalleId = null;
    await this.cargarDetalles(c.id);
  }

  async cargarDetalles(compraId: number): Promise<void> {
    try {
      const detalles = await firstValueFrom(this.api.listarDetalles(compraId));
      this.detalles.set(detalles);
    } catch {
      this.detalles.set([]);
      this.avisar('No se pudieron cargar los detalles.');
    }
  }

  nuevo(): void {
    this.formCompra = { proveedor_id: 0, numero_factura: '', fecha: '', total: 0 };
  }

  editarDetalle(detalle: DetalleCompra): void {
    this.editandoDetalleId = detalle.id;
    this.formDetalle = {
      descripcion: detalle.descripcion,
      cantidad: detalle.cantidad,
      precio_unitario: detalle.precio_unitario,
    };
  }

  cancelarEdicionDetalle(): void {
    this.editandoDetalleId = null;
    this.formDetalle = { descripcion: '', cantidad: 1, precio_unitario: 0 };
  }

  async crear(): Promise<void> {
    if (!this.formCompra.proveedor_id || !this.formCompra.numero_factura.trim()) {
      this.avisar('Seleccione un proveedor e indique el número de factura.');
      return;
    }
    try {
      const creada = await firstValueFrom(
        this.api.crearCompra({
          proveedor_id: this.formCompra.proveedor_id,
          numero_factura: this.formCompra.numero_factura.trim(),
          fecha: this.formCompra.fecha || undefined,
          total: 0,
        }),
      );
      this.avisar('Compra creada. Ahora puede agregar detalles.', 'success');
      this.nuevo();
      await this.cargar();
      await this.seleccionar(creada);
    } catch (e: unknown) {
      const err = e as { error?: { detail?: string; error?: string } };
      this.avisar(err?.error?.detail || err?.error?.error || 'Error al crear la compra.');
    }
  }

  async agregarDetalle(): Promise<void> {
    const c = this.seleccionada();
    if (!c) return;
    if (!this.formDetalle.descripcion.trim()) {
      this.avisar('La descripción del detalle es obligatoria.');
      return;
    }
    try {
      const datos = {
        descripcion: this.formDetalle.descripcion.trim(),
        cantidad: Number(this.formDetalle.cantidad),
        precio_unitario: Number(this.formDetalle.precio_unitario),
      };
      if (this.editandoDetalleId === null) {
        await firstValueFrom(this.api.crearDetalle(c.id, datos));
        this.avisar('Detalle agregado.', 'success');
      } else {
        await firstValueFrom(this.api.actualizarDetalle(this.editandoDetalleId, datos));
        this.avisar('Detalle actualizado.', 'success');
      }
      this.cancelarEdicionDetalle();
      await this.recalcularTotal(c.id);
      await this.cargarDetalles(c.id);
    } catch (e: unknown) {
      const err = e as { error?: { detail?: string; error?: string } };
      this.avisar(err?.error?.detail || err?.error?.error || 'Error al guardar el detalle.');
    }
  }

  async eliminarDetalle(d: DetalleCompra): Promise<void> {
    const c = this.seleccionada();
    if (!c || !confirm('¿Eliminar este detalle?')) return;
    try {
      await firstValueFrom(this.api.eliminarDetalle(d.id));
      await this.recalcularTotal(c.id);
      await this.cargarDetalles(c.id);
    } catch {
      this.avisar('No se pudo eliminar el detalle.');
    }
  }

  private async recalcularTotal(compraId: number): Promise<void> {
    const detalles = await firstValueFrom(this.api.listarDetalles(compraId));
    const total = this.totalDetalles(detalles);
    await firstValueFrom(this.api.actualizarCompra(compraId, { total }));
    this.seleccionada.update((c) => (c ? { ...c, total } : c));
  }

  async eliminarCompra(c: Compra): Promise<void> {
    if (!confirm(`¿Eliminar la compra ${c.numero_factura}?`)) return;
    try {
      await firstValueFrom(this.api.eliminarCompra(c.id));
      this.seleccionada.set(null);
      this.detalles.set([]);
      await this.cargar();
    } catch {
      this.avisar('No se pudo eliminar la compra.');
    }
  }
}
