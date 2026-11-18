import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Acceso, Dispositivo, Libro, Prestamo, PrestamoDispositivo, TipoReporte, Usuario } from '../models';

export type FormatoReporte = 'pdf' | 'excel';
/** Formato del archivo para el envío por correo (backend). */
export type FormatoArchivo = 'pdf' | 'xlsx';

/** Datos de los reportes consolidados disponibles en la plataforma. */
export interface DatosReportes {
  libros?: Libro[];
  usuarios?: Usuario[];
  prestamos?: Prestamo[];
  dispositivos?: Dispositivo[];
  prestamosDispositivos?: PrestamoDispositivo[];
  ingresos?: Acceso[];
}

/** Definición lista para exportar: filas mapeadas + columnas + metadatos. */
export interface DefinicionReporte {
  datos: Record<string, unknown>[];
  columnas: string[];
  titulo: string;
  nombreArchivo: string;
}

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * ReportesService — Exporta datos a PDF (jsPDF + autotable) y Excel (SheetJS)
 * con el encabezado institucional de la Biblioteca IUB. Además de la descarga
 * local, genera Blobs (parcial 2) para enviar el mismo archivo al correo
 * registrado a través del backend.
 */
@Injectable({ providedIn: 'root' })
export class ReportesService {
  // ─── Descarga local (usa la definición del reporte) ───────────────────────

  exportarPDF(datos: Record<string, unknown>[], columnas: string[], titulo: string, nombreArchivo: string): void {
    const def: DefinicionReporte = { datos, columnas, titulo, nombreArchivo };
    if (!def.datos.length) {
      alert('No hay datos para exportar.');
      return;
    }
    this._construirPDF(def).save(`${def.nombreArchivo}_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  exportarExcel(datos: Record<string, unknown>[], columnas: string[], titulo: string, nombreArchivo: string): void {
    const def: DefinicionReporte = { datos, columnas, titulo, nombreArchivo };
    if (!def.datos.length) {
      alert('No hay datos para exportar.');
      return;
    }
    const libro = this._construirExcel(def);
    XLSX.writeFile(libro, `${def.nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  /** Descarga la definición en el formato pedido (pdf | excel). */
  descargar(def: DefinicionReporte, formato: FormatoReporte): void {
    if (formato === 'pdf') this.exportarPDF(def.datos, def.columnas, def.titulo, def.nombreArchivo);
    else this.exportarExcel(def.datos, def.columnas, def.titulo, def.nombreArchivo);
  }

  // ─── Blob para envío por correo (parcial 2) ───────────────────────────────

  /** Genera el archivo en memoria; null si no hay filas que reportar. */
  blob(def: DefinicionReporte, formato: FormatoArchivo): Blob | null {
    if (!def.datos.length) return null;
    if (formato === 'pdf') return this._construirPDF(def).output('blob');
    const salida = XLSX.write(this._construirExcel(def), { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    return new Blob([salida], { type: MIME_XLSX });
  }

  // ─── Definiciones por tipo de reporte ────────────────────────────────────

  definicion(tipo: TipoReporte, data: DatosReportes): DefinicionReporte {
    switch (tipo) {
      case 'usuarios': return this._defUsuarios(data.usuarios ?? []);
      case 'prestamos': return this._defPrestamosLibros(data.prestamos ?? []);
      case 'dispositivos': return this._defDispositivos(data.dispositivos ?? []);
      case 'ingresos': return this._defIngresos(data.ingresos ?? []);
      case 'libros':
      default: return this._defLibros(data.libros ?? []);
    }
  }

  private _defLibros(libros: Libro[]): DefinicionReporte {
    const columnas = ['ID', 'Título', 'Autor', 'Programa', 'Sede', 'Editorial', 'Año', 'Idioma', 'Ejemplares'];
    return {
      columnas,
      titulo: 'Reporte del Catálogo de Libros',
      nombreArchivo: 'reporte_libros',
      datos: libros.map((l) => ({
        ID: l.ID,
        Titulo: l.Titulo,
        Autor: l.Autor,
        Programa: l.Programa ?? '',
        Sede: l.sede ?? '',
        Editorial: l.Editorial ?? '',
        Año: l['Año'] ?? '',
        Idioma: l.Idioma ?? '',
        Ejemplares: l.Ejemplar ?? 0,
      })),
    };
  }

  private _defUsuarios(usuarios: Usuario[]): DefinicionReporte {
    const columnas = ['ID', 'Nombre', 'Identificación', 'Rol', 'Carrera', 'Sede', 'Email'];
    return {
      columnas,
      titulo: 'Reporte de Usuarios',
      nombreArchivo: 'reporte_usuarios',
      datos: usuarios.map((u) => ({
        ID: u.id,
        Nombre: u.nombre,
        Identificación: u.identificacion,
        Rol: u.rol,
        Carrera: u.carrera ?? '',
        Sede: u.sede ?? '',
        Email: u.email ?? '',
      })),
    };
  }

  private _defDispositivos(dispositivos: Dispositivo[]): DefinicionReporte {
    const columnas = ['ID', 'Tipo', 'Marca', 'Modelo', 'Sede', 'Estado', 'Observaciones'];
    return {
      columnas,
      titulo: 'Reporte de Dispositivos',
      nombreArchivo: 'reporte_dispositivos',
      datos: dispositivos.map((d) => ({
        ID: d.id,
        Tipo: d.tipo,
        Marca: d.marca,
        Modelo: d.modelo,
        Sede: d.sede,
        Estado: d.estado,
        Observaciones: d.observaciones ?? '',
      })),
    };
  }

  private _defPrestamosLibros(prestamos: Prestamo[]): DefinicionReporte {
    const columnas = ['ID', 'Usuario', 'Libro', 'Préstamo', 'Entrega', 'Estado', 'Solicitud'];
    return {
      columnas,
      titulo: 'Reporte de Préstamos de Libros',
      nombreArchivo: 'reporte_prestamos_libros',
      datos: prestamos.map((p) => ({
        ID: p.id,
        Usuario: p.user,
        Libro: p.book,
        Préstamo: p.loan_date ? new Date(p.loan_date).toLocaleString('es-CO') : 'N/A',
        Entrega: p.delivery_date ? new Date(p.delivery_date).toLocaleString('es-CO') : 'N/A',
        Estado: p.state,
        Solicitud: p.prestamo_state,
      })),
    };
  }

  private _defPrestamosDispositivos(prestamos: PrestamoDispositivo[]): DefinicionReporte {
    const columnas = ['ID', 'Dispositivo', 'Usuario', 'Inicio', 'Fin', 'Estado'];
    return {
      columnas,
      titulo: 'Reporte de Préstamos de Dispositivos',
      nombreArchivo: 'reporte_prestamos_dispositivos',
      datos: prestamos.map((p) => ({
        ID: p.id,
        Dispositivo: p.dispositivo,
        Usuario: p.user,
        Inicio: p.fecha_prestamo ? new Date(p.fecha_prestamo).toLocaleString('es-CO') : 'N/A',
        Fin: p.fecha_devolucion ? new Date(p.fecha_devolucion).toLocaleString('es-CO') : 'No devuelto',
        Estado: p.estado,
      })),
    };
  }

  private _defIngresos(accesos: Acceso[]): DefinicionReporte {
    const columnas = ['ID', 'Identificación', 'Nombre', 'Fecha y Hora', 'Mensaje', 'Estado'];
    return {
      columnas,
      titulo: 'Reporte de Ingresos a Biblioteca',
      nombreArchivo: 'reporte_ingresos',
      datos: accesos.map((a) => ({
        ID: a.id,
        Identificación: a.user_identificacion,
        Nombre: a.user_name,
        Fecha: a.created_at ? new Date(a.created_at).toLocaleString('es-CO') : 'N/A',
        Mensaje: a.message,
        Estado: a.status ? 'Permitido' : 'Denegado',
      })),
    };
  }

  // ─── Exportadores por tipo (compatibles con páginas existentes) ──────────

  exportarLibros(libros: Libro[], formato: FormatoReporte): void {
    this.descargar(this._defLibros(libros), formato);
  }

  exportarUsuarios(usuarios: Usuario[], formato: FormatoReporte): void {
    this.descargar(this._defUsuarios(usuarios), formato);
  }

  exportarDispositivos(dispositivos: Dispositivo[], formato: FormatoReporte): void {
    this.descargar(this._defDispositivos(dispositivos), formato);
  }

  exportarPrestamosLibros(prestamos: Prestamo[], formato: FormatoReporte): void {
    this.descargar(this._defPrestamosLibros(prestamos), formato);
  }

  exportarPrestamosDispositivos(prestamos: PrestamoDispositivo[], formato: FormatoReporte): void {
    this.descargar(this._defPrestamosDispositivos(prestamos), formato);
  }

  exportarIngresos(accesos: Acceso[], formato: FormatoReporte): void {
    this.descargar(this._defIngresos(accesos), formato);
  }

  // ─── Constructores internos ───────────────────────────────────────────────

  private _construirPDF(def: DefinicionReporte): jsPDF {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Encabezado institucional
    doc.setFillColor(13, 110, 253);
    doc.rect(0, 0, 297, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Institución Universitaria de Barranquilla — IUB', 14, 10);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Gestión Biblioteca', 14, 17);

    // Título del reporte
    doc.setTextColor(33, 37, 41);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(def.titulo, 14, 32);

    // Fecha de generación
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    const fechaGeneracion = new Date().toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.text(`Generado el: ${fechaGeneracion}`, 14, 38);

    autoTable(doc, {
      head: [def.columnas],
      body: this._extraerFilas(def.datos, def.columnas),
      startY: 44,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [13, 110, 253], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      tableLineColor: [222, 226, 230],
      tableLineWidth: 0.1,
    });

    const totalPaginas = doc.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(108, 117, 125);
      doc.text(`Página ${i} de ${totalPaginas}`, 283, 200, { align: 'right' });
      doc.text('Biblioteca IUB — Documento generado automáticamente', 14, 200);
    }
    return doc;
  }

  private _construirExcel(def: DefinicionReporte): XLSX.WorkBook {
    const hoja = XLSX.utils.aoa_to_sheet([
      [`Institución Universitaria de Barranquilla — ${def.titulo}`],
      [`Generado el: ${new Date().toLocaleString('es-CO')}`],
      [],
      def.columnas,
      ...this._extraerFilas(def.datos, def.columnas),
    ]);
    hoja['!cols'] = def.columnas.map(() => ({ wch: 22 }));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, def.titulo.substring(0, 31));
    return libro;
  }

  private _extraerFilas(datos: Record<string, unknown>[], columnas: string[]): string[][] {
    return datos.map((item) => {
      const valores = Object.values(item);
      return columnas.map((_, i) => {
        const val = valores[i];
        if (val === null || val === undefined) return '';
        if (typeof val === 'boolean') return val ? 'Permitido' : 'Denegado';
        return String(val);
      });
    });
  }
}
