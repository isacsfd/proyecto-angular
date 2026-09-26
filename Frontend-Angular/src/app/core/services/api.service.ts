import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Acceso,
  ChatRequest,
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
  UsuarioCreate,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // ─── Autenticación ──────────────────────────────────────────────
  login(identificacion: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { identificacion, password });
  }

  // ─── Usuarios ───────────────────────────────────────────────────
  listarUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/usuarios/`);
  }

  crearUsuario(data: UsuarioCreate): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/usuarios/`, data);
  }

  actualizarUsuario(id: number, data: Partial<Usuario>): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/usuarios/${id}`, data);
  }

  eliminarUsuario(id: number): Observable<Usuario> {
    return this.http.delete<Usuario>(`${this.apiUrl}/usuarios/${id}`);
  }

  // ─── Libros ─────────────────────────────────────────────────────
  listarLibros(sede?: string): Observable<Libro[]> {
    let params = new HttpParams();
    if (sede) params = params.set('sede', sede);
    return this.http.get<Libro[]>(`${this.apiUrl}/libros/`, { params });
  }

  listarLibrosPorCategoria(categoria: string): Observable<Libro[]> {
    return this.http.get<Libro[]>(`${this.apiUrl}/libros/categoria`, {
      params: new HttpParams().set('categoria', categoria),
    });
  }

  buscarLibros(q: string, limit = 8, sede?: string): Observable<LibroBuscar[]> {
    let params = new HttpParams().set('q', q).set('limit', limit);
    if (sede) params = params.set('sede', sede);
    return this.http.get<LibroBuscar[]>(`${this.apiUrl}/libros/buscar`, { params });
  }

  crearLibro(data: Partial<Libro>): Observable<Libro> {
    return this.http.post<Libro>(`${this.apiUrl}/libros/`, data);
  }

  actualizarLibro(id: number, data: Partial<Libro>): Observable<Libro> {
    return this.http.put<Libro>(`${this.apiUrl}/libros/${id}`, data);
  }

  eliminarLibro(id: number): Observable<Libro> {
    return this.http.delete<Libro>(`${this.apiUrl}/libros/${id}`);
  }

  // ─── Préstamos de libros ────────────────────────────────────────
  listarPrestamos(): Observable<Prestamo[]> {
    return this.http.get<Prestamo[]>(`${this.apiUrl}/loan/`);
  }

  crearPrestamo(data: {
    user_id: number;
    book_id: number;
    loan_date: string;
    delivery_date: string;
    prestamo_state?: string;
  }): Observable<Prestamo> {
    return this.http.post<Prestamo>(`${this.apiUrl}/loan/`, data);
  }

  actualizarPrestamo(
    id: number,
    data: { entry_date?: string; observations?: string; prestamo_state?: string; state?: string },
  ): Observable<Prestamo> {
    return this.http.patch<Prestamo>(`${this.apiUrl}/loan/${id}`, data);
  }

  // ─── Dispositivos ───────────────────────────────────────────────
  listarDispositivos(): Observable<Dispositivo[]> {
    return this.http.get<Dispositivo[]>(`${this.apiUrl}/dispositivos/`);
  }

  crearDispositivo(data: Partial<Dispositivo>): Observable<Dispositivo> {
    return this.http.post<Dispositivo>(`${this.apiUrl}/dispositivos/`, data);
  }

  actualizarDispositivo(id: number, data: Partial<Dispositivo>): Observable<Dispositivo> {
    return this.http.put<Dispositivo>(`${this.apiUrl}/dispositivos/${id}`, data);
  }

  eliminarDispositivo(id: number): Observable<Dispositivo> {
    return this.http.delete<Dispositivo>(`${this.apiUrl}/dispositivos/${id}`);
  }

  // ─── Préstamos de dispositivos ──────────────────────────────────
  listarPrestamosDispositivos(): Observable<PrestamoDispositivo[]> {
    return this.http.get<PrestamoDispositivo[]>(`${this.apiUrl}/prestamos-dispositivos/`);
  }

  crearPrestamoDispositivo(data: {
    dispositivo_id: number;
    user_id: number;
    fecha_prestamo: string;
    fecha_devolucion: string;
    observaciones?: string;
  }): Observable<PrestamoDispositivo> {
    return this.http.post<PrestamoDispositivo>(`${this.apiUrl}/prestamos-dispositivos/`, data);
  }

  actualizarPrestamoDispositivo(
    id: number,
    data: { fecha_devolucion?: string; estado?: string; observaciones?: string },
  ): Observable<PrestamoDispositivo> {
    return this.http.patch<PrestamoDispositivo>(`${this.apiUrl}/prestamos-dispositivos/${id}`, data);
  }

  // ─── Acceso / QR ────────────────────────────────────────────────
  registrarAcceso(dni: string, message?: string): Observable<Acceso> {
    return this.http.post<Acceso>(`${this.apiUrl}/api/library-access/`, { dni, message });
  }

  listarAccesos(): Observable<Acceso[]> {
    return this.http.get<Acceso[]>(`${this.apiUrl}/api/library-access/`);
  }

  iniciarLector(): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.apiUrl}/api/iniciar-lector`, {});
  }

  // ─── IA ─────────────────────────────────────────────────────────
  chat(mensaje: string): Observable<ChatResponse> {
    const body: ChatRequest = { mensaje };
    return this.http.post<ChatResponse>(`${this.apiUrl}/api/ia/chat`, body);
  }

  busquedaSemantica(q: string, top_k = 8): Observable<LibroResultado[]> {
    return this.http.get<LibroResultado[]>(`${this.apiUrl}/api/ia/buscar`, {
      params: new HttpParams().set('q', q).set('top_k', top_k),
    });
  }

  recomendaciones(top_k = 5): Observable<Recomendacion[]> {
    return this.http.get<Recomendacion[]>(`${this.apiUrl}/api/ia/recomendaciones`, {
      params: new HttpParams().set('top_k', top_k),
    });
  }

  dashboardIA(): Observable<DashboardIA> {
    return this.http.get<DashboardIA>(`${this.apiUrl}/api/ia/dashboard`);
  }

  estadoIA(): Observable<EstadoIA> {
    return this.http.get<EstadoIA>(`${this.apiUrl}/api/ia/estado`);
  }
}