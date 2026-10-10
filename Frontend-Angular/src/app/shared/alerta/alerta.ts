import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Alerta — Mensaje de retroalimentación reutilizable (error/éxito/info).
 * Uso: <app-alerta [mensaje]="error()" tipo="danger" (cerrar)="error.set('')"></app-alerta>
 */
@Component({
  selector: 'app-alerta',
  standalone: true,
  templateUrl: './alerta.html',
})
export class Alerta {
  @Input() mensaje = '';
  @Input() tipo: 'danger' | 'success' | 'info' | 'warning' = 'danger';
  @Input() descartable = true;
  @Output() cerrar = new EventEmitter<void>();
}