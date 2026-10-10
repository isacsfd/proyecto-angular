import { firstValueFrom } from 'rxjs';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ReportesService } from '../../../../core/services/reportes.service';
import { SugerenciasService } from '../../../../core/services/sugerencias.service';
import { BuscarSugerencias } from '../../../../shared/buscar-sugerencias/buscar-sugerencias';
import { DatatableDirective } from '../../../../shared/datatable/datatable.directive';
import { EstadoBadge } from '../../../../shared/estado-badge/estado-badge';
import { Alerta } from '../../../../shared/alerta/alerta';
import { SEDES } from '../../../../core/models/sedes';
import { Usuario } from '../../../../core/models';

const ROLES_BASE = ['Funcionario', 'Docente', 'Estudiante'];

@Component({
  selector: 'app-admin-usuarios',
  imports: [FormsModule, BuscarSugerencias, DatatableDirective, EstadoBadge, Alerta],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class AdminUsuarios {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly reportes = inject(ReportesService);
  readonly sugerencias = inject(SugerenciasService);

  usuarios = signal<Usuario[]>([]);
  cargando = signal(false);
  error = signal('');
  filtro = signal('');

  mostrarForm = signal(false);
  editandoId: number | null = null;
  form: any = {};

  readonly rolesBase = ROLES_BASE;
  readonly sedes = SEDES;

  constructor(private readonly route: ActivatedRoute) {
    this.cargar();
    this.sugerencias.cargar();
    this.route.queryParamMap.subscribe((params) => {
      const termino = params.get('buscar');
      if (termino) this.filtro.set(termino);
    });
  }

  // Solo el super administrador puede crear administradores
  rolesDisponibles(): string[] {
    return this.auth.isSuper() ? ['Administrador', ...ROLES_BASE] : ROLES_BASE;
  }

  esSuper(): boolean {
    return this.auth.isSuper();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.usuarios.set(await firstValueFrom(this.api.listarUsuarios()));
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al cargar usuarios.');
    } finally {
      this.cargando.set(false);
    }
  }

  nuevo(): void {
    this.editandoId = null;
    this.form = {
      nombre: '',
      identificacion: '',
      password: '',
      rol: 'Estudiante',
      phone: '',
      address: '',
      username: '',
      email: '',
      nivel_academico: '',
      carrera: '',
      sede: this.auth.usuario()?.sede ?? 'Soledad',
    };
    this.mostrarForm.set(true);
  }

  editar(u: Usuario): void {
    this.editandoId = u.id;
    this.form = {
      nombre: u.nombre,
      identificacion: u.identificacion,
      rol: u.rol,
      phone: u.phone ?? '',
      address: u.address ?? '',
      username: u.username ?? '',
      email: u.email ?? '',
      nivel_academico: u.nivel_academico ?? '',
      carrera: u.carrera ?? '',
      sede: u.sede ?? this.auth.usuario()?.sede ?? 'Soledad',
    };
    this.mostrarForm.set(true);
  }

  cancelar(): void {
    this.mostrarForm.set(false);
    this.editandoId = null;
  }

  async guardar(): Promise<void> {
    if (!this.form.nombre || !this.form.identificacion) {
      this.error.set('Nombre e identificación son obligatorios.');
      return;
    }
    this.error.set('');
    try {
      if (this.editandoId) {
        const data: any = { ...this.form };
        delete data.password;
        await firstValueFrom(this.api.actualizarUsuario(this.editandoId, data));
      } else {
        await firstValueFrom(this.api.crearUsuario(this.form));
      }
      this.mostrarForm.set(false);
      this.editandoId = null;
      await this.cargar();
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al guardar el usuario.');
    }
  }

  async eliminar(u: Usuario): Promise<void> {
    if (!confirm(`¿Eliminar al usuario "${u.nombre}"?`)) return;
    try {
      await firstValueFrom(this.api.eliminarUsuario(u.id));
      await this.cargar();
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al eliminar el usuario.');
    }
  }

  badgeRol(rol: string): string {
    switch (rol) {
      case 'super_administrador': return 'text-bg-dark';
      case 'Administrador': return 'text-bg-danger';
      case 'Funcionario': return 'text-bg-warning';
      case 'Docente': return 'text-bg-info';
      default: return 'text-bg-success';
    }
  }

  exportarPDF(): void {
    this.reportes.exportarUsuarios(this.usuarios(), 'pdf');
  }

  exportarExcel(): void {
    this.reportes.exportarUsuarios(this.usuarios(), 'excel');
  }
}