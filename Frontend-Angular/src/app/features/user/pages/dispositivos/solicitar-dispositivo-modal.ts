import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Dispositivo } from '../../../../core/models';
import { fechaLocalHoyA } from '../../../../core/utils/fecha';

export interface SolicitudDispositivoDatos {
  fecha_prestamo: string;
  fecha_devolucion: string;
  observaciones?: string;
}

@Component({
  selector: 'app-solicitar-dispositivo-modal',
  imports: [FormsModule],
  templateUrl: './solicitar-dispositivo-modal.html',
  styleUrl: './solicitar-dispositivo-modal.css',
})
export class SolicitarDispositivoModal implements OnChanges {
  @Input() dispositivo: Dispositivo | null = null;
  @Input() guardando = false;
  @Output() guardar = new EventEmitter<SolicitudDispositivoDatos>();
  @Output() cerrar = new EventEmitter<void>();

  mensaje = signal('');
  enviando = false;

  fechaInicio = '';
  fechaFin = '';
  observaciones = '';

  ngOnChanges(): void {
    if (!this.fechaInicio) {
      this.fechaInicio = fechaLocalHoyA(9);
      this.fechaFin = fechaLocalHoyA(10);
    }
  }

  private validar(): string {
    if (!this.fechaInicio || !this.fechaFin) return 'Debe indicar inicio y fin de la franja horaria.';
    const ini = new Date(this.fechaInicio);
    const fin = new Date(this.fechaFin);
    if (Number.isNaN(ini.getTime()) || Number.isNaN(fin.getTime())) return 'Las fechas de la franja no son válidas.';
    if (fin <= ini) return 'La fecha de fin debe ser posterior al inicio.';
    const horas = (fin.getTime() - ini.getTime()) / 3600000;
    if (horas > 2) return 'La franja horaria no puede superar las 2 horas.';
    const enHorario = (d: Date) => {
      const m = d.getHours() + d.getMinutes() / 60;
      return m >= 8 && m <= 20;
    };
    if (!enHorario(ini) || !enHorario(fin)) return 'El servicio opera de 8:00 a.m. a 8:00 p.m.';
    return '';
  }

  enviar(): void {
    this.mensaje.set('');
    const error = this.validar();
    if (error) {
      this.mensaje.set(error);
      return;
    }
    if (this.enviando || this.guardando) return;
    this.enviando = true;
    this.guardar.emit({
      fecha_prestamo: this.fechaInicio,
      fecha_devolucion: this.fechaFin,
      observaciones: this.observaciones || undefined,
    });
  }

  cerrarModal(): void {
    if (this.enviando || this.guardando) return;
    this.cerrar.emit();
  }
}