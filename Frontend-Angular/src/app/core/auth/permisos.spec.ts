import { describe, it, expect } from 'vitest';

import { MATRIZ, esRolAdmin, modulosDe, rutaInicial, tienePermiso } from './permisos';

describe('Matriz de permisos (espejo del RBAC)', () => {
  it('Funcionario conserva solo operación: préstamos, ingresos y dashboard', () => {
    expect(tienePermiso('Funcionario', 'dashboard')).toBe(true);
    expect(tienePermiso('Funcionario', 'gestion_prestamos')).toBe(true);
    expect(tienePermiso('Funcionario', 'ingresos')).toBe(true);
    expect(tienePermiso('Funcionario', 'inicio')).toBe(true);
    expect(tienePermiso('Funcionario', 'catalogo')).toBe(true);
    expect(tienePermiso('Funcionario', 'mis_prestamos')).toBe(true);
    expect(tienePermiso('Funcionario', 'dispositivos')).toBe(true);
  });

  it('Funcionario no administra usuarios, inventario ni estadísticas', () => {
    expect(tienePermiso('Funcionario', 'gestion_usuarios')).toBe(false);
    expect(tienePermiso('Funcionario', 'gestion_libros')).toBe(false);
    expect(tienePermiso('Funcionario', 'gestion_dispositivos')).toBe(false);
    expect(tienePermiso('Funcionario', 'estadisticas')).toBe(false);
    expect(tienePermiso('Funcionario', 'gestion_proveedores')).toBe(false);
    expect(tienePermiso('Funcionario', 'gestion_compras')).toBe(false);
  });

  it('Funcionario entra al panel administrativo pero no a módulos revocados', () => {
    expect(esRolAdmin('Funcionario')).toBe(true);
    expect(rutaInicial('Funcionario')).toBe('/admin');
  });

  it('Administrador conserva todos los módulos administrativos', () => {
    expect(modulosDe('Administrador')).toEqual(expect.arrayContaining([
      'gestion_usuarios', 'gestion_libros', 'gestion_dispositivos',
      'estadisticas', 'gestion_proveedores', 'gestion_compras',
    ]));
  });

  it('Docente y Estudiante solo acceden al portal de usuario', () => {
    for (const rol of ['Docente', 'Estudiante']) {
      expect(esRolAdmin(rol)).toBe(false);
      expect(rutaInicial(rol)).toBe('/inicio');
      expect(modulosDe(rol)).toEqual(['inicio', 'catalogo', 'mis_prestamos', 'dispositivos']);
    }
  });

  it('Un rol desconocido no hereda permisos', () => {
    expect(modulosDe('Auditor')).toEqual([]);
    expect(esRolAdmin('Auditor')).toBe(false);
    expect(rutaInicial('Auditor')).toBe('/inicio');
    expect(MATRIZ['Auditor']).toBeUndefined();
  });
});
