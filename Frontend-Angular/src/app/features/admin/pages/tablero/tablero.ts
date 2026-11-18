import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Acceso, Dispositivo, Libro, Prestamo, SerieDato, Usuario } from '../../../../core/models';
import {
  accesosPorDia,
  agregarPor,
  calcularIndicadores,
  IndicadoresTablero,
  prestamosPorMes,
  topN,
} from './tablero.datos';
import { GraficoBarras } from '../../../../shared/graficos/grafico-barras';
import { GraficoBarrasHorizontales } from '../../../../shared/graficos/grafico-barras-h';
import { GraficoDona } from '../../../../shared/graficos/grafico-dona';
import { GraficoLineas } from '../../../../shared/graficos/grafico-lineas';

const SEDES = ['Soledad', 'Barranquilla', 'Colsamiro'];

/**
 * AdminTablero — Tablero analítico (parcial 2): 7 indicadores, 7 gráficos
 * y un filtro por sede. Todo se calcula en el cliente a partir de los
 * endpoints ya existentes (RBAC del backend respeta el alcance por rol).
 */
@Component({
  selector: 'app-admin-tablero',
  standalone: true,
  imports: [CommonModule, FormsModule, GraficoBarras, GraficoBarrasHorizontales, GraficoDona, GraficoLineas],
  templateUrl: './tablero.html',
  styleUrl: './tablero.css',
})
export class AdminTablero {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly sedes = SEDES;

  // ─── Filtro del tablero ──────────────────────────────────────────────────
  readonly sede = signal('');

  // ─── Datos cargados ──────────────────────────────────────────────────────
  readonly cargando = signal(false);
  readonly error = signal('');
  private readonly libros = signal<Libro[]>([]);
  private readonly prestamos = signal<Prestamo[]>([]);
  private readonly dispositivos = signal<Dispositivo[]>([]);
  private readonly accesos = signal<Acceso[]>([]);
  private readonly usuarios = signal<Usuario[] | null>(null);

  /** Datasets con dimensión de sede tras aplicar el filtro. */
  private readonly librosFiltrados = computed(() =>
    this.filtrarPorSede(this.libros(), (l) => l.sede),
  );
  private readonly dispositivosFiltrados = computed(() =>
    this.filtrarPorSede(this.dispositivos(), (d) => d.sede),
  );
  private readonly usuariosFiltrados = computed(() =>
    this.usuarios() === null ? null : this.filtrarPorSede(this.usuarios() as Usuario[], (u) => u.sede),
  );

  // ─── Indicadores (mínimo 4) ──────────────────────────────────────────────
  readonly indicadores = computed<IndicadoresTablero>(() =>
    calcularIndicadores(
      this.librosFiltrados(),
      this.prestamos(),
      this.dispositivosFiltrados(),
      this.accesos(),
      this.usuariosFiltrados(),
    ),
  );

  // ─── Gráficos (6 exigidos + extra de usuarios) ───────────────────────────
  /** 1) Préstamos de libros por mes (evolución). */
  readonly seriePrestamosMes = computed<SerieDato[]>(() => prestamosPorMes(this.prestamos(), 12));
  /** 2) Composición de préstamos por estado. */
  readonly seriePrestamosEstado = computed<SerieDato[]>(() =>
    agregarPor(this.prestamos(), (p) => p.state),
  );
  /** 3) Libros por sede (respeta el filtro). */
  readonly serieLibrosSede = computed<SerieDato[]>(() =>
    agregarPor(this.librosFiltrados(), (l) => l.sede),
  );
  /** 4) Ranking: programas académicos con más títulos. */
  readonly serieTopProgramas = computed<SerieDato[]>(() =>
    topN(agregarPor(this.librosFiltrados(), (l) => l.Programa), 8),
  );
  /** 5) Dispositivos por estado (respeta el filtro). */
  readonly serieDispositivosEstado = computed<SerieDato[]>(() =>
    agregarPor(this.dispositivosFiltrados(), (d) => d.estado),
  );
  /** 6) Accesos a biblioteca por día (últimos 14 días). */
  readonly serieAccesosDia = computed<SerieDato[]>(() => accesosPorDia(this.accesos(), 14));
  /** 7) Usuarios por rol (solo si el rol puede listar usuarios). */
  readonly serieUsuariosRol = computed<SerieDato[]>(() => {
    const usuarios = this.usuariosFiltrados();
    return usuarios === null ? [] : agregarPor(usuarios, (u) => u.rol);
  });

  readonly puedeVerUsuarios = computed(() => this.auth.tienePermiso('gestion_usuarios'));

  constructor() {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const [libros, prestamos, dispositivos, accesos] = await Promise.all([
        firstValueFrom(this.api.listarLibros()),
        firstValueFrom(this.api.listarPrestamos()),
        firstValueFrom(this.api.listarDispositivos()),
        firstValueFrom(this.api.listarAccesos()),
      ]);
      this.libros.set(libros);
      this.prestamos.set(prestamos);
      this.dispositivos.set(dispositivos);
      this.accesos.set(accesos);

      if (this.auth.tienePermiso('gestion_usuarios')) {
        try {
          this.usuarios.set(await firstValueFrom(this.api.listarUsuarios()));
        } catch {
          this.usuarios.set(null); // sin permiso efectivo: el gráfico se omite
        }
      }
    } catch (err) {
      const e = err as { error?: { detail?: string } };
      this.error.set(e?.error?.detail || 'No se pudieron cargar los datos del tablero.');
    } finally {
      this.cargando.set(false);
    }
  }

  private filtrarPorSede<T>(items: T[], sede: (item: T) => string | undefined | null): T[] {
    const filtro = this.sede();
    if (!filtro) return items;
    return items.filter((item) => sede(item) === filtro);
  }
}
