import { firstValueFrom } from 'rxjs';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ROLES } from '../../../../core/auth/permisos';

const ETIQUETA_ROL: Record<string, string> = {
  super_administrador: 'Super Administrador',
  Administrador: 'Administrador',
  Funcionario: 'Funcionario',
  Docente: 'Docente',
  Estudiante: 'Estudiante',
};

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly roles = ROLES.map((r) => ({ clave: r, etiqueta: ETIQUETA_ROL[r] }));

  identificacion = '';
  password = '';
  rol = 'Estudiante';
  modoDemo = signal(false);

  cargando = signal(false);
  mensaje = signal('');
  tipoMensaje = signal<'danger' | 'success' | 'info' | ''>('');

  etiquetaRol(clave: string): string {
    return ETIQUETA_ROL[clave] ?? clave;
  }

  async aceptar(): Promise<void> {
    // ── Modo demostración: no usa la API ──────────────────────────
    if (this.modoDemo()) {
      this.auth.loginDemo(this.rol);
      this.mostrar('Entrando en modo demostración...', 'info');
      setTimeout(() => this.router.navigate([this.auth.rutaInicial()]), 500);
      return;
    }

    // ── Modo real: autenticación JWT contra la API ────────────────
    if (!this.identificacion.trim() || !this.password) {
      this.mostrar('Ingrese su identificación y contraseña, o active el modo demostración.', 'danger');
      return;
    }
    this.cargando.set(true);
    this.mensaje.set('');
    try {
      await firstValueFrom(this.auth.login(this.identificacion.trim(), this.password));
      const rolReal = this.auth.usuario()?.rol;
      if (rolReal && rolReal !== this.rol) {
        this.mostrar(`Sesión iniciada como ${this.etiquetaRol(rolReal)} (el selector no coincide).`, 'info');
      } else {
        this.mostrar('Inicio de sesión exitoso. Redirigiendo...', 'success');
      }
      setTimeout(() => this.router.navigate([this.auth.rutaInicial()]), 800);
    } catch (err: any) {
      const detalle = err?.error?.detail || 'Error de conexión. Verifique que el servidor esté activo o use el modo demostración.';
      this.mostrar(detalle, 'danger');
    } finally {
      this.cargando.set(false);
    }
  }

  cancelar(): void {
    this.identificacion = '';
    this.password = '';
    this.mensaje.set('');
  }

  private mostrar(texto: string, tipo: 'danger' | 'success' | 'info' | ''): void {
    this.mensaje.set(texto);
    this.tipoMensaje.set(tipo);
  }
}