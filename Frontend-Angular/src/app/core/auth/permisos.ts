/**
 * permisos.ts — Matriz de permisos por rol (espeja el RBAC del backend).
 * El backend usa services/rbac.py; aquí solo se refleja para navegación/UX.
 * La autoridad real sigue siendo FastAPI (requiere_modulo).
 */

// Módulos administrativos (rutas /admin/...)
export const MODULOS_ADMIN = [
  'dashboard',
  'gestion_libros',
  'gestion_dispositivos',
  'gestion_usuarios',
  'gestion_prestamos',
  'estadisticas',
  'ingresos',
] as const;

// Módulos del portal de usuario (rutas /inicio/...)
export const MODULOS_USER = ['inicio', 'catalogo', 'mis_prestamos', 'dispositivos'] as const;

export const ROLES = ['super_administrador', 'Administrador', 'Funcionario', 'Docente', 'Estudiante'] as const;

const TODOS = [...MODULOS_ADMIN, ...MODULOS_USER];

/** Matriz rol -> módulos (igual que la sembrada en el backend). */
export const MATRIZ: Record<string, string[]> = {
  super_administrador: TODOS,
  Administrador: TODOS,
  Funcionario: TODOS,
  Docente: ['inicio', 'catalogo', 'mis_prestamos', 'dispositivos'],
  Estudiante: ['inicio', 'catalogo', 'mis_prestamos', 'dispositivos'],
};

export function modulosDe(rol?: string | null): string[] {
  return MATRIZ[rol ?? ''] ?? [];
}

export function tienePermiso(rol: string | null | undefined, modulo: string): boolean {
  return modulosDe(rol).includes(modulo);
}

/** ¿El rol tiene acceso al panel administrativo (algún módulo admin)? */
export function esRolAdmin(rol?: string | null): boolean {
  return MODULOS_ADMIN.some((m) => tienePermiso(rol, m));
}

/** Ruta inicial tras iniciar sesión, según el rol. */
export function rutaInicial(rol?: string | null): string {
  return esRolAdmin(rol) ? '/admin' : '/inicio';
}