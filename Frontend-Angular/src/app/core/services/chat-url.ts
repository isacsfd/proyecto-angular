/**
 * chat-url.ts — Construcción de la URL del WebSocket de chat en vivo.
 *
 * Los navegadores no pueden enviar el header `Authorization` al abrir un
 * WebSocket, por eso el JWT viaja como parámetro de consulta (el backend lo
 * valida igual que un Bearer y rechaza la conexión con código 4401).
 * Función pura: se prueba directamente en chat-url.spec.ts.
 */
export function construirUrlWebSocket(apiUrl: string, token: string, ruta = '/api/chat/ws'): string {
  const base = new URL(apiUrl || window.location.origin, window.location.origin);
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  const rutaLimpia = ruta.startsWith('/') ? ruta : `/${ruta}`;
  base.pathname = `${base.pathname.replace(/\/+$/, '')}${rutaLimpia}`;
  base.search = new URLSearchParams({ token }).toString();
  return base.toString();
}
