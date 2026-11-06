import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DemoService } from './demo.service';
import { esRolAdmin, modulosDe, rutaInicial, tienePermiso as tienePermisoFn } from '../auth/permisos';

export interface Usuario {
  id: number;
  nombre: string;
  username?: string;
  email?: string;
  rol: string;
  identificacion: string;
  nivel_academico?: string;
  carrera?: string;
  sede?: string;
}

export interface LoginResponse {
  message: string;
  access_token: string;
  token_type: string;
  user: Usuario;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly demo = inject(DemoService);
  private readonly apiUrl = environment.apiUrl;

  usuario = signal<Usuario | null>(this.leerUsuarioGuardado() ?? this.demo.usuarioActual());

  private leerUsuarioGuardado(): Usuario | null {
    const raw = sessionStorage.getItem('userData');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Usuario;
    } catch {
      return null;
    }
  }

  login(identificacion: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, { identificacion, password })
      .pipe(
        tap((res) => {
          this.demo.desactivar();
          sessionStorage.setItem('jwt_token', res.access_token);
          sessionStorage.setItem('userData', JSON.stringify(res.user));
          sessionStorage.setItem('sesionActiva', 'true');
          this.usuario.set(res.user);
        }),
      );
  }

  /** Modo demostración: sin llamar a la API, usa el usuario demo del rol elegido. */
  loginDemo(rol: string): void {
    this.demo.activar(rol);
    this.usuario.set(this.demo.usuarioActual());
  }

  logout(): void {
    this.demo.desactivar();
    this.limpiarSesionLocal();
    this.router.navigate(['/login']);
  }

  /** Elimina credenciales locales sin navegar (usado también por el interceptor). */
  limpiarSesionLocal(): void {
    this.demo.desactivar();
    sessionStorage.removeItem('jwt_token');
    sessionStorage.removeItem('userData');
    sessionStorage.removeItem('sesionActiva');
    this.usuario.set(null);
  }

  getToken(): string | null {
    return sessionStorage.getItem('jwt_token');
  }

  /** Comprueba la expiración del JWT solo para UX; el backend sigue siendo la autoridad. */
  private tokenExpirado(token: string): boolean {
    const partes = token.split('.');
    if (partes.length !== 3) return false; // token opaco: lo valida el backend
    try {
      const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      const relleno = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const payload = JSON.parse(atob(relleno)) as { exp?: unknown };
      return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
    } catch {
      return false;
    }
  }

  isDemo(): boolean {
    return this.demo.activo();
  }

  /** Autenticación REAL: exige un JWT válido y no expirado. El modo demo NO cuenta. */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (sessionStorage.getItem('sesionActiva') !== 'true' || !token) {
      return false;
    }
    if (this.tokenExpirado(token)) {
      this.limpiarSesionLocal();
      return false;
    }
    return true;
  }

  isAdmin(): boolean {
    return esRolAdmin(this.usuario()?.rol);
  }

  isSuper(): boolean {
    return this.usuario()?.rol === 'super_administrador';
  }

  /** Módulos permitidos para el rol actual. */
  modulos(): string[] {
    return modulosDe(this.usuario()?.rol);
  }

  /** ¿El rol actual tiene permiso para el módulo indicado? */
  tienePermiso(modulo: string): boolean {
    return tienePermisoFn(this.usuario()?.rol, modulo);
  }

  /** Ruta inicial según el rol (panel admin o portal de usuario). */
  rutaInicial(): string {
    return rutaInicial(this.usuario()?.rol);
  }

  rolLegible(): string {
    const rol = this.usuario()?.rol;
    switch (rol) {
      case 'super_administrador': return 'Super Administrador';
      case 'Administrador': return 'Administrador';
      case 'Funcionario': return 'Funcionario';
      case 'Docente': return 'Docente';
      default: return 'Estudiante';
    }
  }
}