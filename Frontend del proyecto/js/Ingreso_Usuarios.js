console.log("Archivo Ingreso_Usuarios.js cargado.");

        const URL = 'http://127.0.0.1:8000/api/library-access/';

        const tableBody = document.getElementById('accessLogTableBody');
        console.log("Elemento tableBody:", tableBody);

        const btnActivarLector = document.getElementById('btnActivarLector');
        console.log("Elemento btnActivarLector:", btnActivarLector);

        const btnDescargarExcel = document.getElementById('btnDescargarExcel');
        console.log("Elemento btnDescargarExcel:", btnDescargarExcel);

        // Variable global para almacenar los logs actuales
        let currentAccessLogs = [];

        function formatDateTime(dateTimeString) {
            if (!dateTimeString) return 'N/A';
            try {
                const date = new Date(dateTimeString);
                if (isNaN(date.getTime())) {
                    console.warn("Fecha inválida recibida:", dateTimeString);
                    return dateTimeString;
                }
                return date.toLocaleString('es-CO', { 
                    year: 'numeric', month: 'numeric', day: 'numeric',
                    hour: 'numeric', minute: 'numeric', second: 'numeric',
                    hour12: true 
                });
            } catch (error) {
                console.error("Error formateando fecha:", dateTimeString, error);
                return dateTimeString; 
            }
        }

        async function loadAccessLog() {
            console.log("Ejecutando loadAccessLog..."); 

            if (!tableBody) {
                console.error("Error CRÍTICO: No se encontró el elemento #accessLogTableBody al intentar cargar logs.");
                return;
            }

            console.log("Intentando fetch a:", URL);
            try {
                const response = await fetch(URL);
                console.log("Respuesta fetch recibida:", response.status, response.statusText); 

                if (!response.ok) {
                    let errorBody = "No hay detalles adicionales.";
                    try {
                        errorBody = await response.text();
                        console.error("Cuerpo de la respuesta de error:", errorBody);
                    } catch (e) {
                        console.warn("No se pudo leer el cuerpo de la respuesta de error.");
                    }
                    throw new Error(`Error HTTP ${response.status}: ${response.statusText}. ${errorBody}`);
                }

                const accessLogs = await response.json();
                console.log("Datos JSON parseados:", accessLogs);
                
                // Guardar los logs en la variable global
                currentAccessLogs = accessLogs;

                tableBody.innerHTML = '';

                if (!Array.isArray(accessLogs)) {
                    console.error("Error: La respuesta de la API no es an array:", accessLogs);
                    tableBody.innerHTML = '<tr><td colspan="6">Error: Formato de datos incorrecto recibido de la API.</td></tr>';
                    return;
                }

                if (accessLogs.length === 0) {
                    console.log("No hay registros de acceso para mostrar.");
                    tableBody.innerHTML = '<tr><td colspan="6">No hay registros de ingreso actualmente.</td></tr>';
                    return;
                }

                console.log(`Añadiendo ${accessLogs.length} fila(s) a la tabla.`);
                accessLogs.forEach((log, index) => {
                    console.log(`Procesando log ${index}:`, log);
                    const row = tableBody.insertRow();

                    row.insertCell().textContent = log.id ?? 'N/A';
                    row.insertCell().textContent = log.user_identificacion ?? 'N/A';
                    row.insertCell().textContent = log.user_name ?? 'Usuario Desconocido';
                    row.insertCell().textContent = formatDateTime(log.created_at);
                    row.insertCell().textContent = log.message ?? '';
                    row.insertCell().textContent = log.status ? 'Permitido' : 'Denegado';

                    if (log.status === false) {
                        row.classList.add('table-danger'); 
                    } else {
                        row.classList.add('table-success'); 
                    }
                });

            } catch (error) {
                console.error('Error DENTRO de loadAccessLog:', error); 
                if (tableBody) { 
                    tableBody.innerHTML = `<tr><td colspan="6" class="text-danger">Error al cargar datos: ${error.message}. Revisa la consola (F12) para más detalles.</td></tr>`;
                }
            }
        }

        // Función alternativa para descargar el reporte en CSV
        function downloadExcel() {
            if (!currentAccessLogs || currentAccessLogs.length === 0) {
                alert('No hay datos para descargar. Por favor, espere a que se carguen los registros.');
                return;
            }
            
            console.log("Iniciando descarga de CSV con", currentAccessLogs.length, "registros.");
            
            try {
                // Crear el contenido CSV de forma más simple
                let csvContent = "ID Acceso,Identificación Usuario,Nombre Usuario,Fecha y Hora,Mensaje,Estado\r\n";
                
                currentAccessLogs.forEach(log => {
                    const row = [
                        log.id || '',
                        log.user_identificacion || '',
                        `"${(log.user_name || 'Usuario Desconocido').replace(/"/g, '""')}"`,
                        `"${formatDateTime(log.created_at)}"`,
                        `"${(log.message || '').replace(/"/g, '""')}"`,
                        log.status ? 'Permitido' : 'Denegado'
                    ];
                    csvContent += row.join(',') + '\r\n';
                });
                
                // Crear el blob y el enlace de descarga - Método alternativo
                const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv; charset=utf-8;' });
                const url = window.URL.createObjectURL(blob);
                
                // Crear elemento de enlace temporal
                const tempLink = document.createElement('a');
                const date = new Date();
                const dateStr = date.toISOString().split('T')[0];
                const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
                
                tempLink.href = url;
                tempLink.setAttribute('download', `reporte_ingresos_${dateStr}_${timeStr}.csv`);
                tempLink.style.display = 'none';
                
                document.body.appendChild(tempLink);
                tempLink.click();
                
                // Limpiar
                setTimeout(function() {
                    document.body.removeChild(tempLink);
                    window.URL.revokeObjectURL(url);
                }, 100);
                
                console.log("Descarga de CSV completada.");
                
            } catch (error) {
                console.error("Error al generar el archivo CSV:", error);
                alert("Error al generar el archivo. Por favor, revise la consola para más detalles.");
            }
        }

        // Configurar event listeners cuando el DOM esté completamente cargado
        document.addEventListener('DOMContentLoaded', function() {
            console.log("Evento DOMContentLoaded disparado. Cargando datos iniciales..."); 
            
            if (!tableBody) {
                console.error("FALLO CRÍTICO: El elemento #accessLogTableBody no existe en el DOM cuando se disparó DOMContentLoaded.");
                return;
            }
            
            // Configurar el botón de descarga de Excel
            if (btnDescargarExcel) {
                btnDescargarExcel.addEventListener('click', downloadExcel);
                console.log("Event listener agregado al botón de descargar Excel.");
            } else {
                console.error('No se encontró el botón de descargar Excel');
            }
            
            // Configurar el botón de activar lector QR
            if (btnActivarLector) {
                btnActivarLector.addEventListener('click', () => {
                    const token = sessionStorage.getItem('jwt_token');

                    fetch('http://127.0.0.1:8000/api/iniciar-lector', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    })
                    .then(res => res.json())
                    .then(data => {
                        alert(data.mensaje);
                    })
                    .catch(err => {
                        console.error("Error:", err);
                        alert("No se pudo iniciar el lector QR.");
                    });
                });
            } else {
                console.error("Error: No se encontró el botón #btnActivarLector.");
            }
            
            // Cargar datos iniciales y configurar intervalo de actualización
            loadAccessLog(); 
            console.log("Configurando intervalo de actualización cada 5 segundos.");
            setInterval(loadAccessLog, 5000);
        });