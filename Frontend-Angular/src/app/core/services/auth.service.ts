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

  usuario = signal<Usuario | null>(this.leerUsuarioGuardado());

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

  /** Modo demostración: inicia sesión SIN llamar a la API (datos estáticos). */
  loginDemo(rol: string): void {
    this.demo.activar(rol);
    this.usuario.set(this.leerUsuarioGuardado());
  }

  logout(): void {
    this.demo.desactivar();
    sessionStorage.removeItem('jwt_token');
    sessionStorage.removeItem('userData');
    sessionStorage.removeItem('sesionActiva');
    this.usuario.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return sessionStorage.getItem('jwt_token');
  }

  isDemo(): boolean {
    return this.demo.activo();
  }

  isAuthenticated(): boolean {
    return this.isDemo() || (sessionStorage.getItem('sesionActiva') === 'true' && !!this.getToken());
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