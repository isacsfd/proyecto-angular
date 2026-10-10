import { Injectable, signal } from '@angular/core';
import {
  Acceso,
  ChatResponse,
  DashboardIA,
  Dispositivo,
  EstadoIA,
  Libro,
  LibroBuscar,
  LibroResultado,
  Prestamo,
  PrestamoDispositivo,
  Recomendacion,
  Usuario,
} from '../models';

export interface DemoUsuario extends Usuario {
  /** marcador para saber que el usuario es de demostración */
  demo?: boolean;
}

const USUARIO_DEMO: Record<string, DemoUsuario> = {
  super_administrador: { id: 1, nombre: 'Super Admin (Demo)', rol: 'super_administrador', identificacion: '1000000001', carrera: 'N/A', sede: 'Soledad', demo: true },
  Administrador: { id: 2, nombre: 'Administrador (Demo)', rol: 'Administrador', identificacion: '1000000002', carrera: 'N/A', sede: 'Barranquilla', demo: true },
  Funcionario: { id: 3, nombre: 'Funcionario (Demo)', rol: 'Funcionario', identificacion: '1000000003', carrera: 'N/A', sede: 'Colsamiro', demo: true },
  Docente: { id: 4, nombre: 'Docente (Demo)', rol: 'Docente', identificacion: '1000000004', carrera: 'Ingeniería de Sistemas', sede: 'Soledad', demo: true },
  Estudiante: { id: 5, nombre: 'Estudiante (Demo)', rol: 'Estudiante', identificacion: '1000000005', carrera: 'Ingeniería Industrial', sede: 'Soledad', demo: true },
};

/**
 * DemoService — Modo demostración (sin comunicación con la API).
 * Proporciona datos estáticos realistas SEPARADOS de la base real.
 * Se activa desde el login (selector de rol + "modo demostración").
 */
@Injectable({ providedIn: 'root' })
export class DemoService {
  /**
   * Modo demostración (solo en memoria, NO persistente): nunca escribe en las
   * claves de sesión real (jwt_token/userData/sesionActiva) y no se restaura
   * al recargar la página: exige activarlo de nuevo desde el login.
   */
  activo = signal(false);

  private usuarioActivoDemo: DemoUsuario | null = null;

  activar(rol: string): void {
    const u = USUARIO_DEMO[rol] ?? USUARIO_DEMO['Estudiante'];
    this.usuarioActivoDemo = u;
    this.activo.set(true);
  }

  desactivar(): void {
    this.usuarioActivoDemo = null;
    this.activo.set(false);
    sessionStorage.removeItem('demoModo');
  }

  /** Usuario demo vigente, o null si no hay modo demo. */
  usuarioActual(): DemoUsuario | null {
    return this.usuarioActivoDemo;
  }

  usuarioDemo(rol: string): DemoUsuario {
    return USUARIO_DEMO[rol] ?? USUARIO_DEMO['Estudiante'];
  }

  // ─── Datos estáticos ────────────────────────────────────────────
  private usuarios(): Usuario[] {
    return [
      { id: 1, nombre: 'Isaacs Ferrer de las Salas', username: 'iaferrer', email: 'iaferrer@iub.edu.co', rol: 'super_administrador', identificacion: '1010086984', carrera: 'Ingeniería Telemática', sede: 'Soledad' },
      { id: 2, nombre: 'Sebastián Ballestas', username: 'sebas', email: 'sebas@iub.edu.co', rol: 'Administrador', identificacion: '1043131875', carrera: 'Administración', sede: 'Barranquilla' },
      { id: 3, nombre: 'Carlos Bibliotecario', username: 'carlosb', email: 'carlosb@iub.edu.co', rol: 'Funcionario', identificacion: '1122334455', carrera: 'N/A', sede: 'Colsamiro' },
      { id: 4, nombre: 'Ana Torres', username: 'anatorres', email: 'anatorres@iub.edu.co', rol: 'Estudiante', identificacion: '123456789', carrera: 'Ingeniería Industrial', sede: 'Soledad' },
      { id: 5, nombre: 'Nicolás Castro', username: 'ndavidcastro', email: 'ndavid@iub.edu.co', rol: 'Estudiante', identificacion: '1043671636', carrera: 'Diseño Gráfico', sede: 'Barranquilla' },
      { id: 6, nombre: 'Yoissy Altamar', username: 'ymaltamar', email: 'ymaltamar@iub.edu.co', rol: 'Estudiante', identificacion: '1048207919', carrera: 'Tecnología en Gestión Logística', sede: 'Soledad' },
      { id: 7, nombre: 'Docente Prueba', username: 'docente', email: 'docente@iub.edu.co', rol: 'Docente', identificacion: '1044556677', carrera: 'Ingeniería Mecatrónica', sede: 'Soledad' },
      { id: 8, nombre: 'Estudiante Prueba', username: 'estudiante', email: 'estudiante@iub.edu.co', rol: 'Estudiante', identificacion: '22222222', carrera: 'Ingeniería Eléctrica', sede: 'Colsamiro' },
    ];
  }

  private libros(): Libro[] {
    const base: Array<Partial<Libro>> = [
      { Titulo: 'Clean Code', Autor: 'Robert C. Martin', Programa: 'Ingeniería de Sistemas', Signatura: '005.1-M36', Editorial: 'Prentice Hall', Año: 2008, Ejemplar: 3 },
      { Titulo: 'Cálculo de una variable', Autor: 'James Stewart', Programa: 'Básicas y transversales', Signatura: '515-S84', Editorial: 'Cengage', Año: 2018, Ejemplar: 5 },
      { Titulo: 'Administración', Autor: 'Stephen Robbins', Programa: 'Administración de Negocios Internacionales', Signatura: '658-R63', Editorial: 'Pearson', Año: 2017, Ejemplar: 2 },
      { Titulo: 'Física Universitaria', Autor: 'Sears & Zemansky', Programa: 'Básicas y transversales', Signatura: '530-S43', Editorial: 'Pearson', Año: 2016, Ejemplar: 4 },
      { Titulo: 'Fundamentos de Marketing', Autor: 'Philip Kotler', Programa: 'Gestión Empresarial', Signatura: '658.8-K87', Editorial: 'Pearson', Año: 2019, Ejemplar: 1 },
      { Titulo: 'Circuitos Eléctricos', Autor: 'Charles Alexander', Programa: 'Ingeniería Eléctrica', Signatura: '621.3-A54', Editorial: 'McGraw-Hill', Año: 2013, Ejemplar: 2 },
      { Titulo: 'Diseño Gráfico: Fundamentos', Autor: 'Gavin Ambrose', Programa: 'Diseño Gráfico', Signatura: '741.6-A52', Editorial: 'Parramón', Año: 2015, Ejemplar: 3 },
      { Titulo: 'Seguridad y Salud en el Trabajo', Autor: 'Carlos Ruiz', Programa: 'Ingeniería en Seguridad y Salud en el Trabajo', Signatura: '613.62-R93', Editorial: 'Ecoe', Año: 2020, Ejemplar: 2 },
      { Titulo: 'Introducción a la Mecatrónica', Autor: 'David Alciatore', Programa: 'Ingeniería Mecatrónica', Signatura: '629.8-A38', Editorial: 'McGraw-Hill', Año: 2014, Ejemplar: 1 },
      { Titulo: 'Redes de Computadoras', Autor: 'Andrew Tanenbaum', Programa: 'Ingeniería Telemática', Signatura: '004.6-T16', Editorial: 'Pearson', Año: 2012, Ejemplar: 2 },
    ];
    const sedes = ['Soledad', 'Barranquilla', 'Colsamiro'];
    return base.map((l, i) => ({
      ID: i + 1,
      Autor: l.Autor!,
      Titulo: l.Titulo!,
      Programa: l.Programa,
      Item: 1,
      Signatura: l.Signatura!,
      Areas: 100,
      Ejemplar: l.Ejemplar,
      Editorial: l.Editorial,
      Año: l.Año,
      Idioma: 'Español',
      sede: sedes[i % 3],
    }));
  }

  private dispositivos(): Dispositivo[] {
    const datos: Array<Partial<Dispositivo>> = [
      { tipo: 'Computador', marca: 'HP', modelo: 'EliteDesk 800', sede: 'Barranquilla', estado: 'Disponible' },
      { tipo: 'Tablet', marca: 'Samsung', modelo: 'Galaxy Tab S9', sede: 'Soledad', estado: 'Prestado' },
      { tipo: 'Computador', marca: 'Lenovo', modelo: 'ThinkCentre M70', sede: 'Soledad', estado: 'Disponible' },
      { tipo: 'Tablet', marca: 'Samsung', modelo: 'Tab A9', sede: 'Colsamiro', estado: 'Dañado' },
      { tipo: 'Computador', marca: 'Dell', modelo: 'OptiPlex 3080', sede: 'Colsamiro', estado: 'Disponible' },
      { tipo: 'Tablet', marca: 'Lenovo', modelo: 'Tab M10', sede: 'Barranquilla', estado: 'En Mantenimiento' },
    ];
    return datos.map((d, i) => ({
      id: i + 1, tipo: d.tipo!, marca: d.marca!, modelo: d.modelo!, sede: d.sede!, estado: d.estado!,
      created_at: '2026-01-15T10:00:00', updated_at: '2026-01-15T10:00:00',
    }));
  }

  private prestamos(): Prestamo[] {
    return [
      { id: 1, user_id: 4, user: 'Ana Torres', book_id: '1', book: 'Clean Code', loan_date: '2026-09-01T09:00:00', delivery_date: '2026-09-06T09:00:00', state: 'Devuelto', prestamo_state: 'Aprobado', created_at: '2026-09-01T09:00:00' },
      { id: 2, user_id: 5, user: 'Nicolás Castro', book_id: '3', book: 'Administración', loan_date: '2026-09-10T10:00:00', delivery_date: '2026-09-15T10:00:00', state: 'Activo', prestamo_state: 'Aprobado', created_at: '2026-09-10T10:00:00' },
      { id: 3, user_id: 6, user: 'Yoissy Altamar', book_id: '5', book: 'Fundamentos de Marketing', loan_date: '2026-09-12T11:00:00', delivery_date: '2026-09-17T11:00:00', state: 'Activo', prestamo_state: 'No Aprobado', created_at: '2026-09-12T11:00:00' },
      { id: 4, user_id: 8, user: 'Estudiante Prueba', book_id: '2', book: 'Cálculo de una variable', loan_date: '2026-08-20T08:00:00', delivery_date: '2026-08-25T08:00:00', state: 'Vencido', prestamo_state: 'Aprobado', created_at: '2026-08-20T08:00:00' },
      { id: 5, user_id: 4, user: 'Ana Torres', book_id: '8', book: 'Seguridad y Salud en el Trabajo', loan_date: '2026-09-18T09:30:00', delivery_date: '2026-09-23T09:30:00', state: 'Activo', prestamo_state: 'Aprobado', created_at: '2026-09-18T09:30:00' },
      { id: 6, user_id: 7, user: 'Docente Prueba', book_id: '10', book: 'Redes de Computadoras', loan_date: '2026-09-19T14:00:00', delivery_date: '2026-09-24T14:00:00', state: 'Activo', prestamo_state: 'Aprobado', created_at: '2026-09-19T14:00:00' },
    ];
  }

  private prestamosDispositivos(): PrestamoDispositivo[] {
    return [
      { id: 1, dispositivo_id: 2, dispositivo: 'Tablet Samsung Galaxy Tab S9', user_id: 4, user: 'Ana Torres', fecha_prestamo: '2026-09-19T09:00:00', fecha_devolucion: '2026-09-19T11:00:00', estado: 'Activo', created_at: '2026-09-19T09:00:00', updated_at: '2026-09-19T09:00:00' },
      { id: 2, dispositivo_id: 1, dispositivo: 'Computador HP EliteDesk 800', user_id: 5, user: 'Nicolás Castro', fecha_prestamo: '2026-09-18T10:00:00', fecha_devolucion: '2026-09-18T12:00:00', estado: 'Completado', created_at: '2026-09-18T10:00:00', updated_at: '2026-09-18T12:00:00' },
      { id: 3, dispositivo_id: 5, dispositivo: 'Computador Dell OptiPlex 3080', user_id: 6, user: 'Yoissy Altamar', fecha_prestamo: '2026-09-20T08:00:00', fecha_devolucion: '2026-09-20T10:00:00', estado: 'Pendiente', created_at: '2026-09-20T08:00:00', updated_at: '2026-09-20T08:00:00' },
      { id: 4, dispositivo_id: 4, dispositivo: 'Tablet Samsung Tab A9', user_id: 8, user: 'Estudiante Prueba', fecha_prestamo: '2026-09-15T13:00:00', fecha_devolucion: '2026-09-15T15:00:00', estado: 'Dañado', created_at: '2026-09-15T13:00:00', updated_at: '2026-09-15T15:00:00' },
      { id: 5, dispositivo_id: 3, dispositivo: 'Computador Lenovo ThinkCentre M70', user_id: 7, user: 'Docente Prueba', fecha_prestamo: '2026-09-21T07:00:00', fecha_devolucion: '2026-09-21T09:00:00', estado: 'Pendiente', created_at: '2026-09-21T07:00:00', updated_at: '2026-09-21T07:00:00' },
    ];
  }

  private accesos(): Acceso[] {
    const nombres = ['Ana Torres', 'Nicolás Castro', 'Yoissy Altamar', 'Estudiante Prueba', 'Docente Prueba'];
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i + 1,
      user_id: i + 1,
      user_name: nombres[i % nombres.length],
      user_identificacion: String(1043000000 + i),
      message: 'Acceso a biblioteca',
      status: i % 4 !== 3,
      created_at: `2026-09-${String(10 + i).padStart(2, '0')}T0${(i % 9) + 1}:30:00`,
    }));
  }

  private dashboard(): DashboardIA {
    return {
      tendencia: {
        series: [
          { mes: '2026-04', total: 12 },
          { mes: '2026-05', total: 18 },
          { mes: '2026-06', total: 15 },
          { mes: '2026-07', total: 22 },
          { mes: '2026-08', total: 19 },
          { mes: '2026-09', total: 26 },
        ],
        proyeccion_proximo_mes: 28,
        metodo: 'regresión lineal (demo)',
        ultimo_mes: '2026-09',
      },
      libros_top: [
        { id: 1, titulo: 'Clean Code', autor: 'Robert C. Martin', programa: 'Ingeniería de Sistemas', prestamos: 9, ejemplares: 3, disponible: true },
        { id: 3, titulo: 'Administración', autor: 'Stephen Robbins', programa: 'Negocios Internacionales', prestamos: 7, ejemplares: 2, disponible: true },
        { id: 5, titulo: 'Fundamentos de Marketing', autor: 'Philip Kotler', programa: 'Gestión Empresarial', prestamos: 6, ejemplares: 0, disponible: false },
      ],
      disponibilidad_critica: [
        { id: 5, titulo: 'Fundamentos de Marketing', autor: 'Philip Kotler', programa: 'Gestión Empresarial', ejemplares: 0 },
        { id: 9, titulo: 'Introducción a la Mecatrónica', autor: 'David Alciatore', programa: 'Ingeniería Mecatrónica', ejemplares: 1 },
      ],
      demanda_dispositivos: {
        total_dispositivos: 6,
        por_sede: { Soledad: 2, Barranquilla: 3, Colsamiro: 3 },
        por_tipo: { Computador: 2, Tablet: 3 },
        por_estado: { Disponible: 3, Prestado: 1, 'Dañado': 1, 'En Mantenimiento': 1 },
      },
      morosidad: {
        total: 1,
        lista: [
          { id: 4, usuario: 'Estudiante Prueba', identificacion: '22222222', libro: 'Cálculo de una variable', fecha_entrega: '2026-08-25T08:00:00', dias_vencido: 45 },
        ],
      },
      pendientes_aprobacion: [
        { id: 3, usuario: 'Yoissy Altamar', libro: 'Fundamentos de Marketing', fecha_solicitud: '2026-09-12T11:00:00' },
      ],
    };
  }

  // ─── Mapeo de respuestas por endpoint ───────────────────────────
  /** Devuelve datos demo para la petición, o undefined si no aplica. */
  responder(metodo: string, path: string, params: Record<string, string>): unknown | undefined {
    const m = metodo.toUpperCase();

    if (m === 'GET') {
      if (path === '/usuarios/') return this.usuarios();
      if (path === '/libros/') return this.filtrarLibros(params['sede']);
      if (path === '/libros/categoria') return this.libros();
      if (path === '/libros/buscar') {
        const q = (params['q'] ?? '').toLowerCase();
        return this.libros()
          .filter((l) => `${l.Titulo} ${l.Autor} ${l.Signatura}`.toLowerCase().includes(q))
          .slice(0, 8)
          .map<LibroBuscar>((l) => ({ id: l.ID, titulo: l.Titulo, autor: l.Autor, ejemplares: l.Ejemplar, sede: l.sede }));
      }
      if (path === '/loan/') return this.prestamos();
      if (path === '/dispositivos/') return this.dispositivos();
      if (path === '/prestamos-dispositivos/') return this.prestamosDispositivos();
      if (path === '/api/library-access/') return this.accesos();
      if (path === '/api/ia/estado') return { motor_llm: 'demo', host: 'modo demostración', modelo: 'datos estáticos', disponible: false } as EstadoIA;
      if (path === '/api/ia/dashboard') return this.dashboard();
      if (path === '/api/ia/recomendaciones') {
        return this.libros().slice(0, 5).map<Recomendacion>((l, i) => ({
          id: l.ID, titulo: l.Titulo, autor: l.Autor, programa: l.Programa ?? '', ejemplares: l.Ejemplar ?? 0,
          score: 0.9 - i * 0.1, razon: 'Recomendado para tu programa (demo)',
        }));
      }
      if (path === '/api/ia/buscar') {
        const q = (params['q'] ?? '').toLowerCase();
        return this.libros()
          .filter((l) => `${l.Titulo} ${l.Autor} ${l.Programa}`.toLowerCase().includes(q))
          .slice(0, 8)
          .map<LibroResultado>((l) => ({ id: l.ID, titulo: l.Titulo, autor: l.Autor, programa: l.Programa ?? '', editorial: l.Editorial, idioma: l.Idioma, ejemplares: l.Ejemplar ?? 0, score: 0.8 }));
      }
      return undefined;
    }

    // POST / PUT / PATCH / DELETE -> respuesta simulada
    if (path.startsWith('/api/ia/chat')) {
      return { respuesta: 'Estoy en modo demostración: puedo mostrarte datos de ejemplo de libros, préstamos y dispositivos.', motor: 'demo', intencion: 'ayuda' } as ChatResponse;
    }
    if (path === '/api/iniciar-lector') return { mensaje: 'Lector QR iniciado (modo demostración)' };
    if (m === 'DELETE') return { mensaje: 'Eliminado (modo demostración)' };
    return { mensaje: 'Operación simulada (modo demostración)' };
  }

  private filtrarLibros(sede?: string): Libro[] {
    const libros = this.libros();
    return sede ? libros.filter((l) => l.sede === sede) : libros;
  }
}