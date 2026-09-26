import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

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
          sessionStorage.setItem('jwt_token', res.access_token);
          sessionStorage.setItem('userData', JSON.stringify(res.user));
          sessionStorage.setItem('sesionActiva', 'true');
          this.usuario.set(res.user);
        }),
      );
  }

  logout(): void {
    sessionStorage.removeItem('jwt_token');
    sessionStorage.removeItem('userData');
    sessionStorage.removeItem('sesionActiva');
    this.usuario.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return sessionStorage.getItem('jwt_token');
  }

  isAuthenticated(): boolean {
    return sessionStorage.getItem('sesionActiva') === 'true' && !!this.getToken();
  }

  isAdmin(): boolean {
    const rol = this.usuario()?.rol;
    return rol === 'Administrador' || rol === 'super_administrador';
  }

  isSuper(): boolean {
    return this.usuario()?.rol === 'super_administrador';
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