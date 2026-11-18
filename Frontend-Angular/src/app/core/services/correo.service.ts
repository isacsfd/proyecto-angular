import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EstadoSMTP, NotificacionEmail, RespuestaEnvioReporte } from '../models';

/**
 * CorreoService — Reportes por correo y seguimiento de notificaciones (parcial 2).
 *
 * (No confundir con NotificacionesService, que son los indicadores de
 * préstamos pendientes del panel: este servicio gestiona los correos.)
 *
 * El archivo del reporte se genera en el cliente (jsPDF/SheetJS) y viaja al
 * backend como cuerpo binario; el servidor lo adjunta al correo registrado,
 * lo envía por SMTP y registra el estado de cada intento.
 */
@Injectable({ providedIn: 'root' })
export class CorreoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** Envía el reporte al correo registrado del usuario autenticado. */
  enviarReporte(archivo: Blob, formato: 'pdf' | 'xlsx', titulo: string): Observable<RespuestaEnvioReporte> {
    const tipo = formato === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return this.http.post<RespuestaEnvioReporte>(
      `${this.apiUrl}/api/notificaciones/reporte`,
      archivo,
      {
        headers: { 'Content-Type': tipo },
        params: new HttpParams().set('formato', formato).set('titulo', titulo),
      },
    );
  }

  /** Historial de envíos con filtros (solo administradores). */
  listar(filtros: { tipo?: string; estado?: string } = {}): Observable<NotificacionEmail[]> {
    let params = new HttpParams();
    if (filtros.tipo) params = params.set('tipo', filtros.tipo);
    if (filtros.estado) params = params.set('estado', filtros.estado);
    return this.http.get<NotificacionEmail[]>(`${this.apiUrl}/api/notificaciones/`, { params });
  }

  /** ¿El servidor tiene SMTP configurado? (sin exponer secretos). */
  estadoSMTP(): Observable<EstadoSMTP> {
    return this.http.get<EstadoSMTP>(`${this.apiUrl}/api/notificaciones/estado-smtp`);
  }
}
