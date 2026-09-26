import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Acceso, Dispositivo, Libro, Prestamo, PrestamoDispositivo, Usuario } from '../models';

export type FormatoReporte = 'pdf' | 'excel';

/**
 * ReportesService — Exporta datos a PDF (jsPDF + autotable) y Excel (SheetJS)
 * con el encabezado institucional de la Biblioteca IUB. Portado del frontend
 * estático (js/reportes.js) al Angular.
 */
@Injectable({ providedIn: 'root' })
export class ReportesService {
  exportarPDF(datos: any[], columnas: string[], titulo: string, nombreArchivo: string): void {
    if (!datos || datos.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

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
    doc.text(titulo, 14, 32);

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

    const filas = this._extraerFilas(datos, columnas);

    autoTable(doc, {
      head: [columnas],
      body: filas,
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

    const fecha = new Date().toISOString().split('T')[0];
    doc.save(`${nombreArchivo}_${fecha}.pdf`);
  }

  exportarExcel(datos: any[], columnas: string[], titulo: string, nombreArchivo: string): void {
    if (!datos || datos.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    const filas = this._extraerFilas(datos, columnas);

    const hoja = XLSX.utils.aoa_to_sheet([
      [`Institución Universitaria de Barranquilla — ${titulo}`],
      [`Generado el: ${new Date().toLocaleString('es-CO')}`],
      [],
      columnas,
      ...filas,
    ]);

    hoja['!cols'] = columnas.map(() => ({ wch: 22 }));

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, titulo.substring(0, 31));

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(libro, `${nombreArchivo}_${fecha}.xlsx`);
  }

  exportarLibros(libros: Libro[], formato: FormatoReporte): void {
    const columnas = ['ID', 'Título', 'Autor', 'Programa', 'Sede', 'Editorial', 'Año', 'Idioma', 'Ejemplares'];
    const datos = libros.map((l) => ({
      ID: l.ID,
      Titulo: l.Titulo,
      Autor: l.Autor,
      Programa: l.Programa ?? '',
      Sede: l.sede ?? '',
      Editorial: l.Editorial ?? '',
      Año: l['Año'] ?? '',
      Idioma: l.Idioma ?? '',
      Ejemplares: l.Ejemplar ?? 0,
    }));
    if (formato === 'pdf') {
      this.exportarPDF(datos, columnas, 'Reporte del Catálogo de Libros', 'reporte_libros');
    } else {
      this.exportarExcel(datos, columnas, 'Catálogo de Libros', 'reporte_libros');
    }
  }

  exportarUsuarios(usuarios: Usuario[], formato: FormatoReporte): void {
    const columnas = ['ID', 'Nombre', 'Identificación', 'Rol', 'Carrera', 'Sede', 'Email'];
    const datos = usuarios.map((u) => ({
      ID: u.id,
      Nombre: u.nombre,
      Identificación: u.identificacion,
      Rol: u.rol,
      Carrera: u.carrera ?? '',
      Sede: u.sede ?? '',
      Email: u.email ?? '',
    }));
    if (formato === 'pdf') {
      this.exportarPDF(datos, columnas, 'Reporte de Usuarios', 'reporte_usuarios');
    } else {
      this.exportarExcel(datos, columnas, 'Usuarios', 'reporte_usuarios');
    }
  }

  exportarDispositivos(dispositivos: Dispositivo[], formato: FormatoReporte): void {
    const columnas = ['ID', 'Tipo', 'Marca', 'Modelo', 'Sede', 'Estado', 'Observaciones'];
    const datos = dispositivos.map((d) => ({
      ID: d.id,
      Tipo: d.tipo,
      Marca: d.marca,
      Modelo: d.modelo,
      Sede: d.sede,
      Estado: d.estado,
      Observaciones: d.observaciones ?? '',
    }));
    if (formato === 'pdf') {
      this.exportarPDF(datos, columnas, 'Reporte de Dispositivos', 'reporte_dispositivos');
    } else {
      this.exportarExcel(datos, columnas, 'Dispositivos', 'reporte_dispositivos');
    }
  }

  exportarPrestamosLibros(prestamos: Prestamo[], formato: FormatoReporte): void {
    const columnas = ['ID', 'Usuario', 'Libro', 'Préstamo', 'Entrega', 'Estado', 'Solicitud'];
    const datos = prestamos.map((p) => ({
      ID: p.id,
      Usuario: p.user,
      Libro: p.book,
      Préstamo: p.loan_date ? new Date(p.loan_date).toLocaleString('es-CO') : 'N/A',
      Entrega: p.delivery_date ? new Date(p.delivery_date).toLocaleString('es-CO') : 'N/A',
      Estado: p.state,
      Solicitud: p.prestamo_state,
    }));
    if (formato === 'pdf') {
      this.exportarPDF(datos, columnas, 'Reporte de Préstamos de Libros', 'reporte_prestamos_libros');
    } else {
      this.exportarExcel(datos, columnas, 'Préstamos de Libros', 'reporte_prestamos_libros');
    }
  }

  exportarPrestamosDispositivos(prestamos: PrestamoDispositivo[], formato: FormatoReporte): void {
    const columnas = ['ID', 'Dispositivo', 'Usuario', 'Inicio', 'Fin', 'Estado'];
    const datos = prestamos.map((p) => ({
      ID: p.id,
      Dispositivo: p.dispositivo,
      Usuario: p.user,
      Inicio: p.fecha_prestamo ? new Date(p.fecha_prestamo).toLocaleString('es-CO') : 'N/A',
      Fin: p.fecha_devolucion ? new Date(p.fecha_devolucion).toLocaleString('es-CO') : 'No devuelto',
      Estado: p.estado,
    }));
    if (formato === 'pdf') {
      this.exportarPDF(datos, columnas, 'Reporte de Préstamos de Dispositivos', 'reporte_prestamos_dispositivos');
    } else {
      this.exportarExcel(datos, columnas, 'Préstamos de Dispositivos', 'reporte_prestamos_dispositivos');
    }
  }

  exportarIngresos(accesos: Acceso[], formato: FormatoReporte): void {
    const columnas = ['ID', 'Identificación', 'Nombre', 'Fecha y Hora', 'Mensaje', 'Estado'];
    const datos = accesos.map((a) => ({
      ID: a.id,
      Identificación: a.user_identificacion,
      Nombre: a.user_name,
      Fecha: a.created_at ? new Date(a.created_at).toLocaleString('es-CO') : 'N/A',
      Mensaje: a.message,
      Estado: a.status ? 'Permitido' : 'Denegado',
    }));
    if (formato === 'pdf') {
      this.exportarPDF(datos, columnas, 'Reporte de Ingresos a Biblioteca', 'reporte_ingresos');
    } else {
      this.exportarExcel(datos, columnas, 'Ingresos Biblioteca', 'reporte_ingresos');
    }
  }

  private _extraerFilas(datos: any[], columnas: string[]): any[][] {
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