import { Component, Input } from '@angular/core';

type TipoBadge = 'rol' | 'dispositivo' | 'prestamo' | 'acceso' | 'solicitud' | 'sede';

/**
 * EstadoBadge — Insignia de estado reutilizable.
 * Unifica el color/etiqueta de los badges de rol, dispositivo, préstamo, etc.
 *
 * Uso: <app-estado-badge [valor]="u.rol" tipo="rol"></app-estado-badge>
 */
@Component({
  selector: 'app-estado-badge',
  standalone: true,
  templateUrl: './estado-badge.html',
})
export class EstadoBadge {
  @Input() valor: string | null | undefined = '';
  @Input() tipo: TipoBadge = 'rol';

  clase(): string {
    const v = this.valor ?? '';
    switch (this.tipo) {
      case 'rol':
        switch (v) {
          case 'super_administrador': return 'text-bg-dark';
          case 'Administrador': return 'text-bg-danger';
          case 'Funcionario': return 'text-bg-warning';
          case 'Docente': return 'text-bg-info';
          default: return 'text-bg-success';
        }
      case 'dispositivo':
        switch (v) {
          case 'Disponible': return 'text-bg-success';
          case 'Prestado': return 'text-bg-primary';
          case 'Dañado': return 'text-bg-danger';
          default: return 'text-bg-secondary';
        }
      case 'prestamo':
        switch (v) {
          case 'Activo': return 'text-bg-primary';
          case 'Vencido': return 'text-bg-danger';
          case 'Devuelto': return 'text-bg-success';
          case 'Pendiente': return 'text-bg-warning';
          case 'Rechazado': return 'text-bg-secondary';
          default: return 'text-bg-success';
        }
      case 'solicitud':
        switch (v) {
          case 'Aprobado': return 'text-bg-success';
          case 'Rechazado': return 'text-bg-danger';
          default: return 'text-bg-warning';
        }
      case 'acceso':
        return v === 'Exitoso' || v === 'true' ? 'text-bg-success' : 'text-bg-danger';
      case 'sede':
        return 'text-bg-primary';
      default:
        return 'text-bg-secondary';
    }
  }

  texto(): string {
    if (this.tipo === 'rol' && this.valor === 'super_administrador') return 'Super Administrador';
    return this.valor ?? '—';
  }
}