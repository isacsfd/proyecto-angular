/**
 * reportes.js — Exportar reportes a PDF y Excel
 * ================================================
 * MEJORA 4: Exportar cualquier tabla a PDF (jsPDF) o Excel (SheetJS).
 *
 * DEPENDENCIAS — agrega estos scripts en el HTML ANTES de reportes.js:
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
 *
 * USO:
 *   exportarPDF(datos, columnas, titulo, nombreArchivo);
 *   exportarExcel(datos, columnas, titulo, nombreArchivo);
 *
 * EJEMPLO para ingresos QR:
 *   const columnas = ['ID', 'Identificación', 'Nombre', 'Fecha', 'Mensaje', 'Estado'];
 *   exportarPDF(currentAccessLogs, columnas, 'Reporte de Ingresos', 'ingresos');
 */

// ── PDF ───────────────────────────────────────────────────────────────────────
function exportarPDF(datos, columnas, titulo, nombreArchivo) {
    if (!datos || datos.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // ── Encabezado ────────────────────────────────────────────────────────────
    doc.setFillColor(13, 110, 253);          // Azul Bootstrap
    doc.rect(0, 0, 297, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Institución Universitaria de Barranquilla — IUB', 14, 10);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Sistema de Gestión Biblioteca`, 14, 17);

    // ── Título del reporte ────────────────────────────────────────────────────
    doc.setTextColor(33, 37, 41);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo, 14, 32);

    // ── Fecha de generación ───────────────────────────────────────────────────
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(108, 117, 125);
    const fechaGeneracion = new Date().toLocaleString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Generado el: ${fechaGeneracion}`, 14, 38);

    // ── Tabla ─────────────────────────────────────────────────────────────────
    const filas = _extraerFilas(datos, columnas);

    doc.autoTable({
        head: [columnas],
        body: filas,
        startY: 44,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [13, 110, 253], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        tableLineColor: [222, 226, 230],
        tableLineWidth: 0.1,
    });

    // ── Pie de página ─────────────────────────────────────────────────────────
    const totalPaginas = doc.internal.getNumberOfPages();
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

// ── Excel ─────────────────────────────────────────────────────────────────────
function exportarExcel(datos, columnas, titulo, nombreArchivo) {
    if (!datos || datos.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const filas = _extraerFilas(datos, columnas);

    // Fila de encabezado con título institucional
    const hoja = XLSX.utils.aoa_to_sheet([
        [`Institución Universitaria de Barranquilla — ${titulo}`],
        [`Generado el: ${new Date().toLocaleString('es-CO')}`],
        [],
        columnas,
        ...filas
    ]);

    // Ancho de columnas automático
    hoja['!cols'] = columnas.map(() => ({ wch: 22 }));

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, titulo.substring(0, 31));

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(libro, `${nombreArchivo}_${fecha}.xlsx`);
}

// ── Helper interno: extrae filas según las claves de los objetos ──────────────
function _extraerFilas(datos, columnas) {
    // Intenta mapear las columnas a las claves del objeto usando posición
    return datos.map(item => {
        const valores = Object.values(item);
        // Si hay más columnas que valores, rellenar con vacío
        return columnas.map((_, i) => {
            const val = valores[i];
            if (val === null || val === undefined) return '';
            if (typeof val === 'boolean') return val ? 'Permitido' : 'Denegado';
            return String(val);
        });
    });
}

/**
 * Función específica para exportar la tabla de ingresos QR.
 * Llámala directamente desde el botón de exportar en Ingreso_Usuarios.html
 *
 * @param {Array}  logs   — Array de objetos de acceso (currentAccessLogs)
 * @param {string} formato — 'pdf' o 'excel'
 */
function exportarIngresos(logs, formato) {
    const columnas = ['ID', 'Identificación', 'Nombre', 'Fecha y Hora', 'Mensaje', 'Estado'];
    const datosFormateados = logs.map(log => ({
        id: log.id,
        identificacion: log.user_identificacion,
        nombre: log.user_name,
        fecha: log.created_at ? new Date(log.created_at).toLocaleString('es-CO') : 'N/A',
        mensaje: log.message,
        estado: log.status ? 'Permitido' : 'Denegado',
    }));

    if (formato === 'pdf') {
        exportarPDF(datosFormateados, columnas, 'Reporte de Ingresos a Biblioteca', 'reporte_ingresos');
    } else {
        exportarExcel(datosFormateados, columnas, 'Ingresos Biblioteca', 'reporte_ingresos');
    }
}

/**
 * Función específica para exportar la tabla de préstamos de dispositivos.
 *
 * @param {Array}  prestamos — Array de préstamos (currentPrestamos)
 * @param {string} formato   — 'pdf' o 'excel'
 */
function exportarPrestamos(prestamos, formato) {
    const columnas = ['ID', 'Dispositivo', 'Usuario', 'Fecha Préstamo', 'Fecha Devolución', 'Estado'];
    const datosFormateados = prestamos.map(p => ({
        id: p.id,
        dispositivo: p.dispositivo,
        usuario: p.user,
        fechaPrestamo: p.fecha_prestamo ? new Date(p.fecha_prestamo).toLocaleString('es-CO') : 'N/A',
        fechaDevolucion: p.fecha_devolucion ? new Date(p.fecha_devolucion).toLocaleString('es-CO') : 'No devuelto',
        estado: p.estado,
    }));

    if (formato === 'pdf') {
        exportarPDF(datosFormateados, columnas, 'Reporte de Préstamos de Dispositivos', 'reporte_prestamos');
    } else {
        exportarExcel(datosFormateados, columnas, 'Préstamos Dispositivos', 'reporte_prestamos');
    }
}