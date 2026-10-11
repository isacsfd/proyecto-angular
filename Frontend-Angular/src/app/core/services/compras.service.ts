import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Proveedor {
  id: number;
  razon_social: string;
  nit: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  estado: number;
  creado?: string;
  actualizado?: string;
}

export interface Compra {
  id: number;
  proveedor_id: number;
  proveedor?: string;
  numero_factura: string;
  fecha: string;
  total: number;
  estado: number;
  creado?: string;
  actualizado?: string;
}

export interface DetalleCompra {
  id: number;
  compra_id: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  estado: number;
}

export interface ProveedorPayload {
  razon_social: string;
  nit: string;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
}

export interface CompraPayload {
  proveedor_id: number;
  numero_factura: string;
  fecha?: string;
  total?: number;
}

export interface DetallePayload {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
}

/**
 * ComprasService — consume Proveedores, Compras y Detalles desde la API
 * principal FastAPI (environment.apiUrl), que expone esos recursos sobre la
 * base MySQL de XAMPP. El token JWT se adjunta automáticamente por jwtInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  listarProveedores(): Observable<Proveedor[]> {
    return this.http.get<Proveedor[]>(`${this.base}/api/proveedores`);
  }
  crearProveedor(datos: ProveedorPayload): Observable<Proveedor> {
    return this.http.post<Proveedor>(`${this.base}/api/proveedores`, datos);
  }
  actualizarProveedor(id: number, datos: Partial<ProveedorPayload>): Observable<Proveedor> {
    return this.http.put<Proveedor>(`${this.base}/api/proveedores/${id}`, datos);
  }
  eliminarProveedor(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.base}/api/proveedores/${id}`);
  }

  listarCompras(): Observable<Compra[]> {
    return this.http.get<Compra[]>(`${this.base}/api/compras`);
  }
  crearCompra(datos: CompraPayload): Observable<Compra> {
    return this.http.post<Compra>(`${this.base}/api/compras`, datos);
  }
  actualizarCompra(id: number, datos: Partial<CompraPayload>): Observable<Compra> {
    return this.http.put<Compra>(`${this.base}/api/compras/${id}`, datos);
  }
  eliminarCompra(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.base}/api/compras/${id}`);
  }

  listarDetalles(compraId: number): Observable<DetalleCompra[]> {
    return this.http.get<DetalleCompra[]>(`${this.base}/api/compras/${compraId}/detalles`);
  }
  crearDetalle(compraId: number, datos: DetallePayload): Observable<DetalleCompra> {
    return this.http.post<DetalleCompra>(`${this.base}/api/compras/${compraId}/detalles`, datos);
  }
  eliminarDetalle(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.base}/api/detalles/${id}`);
  }
}