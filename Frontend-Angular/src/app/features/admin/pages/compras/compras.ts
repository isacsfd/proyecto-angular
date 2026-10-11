import { firstValueFrom } from 'rxjs';
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ComprasService, Compra, DetalleCompra, Proveedor } from '../../../../core/services/compras.service';

@Component({
  selector: 'app-admin-compras',
  imports: [CommonModule, FormsModule],
  templateUrl: './compras.html',
  styleUrl: './compras.css',
})
export class AdminCompras {
  private readonly api = inject(ComprasService);

  compras = signal<Compra[]>([]);
  proveedores = signal<Proveedor[]>([]);
  detalles = signal<DetalleCompra[]>([]);
  seleccionada = signal<Compra | null>(null);
  cargando = signal(false);
  mensaje = signal('');
  tipoMensaje = signal<'danger' | 'success' | ''>('');

  formCompra = { proveedor_id: 0, numero_factura: '', fecha: '', total: 0 };
  formDetalle = { descripcion: '', cantidad: 1, precio_unitario: 0 };

  constructor() {
    void this.cargar();
  }

  private avisar(texto: string, tipo: 'danger' | 'success' | '' = 'danger'): void {
    this.mensaje.set(texto);
    this.tipoMensaje.set(tipo);
  }

  totalDetalles(detalles: DetalleCompra[]): number {
    return detalles.reduce((suma, d) => suma + d.cantidad * d.precio_unitario, 0);
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const [compras, proveedores] = await Promise.all([
        firstValueFrom(this.api.listarCompras()),
        firstValueFrom(this.api.listarProveedores()),
      ]);
      this.compras.set(compras);
      this.proveedores.set(proveedores);
      this.avisar('');
    } catch {
      this.avisar('No se pudieron cargar las compras. Verifique que el backend FastAPI esté activo.');
    } finally {
      this.cargando.set(false);
    }
  }

  async seleccionar(c: Compra): Promise<void> {
    this.seleccionada.set(c);
    this.formDetalle = { descripcion: '', cantidad: 1, precio_unitario: 0 };
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
      const err = e as { error?: { error?: string } };
      this.avisar(err?.error?.error || 'Error al crear la compra.');
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
      await firstValueFrom(
        this.api.crearDetalle(c.id, {
          descripcion: this.formDetalle.descripcion.trim(),
          cantidad: Number(this.formDetalle.cantidad),
          precio_unitario: Number(this.formDetalle.precio_unitario),
        }),
      );
      await this.recalcularTotal(c.id);
      await this.cargarDetalles(c.id);
    } catch (e: unknown) {
      const err = e as { error?: { error?: string } };
      this.avisar(err?.error?.error || 'Error al agregar el detalle.');
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