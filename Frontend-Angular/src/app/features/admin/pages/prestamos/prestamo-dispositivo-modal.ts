import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Dispositivo, PrestamoDispositivo, Usuario } from '../../../../core/models';

export interface PrestamoDispositivoAccion {
  accion: 'crear' | 'aprobar' | 'rechazar' | 'completar' | 'danar';
  prestamo: PrestamoDispositivo | null;
  dispositivo_id?: number;
  user_id?: number;
  fecha_prestamo?: string;
  fecha_devolucion?: string;
  observaciones?: string;
}

@Component({
  selector: 'app-prestamo-dispositivo-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './prestamo-dispositivo-modal.html',
  styleUrl: './prestamo-dispositivo-modal.css',
})
export class PrestamoDispositivoModal {
  @Input() prestamo: PrestamoDispositivo | null = null;
  @Input() dispositivos: Dispositivo[] = [];
  @Input() usuarios: Usuario[] = [];
  @Input() guardando = false;
  @Output() guardar = new EventEmitter<PrestamoDispositivoAccion>();
  @Output() cerrar = new EventEmitter<void>();

  mensaje = signal('');
  enviando = false;

  form = {
    dispositivo_id: null as number | null,
    user_id: null as number | null,
    fecha_prestamo: '',
    fecha_devolucion: '',
    observaciones: '',
  };

  ngOnChanges(): void {
    if (!this.form.fecha_prestamo) {
      this.form.fecha_prestamo = this._ahora();
      this.form.fecha_devolucion = this._formatoLocal(new Date(new Date().getTime() + 60 * 60000));
    }
  }

  esNuevo(): boolean {
    return this.prestamo === null;
  }

  _inicializarFechas(): void {
    if (!this.form.fecha_prestamo) return;
    const ini = new Date(this.form.fecha_prestamo);
    if (Number.isNaN(ini.getTime())) return;
    const finP = new Date(ini.getTime() + 60 * 60000);
    this.form.fecha_devolucion = this._formatoLocal(finP);
  }

  private _formatoLocal(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private _ahora(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private emitir(accion: PrestamoDispositivoAccion): void {
    if (this.enviando || this.guardando) return;
    this.enviando = true;
    this.guardar.emit(accion);
  }

  guardarNuevo(): void {
    this.mensaje.set('');
    if (!this.form.dispositivo_id || !this.form.user_id) {
      this.mensaje.set('Seleccione dispositivo y usuario.');
      return;
    }
    if (!this.form.fecha_devolucion) {
      this.mensaje.set('Indique el fin de la franja horaria.');
      return;
    }
    const ini = new Date(this.form.fecha_prestamo);
    const fin = new Date(this.form.fecha_devolucion);
    const horas = (fin.getTime() - ini.getTime()) / 3600000;
    if (horas > 2) {
      this.mensaje.set('La franja horaria no puede superar las 2 horas.');
      return;
    }
    this.emitir({
      accion: 'crear',
      prestamo: null,
      dispositivo_id: Number(this.form.dispositivo_id),
      user_id: Number(this.form.user_id),
      fecha_prestamo: this.form.fecha_prestamo,
      fecha_devolucion: this.form.fecha_devolucion,
      observaciones: this.form.observaciones || undefined,
    });
  }

  puedeGestionarPendiente(): boolean {
    return !!this.prestamo && this.prestamo.estado === 'Pendiente';
  }

  puedeGestionarActivo(): boolean {
    return !!this.prestamo && this.prestamo.estado === 'Activo';
  }

  aprobar(p: PrestamoDispositivo): void {
    this.emitir({ accion: 'aprobar', prestamo: p });
  }

  rechazar(p: PrestamoDispositivo): void {
    this.emitir({ accion: 'rechazar', prestamo: p });
  }

  completar(p: PrestamoDispositivo): void {
    this.emitir({ accion: 'completar', prestamo: p });
  }

  danar(p: PrestamoDispositivo): void {
    this.emitir({ accion: 'danar', prestamo: p });
  }

  cerrarModal(): void {
    if (this.enviando || this.guardando) return;
    this.cerrar.emit();
  }
}