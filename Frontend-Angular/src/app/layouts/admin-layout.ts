import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { SugerenciasService } from '../core/services/sugerencias.service';
import { NotificacionesService } from '../core/services/notificaciones.service';
import { sedeInfo } from '../core/models/sedes';
import { BuscarSugerencias } from '../shared/buscar-sugerencias/buscar-sugerencias';
import { Chatbot } from '../shared/chatbot/chatbot';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Chatbot, BuscarSugerencias],
  templateUrl: './admin-layout.html',
  styleUrl: './layout.css',
})
export class AdminLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly sugerencias = inject(SugerenciasService);
  readonly notificaciones = inject(NotificacionesService);

  constructor() {
    this.sugerencias.cargar();
    this.notificaciones.iniciar();
  }

  ngOnDestroy(): void {
    this.notificaciones.detener();
  }

  nombre(): string {
    return this.auth.usuario()?.nombre ?? '';
  }

  rol(): string {
    return this.auth.rolLegible();
  }

  /** ¿El rol actual puede ver el módulo? (oculta opciones no permitidas) */
  puede(modulo: string): boolean {
    return this.auth.tienePermiso(modulo);
  }

  esDemo(): boolean {
    return this.auth.isDemo();
  }

  sedeActual() {
    return sedeInfo(this.auth.usuario()?.sede);
  }

  salir(): void {
    this.auth.logout();
  }

  cerrarMovil(): void {
    document.querySelectorAll('.dropdown-menu.show').forEach((m) => m.classList.remove('show'));
  }

  ir(ruta: string): void {
    this.router.navigate([ruta]);
  }

  buscarGlobal(sel: { tipo: 'libro' | 'usuario'; valor: string }): void {
    if (sel.tipo === 'libro') {
      this.router.navigate(['/admin/libros'], { queryParams: { buscar: sel.valor } });
    } else {
      this.router.navigate(['/admin/usuarios'], { queryParams: { buscar: sel.valor } });
    }
  }
}