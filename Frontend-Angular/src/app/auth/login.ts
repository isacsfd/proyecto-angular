import { firstValueFrom } from 'rxjs';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  identificacion = '';
  password = '';
  cargando = signal(false);
  mensaje = signal('');
  tipoMensaje = signal<'danger' | 'success' | ''>('');

  async aceptar(): Promise<void> {
    if (!this.identificacion.trim() || !this.password) {
      this.mostrar('Ingrese su identificación y contraseña', 'danger');
      return;
    }
    this.cargando.set(true);
    this.mensaje.set('');
    try {
      await firstValueFrom(this.auth.login(this.identificacion.trim(), this.password));
      this.mostrar('Inicio de sesión exitoso. Redirigiendo...', 'success');
      setTimeout(() => {
        this.router.navigate([this.auth.isAdmin() ? '/admin' : '/inicio']);
      }, 800);
    } catch (err: any) {
      const detalle = err?.error?.detail || 'Error de conexión. Verifique que el servidor esté activo.';
      this.mostrar(detalle, 'danger');
    } finally {
      this.cargando.set(false);
    }
  }

  private mostrar(texto: string, tipo: 'danger' | 'success' | ''): void {
    this.mensaje.set(texto);
    this.tipoMensaje.set(tipo);
  }
}