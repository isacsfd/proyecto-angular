import { firstValueFrom } from 'rxjs';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ComprasService, Proveedor } from '../../../../core/services/compras.service';

@Component({
  selector: 'app-admin-proveedores',
  imports: [FormsModule],
  templateUrl: './proveedores.html',
  styleUrl: './proveedores.css',
})
export class AdminProveedores {
  private readonly api = inject(ComprasService);

  proveedores = signal<Proveedor[]>([]);
  cargando = signal(false);
  mensaje = signal('');
  tipoMensaje = signal<'danger' | 'success' | ''>('');
  mostrarForm = signal(false);
  editandoId: number | null = null;
  form = { razon_social: '', nit: '', email: '', telefono: '', direccion: '' };

  constructor() {
    void this.cargar();
  }

  private avisar(texto: string, tipo: 'danger' | 'success' | '' = 'danger'): void {
    this.mensaje.set(texto);
    this.tipoMensaje.set(tipo);
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      this.proveedores.set(await firstValueFrom(this.api.listarProveedores()));
      this.avisar('');
    } catch {
      this.avisar('No se pudieron cargar los proveedores. Verifique que el backend FastAPI esté activo.');
    } finally {
      this.cargando.set(false);
    }
  }

  nuevo(): void {
    this.form = { razon_social: '', nit: '', email: '', telefono: '', direccion: '' };
    this.editandoId = null;
    this.mostrarForm.set(true);
  }

  editar(p: Proveedor): void {
    this.form = {
      razon_social: p.razon_social,
      nit: p.nit,
      email: p.email ?? '',
      telefono: p.telefono ?? '',
      direccion: p.direccion ?? '',
    };
    this.editandoId = p.id;
    this.mostrarForm.set(true);
  }

  cancelar(): void {
    this.mostrarForm.set(false);
    this.editandoId = null;
  }

  async guardar(): Promise<void> {
    if (!this.form.razon_social.trim() || !this.form.nit.trim()) {
      this.avisar('Razón social y NIT son obligatorios.');
      return;
    }
    const datos = {
      razon_social: this.form.razon_social.trim(),
      nit: this.form.nit.trim(),
      email: this.form.email || null,
      telefono: this.form.telefono || null,
      direccion: this.form.direccion || null,
    };
    try {
      if (this.editandoId === null) {
        await firstValueFrom(this.api.crearProveedor(datos));
        this.avisar('Proveedor creado.', 'success');
      } else {
        await firstValueFrom(this.api.actualizarProveedor(this.editandoId, datos));
        this.avisar('Proveedor actualizado.', 'success');
      }
      this.mostrarForm.set(false);
      this.editandoId = null;
      await this.cargar();
    } catch (e: unknown) {
      const err = e as { error?: { error?: string } };
      this.avisar(err?.error?.error || 'Error al guardar el proveedor.');
    }
  }

  async eliminar(p: Proveedor): Promise<void> {
    if (!confirm(`¿Eliminar el proveedor "${p.razon_social}"?`)) return;
    try {
      await firstValueFrom(this.api.eliminarProveedor(p.id));
      this.avisar('Proveedor eliminado.', 'success');
      await this.cargar();
    } catch {
      this.avisar('No se pudo eliminar el proveedor.');
    }
  }
}