import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Libro, Usuario } from '../models';

/**
 * SugerenciasService — Cachea el catálogo de libros y el listado de usuarios
 * para alimentar el autocompletado de búsqueda. Solo los administradores
 * cargan usuarios; un usuario normal carga únicamente libros.
 */
@Injectable({ providedIn: 'root' })
export class SugerenciasService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  libros = signal<Libro[]>([]);
  usuarios = signal<Usuario[]>([]);
  cargado = signal(false);

  async cargar(): Promise<void> {
    if (this.cargado()) return;
    try {
      const libros = await firstValueFrom(this.api.listarLibros());
      const usuarios = this.auth.isAdmin()
        ? await firstValueFrom(this.api.listarUsuarios())
        : [];
      this.libros.set(libros);
      this.usuarios.set(usuarios);
      this.cargado.set(true);
    } catch {
      /* sugerencias opcionales: si fallan, se omiten */
    }
  }
}