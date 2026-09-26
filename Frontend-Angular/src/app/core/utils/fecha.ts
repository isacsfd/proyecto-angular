/**
 * Utilidades de fecha para formularios con input type="datetime-local".
 *
 * La API y MySQL guardan fechas sin zona horaria (hora local del servidor).
 * Usar toISOString() (UTC) en los defaults o en el envío desplaza la hora
 * respecto a la local (p. ej. UTC-5 en Colombia).
 */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Fecha/hora LOCAL en formato aceptado por <input type="datetime-local">. */
export function fechaLocalISO(fecha = new Date()): string {
  return (
    `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}` +
    `T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`
  );
}

/** Fecha/hora LOCAL con segundos (para marcas temporales de devolución). */
export function fechaLocalISOCompleta(fecha = new Date()): string {
  return fechaLocalISO(fecha) + ':' + pad(fecha.getSeconds());
}

/** Fecha LOCAL de hoy a una hora/minuto determinados. */
export function fechaLocalHoyA(horas: number, minutos = 0): string {
  const f = new Date();
  f.setHours(horas, minutos, 0, 0);
  return fechaLocalISO(f);
}

/** Fecha LOCAL de hoy + N días (misma hora). */
export function fechaLocalMasDias(dias: number): string {
  const f = new Date();
  f.setDate(f.getDate() + dias);
  return fechaLocalISO(f);
}