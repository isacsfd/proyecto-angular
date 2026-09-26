import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { sedeInfo } from '../core/sedes';
import { Chatbot } from '../shared/chatbot/chatbot';

@Component({
  selector: 'app-user-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Chatbot],
  templateUrl: './user-layout.html',
  styleUrl: './layout.css',
})
export class UserLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  nombre(): string {
    return this.auth.usuario()?.nombre ?? '';
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
}