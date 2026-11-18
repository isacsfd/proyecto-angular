import { Acceso, Dispositivo, Libro, Prestamo, SerieDato, Usuario } from '../../../../core/models';

/**
 * tablero.datos.ts — Agregaciones puras del tablero analítico (parcial 2).
 * Sin dependencias de Angular: se prueban directamente en tablero.datos.spec.ts.
 */

/** Cuenta elementos por la clave dada, omitiendo vacíos. */
export function agregarPor<T>(items: T[], clave: (item: T) => string | undefined | null): SerieDato[] {
  const mapa = new Map<string, number>();
  for (const item of items) {
    const k = clave(item);
    if (k === undefined || k === null || k === '') continue;
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return [...mapa.entries()].map(([etiqueta, valor]) => ({ etiqueta, valor }));
}

export function ordenarPorValor(datos: SerieDato[], descendente = true): SerieDato[] {
  return [...datos].sort((a, b) => (descendente ? b.valor - a.valor : a.valor - b.valor));
}

export function topN(datos: SerieDato[], n: number): SerieDato[] {
  return ordenarPorValor(datos).slice(0, Math.max(n, 0));
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Parte de fecha (año/mes/día) tomada del TEXTO ISO, inmune a zonas horarias. */
export function fechaDeTexto(fechaIso: string | null | undefined): { anio: number; mes: number; dia: number } | null {
  if (!fechaIso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaIso.trim());
  if (!m) return null;
  return { anio: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
}

/** Clave AAAA-MM de una fecha ISO (inválidas → ''). */
export function claveMes(fechaIso: string | null | undefined): string {
  const fecha = fechaDeTexto(fechaIso);
  return fecha ? `${fecha.anio}-${String(fecha.mes).padStart(2, '0')}` : '';
}

function etiquetaMes(clave: string): string {
  const [anio, mes] = clave.split('-');
  return `${MESES[Number(mes) - 1] ?? mes} ${anio.slice(2)}`;
}

/** Préstamos por mes (últimos N meses con datos, orden cronológico). */
export function prestamosPorMes(prestamos: Prestamo[], meses = 12): SerieDato[] {
  const conteo = new Map<string, number>();
  for (const p of prestamos) {
    const k = claveMes(p.loan_date);
    if (!k) continue;
    conteo.set(k, (conteo.get(k) ?? 0) + 1);
  }
  const claves = [...conteo.keys()].sort().slice(-meses);
  return claves.map((k) => ({ etiqueta: etiquetaMes(k), valor: conteo.get(k) ?? 0 }));
}

/** Accesos por día de los últimos N días (incluye días sin accesos en 0). */
export function accesosPorDia(accesos: Acceso[], dias = 14): SerieDato[] {
  const conteo = new Map<string, number>();
  const hoy = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
    conteo.set(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, 0);
  }
  for (const a of accesos) {
    const fecha = fechaDeTexto(a.created_at);
    if (!fecha) continue;
    const k = `${fecha.anio}-${String(fecha.mes).padStart(2, '0')}-${String(fecha.dia).padStart(2, '0')}`;
    if (conteo.has(k)) conteo.set(k, (conteo.get(k) ?? 0) + 1);
  }
  return [...conteo.entries()].map(([k, valor]) => ({ etiqueta: k.slice(5), valor }));
}

/** Indicadores del tablero (mínimo 4 exigidos por el parcial). */
export interface IndicadoresTablero {
  libros: number;
  prestamosActivos: number;
  prestamosVencidos: number;
  dispositivosDisponibles: number;
  dispositivosTotal: number;
  usuarios: number | null;
  accesosExitosos: number;
}

export function calcularIndicadores(
  libros: Libro[],
  prestamos: Prestamo[],
  dispositivos: Dispositivo[],
  accesos: Acceso[],
  usuarios: Usuario[] | null,
): IndicadoresTablero {
  return {
    libros: libros.length,
    prestamosActivos: prestamos.filter((p) => p.state === 'Activo').length,
    prestamosVencidos: prestamos.filter((p) => p.state === 'Vencido').length,
    dispositivosDisponibles: dispositivos.filter((d) => d.estado === 'Disponible').length,
    dispositivosTotal: dispositivos.length,
    usuarios: usuarios === null ? null : usuarios.length,
    accesosExitosos: accesos.filter((a) => a.status).length,
  };
}
