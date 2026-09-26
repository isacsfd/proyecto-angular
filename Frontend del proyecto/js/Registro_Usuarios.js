const URL = "http://127.0.0.1:8000/"; // Asegúrate que esta URL sea correcta para tu backend

document.addEventListener('DOMContentLoaded', async function() {
    console.log("DOM cargado, iniciando aplicación...");
    
    try {
        // Mostrar estado de carga
        showLoadingState(true);
        
        // Cargar usuarios desde la API
        await loadUsers();
        
        // Configurar funcionalidades
        setupSearch();
        setupFilters();
        setupPagination();
        setupColumnSorting();
        
        console.log("Aplicación inicializada correctamente");
    } catch (error) {
        console.error("Error al inicializar la aplicación:", error);
        showAlert(`Error al cargar la aplicación: ${error.message}`, 'danger');
    } finally {
        showLoadingState(false);
    }
});

// Función para mostrar/ocultar estado de carga
function showLoadingState(show) {
    const loadingElement = document.getElementById('loadingIndicator');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

// Función principal para cargar usuarios
async function loadUsers() {
    try {
        console.log("Cargando usuarios desde la API...");
        
        const response = await fetch(`${URL}usuarios/`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('La respuesta no es JSON válido');
        }
        
        const users = await response.json();
        console.log("Usuarios recibidos:", users);
        
        if (!Array.isArray(users)) {
            throw new Error('La respuesta no contiene un array de usuarios');
        }
        
        if (users.length === 0) {
            showAlert('No hay usuarios registrados en el sistema', 'warning');
        }
        
        populateUserTable(users);
        
    } catch (error) {
        console.error("Error en loadUsers:", error);
        
        // Mostrar mensaje de error en la interfaz
        const errorContainer = document.createElement('div');
        errorContainer.className = 'alert alert-danger mt-3';
        errorContainer.innerHTML = `
            <h5>Error al cargar usuarios</h5>
            <p>${error.message}</p>
            <button class="btn btn-sm btn-primary" onclick="window.location.reload()">
                Reintentar
            </button>
        `;
        
        const tableContainer = document.querySelector('.table-responsive');
        if (tableContainer) {
            tableContainer.parentNode.insertBefore(errorContainer, tableContainer.nextSibling);
        }
        
        throw error; // Relanzar para manejo superior
    }
}

// Función para mostrar usuarios en la tabla
function populateUserTable(users) {
    const tbody = document.querySelector('tbody');
    if (!tbody) {
        throw new Error("No se encontró el elemento tbody");
    }
    
    tbody.innerHTML = '';
    
    if (users.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="6" class="text-center py-4">
                <i class="bi bi-exclamation-circle fs-1 text-muted"></i>
                <p class="mt-2">No se encontraron usuarios</p>
            </td>
        `;
        tbody.appendChild(emptyRow);
        return;
    }
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <th scope="row">${displayValue(user.id)}</th>
            <td>${displayValue(user.identificacion)}</td>
            <td>${displayValue(user.nombre)}</td>
            <td><span class="badge ${getTipoUsuarioClass(user.rol)}">${displayValue(user.rol)}</span></td>
            <td>${displayValue(user.email)}</td>
            <td>
                <button class="btn btn-info text-white btn-sm view-user-btn" data-user-id="${user.id}">
                    <i class="bi bi-eye"></i> Detalles
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Configurar event listeners para los botones de visualización
    setupViewButtons();
}

// Configurar botones de visualización
function setupViewButtons() {
    document.querySelectorAll('.view-user-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.getAttribute('data-user-id');
            try {
                showLoadingState(true);
                await viewUserDetails(userId);
            } catch (error) {
                console.error("Error al ver detalles:", error);
                showAlert(`Error al cargar detalles: ${error.message}`, 'danger');
            } finally {
                showLoadingState(false);
            }
        });
    });
}

// Ver detalles de un usuario específico
async function viewUserDetails(userId) {
    try {
        console.log(`Cargando detalles del usuario ${userId}...`);
        
        const response = await fetch(`${URL}usuarios/${userId}`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        
        const user = await response.json();
        console.log("Detalles del usuario:", user);
        
        showUserModal(user);
        
    } catch (error) {
        console.error("Error en viewUserDetails:", error);
        throw error;
    }
}

// Mostrar modal con detalles del usuario
function showUserModal(user) {
    // Crear contenido del modal
    const modalContent = `
    <div class="modal fade" id="userModal" tabindex="-1" aria-labelledby="userModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title" id="userModalLabel">Detalles del Usuario</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="container-fluid">
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>ID:</strong> ${displayValue(user.id)}</p>
                                <p><strong>Nombre Completo:</strong> ${displayValue(user.nombre)}</p>
                                <p><strong>Username:</strong> ${displayValue(user.username)}</p>
                                <p><strong>Email:</strong> ${displayValue(user.email)}</p>
                                <p><strong>Teléfono:</strong> ${displayValue(user.phone)}</p>
                            </div>
                            <div class="col-md-6">
                                <p><strong>Rol:</strong> <span class="badge ${getTipoUsuarioClass(user.rol)}">${displayValue(user.rol)}</span></p>
                                <p><strong>Identificación:</strong> ${displayValue(user.identificacion)}</p>
                                <p><strong>Dirección:</strong> ${displayValue(user.address)}</p>
                                <p><strong>Nivel Académico:</strong> ${displayValue(user.nivel_academico)}</p>
                                <p><strong>Carrera/Área:</strong> ${displayValue(user.carrera)}</p>
                            </div>
                        </div>
                        ${user.rol && ['Estudiante', 'Docente'].includes(user.rol) ? `
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                </div>
            </div>
        </div>
    </div>
    `;

    // Insertar o actualizar el modal
    const existingModal = document.getElementById('userModal');
    if (existingModal) {
        existingModal.remove();
    }
    document.body.insertAdjacentHTML('beforeend', modalContent);

    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    modal.show();
}

// Funciones auxiliares

function getTipoUsuarioClass(tipo) {
    const tipos = {
        'Administrador': 'bg-danger',
        'Estudiante': 'bg-success',
        'Funcionario': 'bg-primary',
        'Docente': 'bg-warning'
    };
    return tipos[tipo] || 'bg-secondary';
}

function formatDate(dateString) {
    if (!dateString) return 'No especificado';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        console.error("Error formateando fecha:", e);
        return dateString; // Devuelve el valor original si no se puede parsear
    }
}

function displayValue(value) {
    if (value === undefined || value === null || value === '') {
        return 'No especificado';
    }
    return value;
}

// Funciones de búsqueda y filtrado

function setupSearch() {
}

function setupFilters() {
    const filterButton = document.getElementById('filterButton');
    if (filterButton) {
        filterButton.addEventListener('click', applyFilters);
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
    const tipoUsuario = document.getElementById('filterType')?.value || '';
    
    document.querySelectorAll('tbody tr').forEach(row => {
        const rowText = row.textContent.toLowerCase();
        const rowTipo = row.cells[3].textContent.trim().toLowerCase();
        
        // Verificar búsqueda
        const matchesSearch = !searchTerm || rowText.includes(searchTerm);
        
        // Verificar tipo de usuario
        let matchesTipo = true;
        if (tipoUsuario) {
            const tipoMap = {
                'admin': 'administrador',
                'est': 'estudiante',
                'fun': 'funcionario',
                'doc': 'docente'
            };
            
            const tipoBuscado = tipoMap[tipoUsuario.toLowerCase()] || tipoUsuario.toLowerCase();
            matchesTipo = rowTipo.includes(tipoBuscado);
        }
        
        row.style.display = (matchesSearch && matchesTipo) ? '' : 'none';
    });

    if (document.querySelector('.pagination')) {
        setupPagination();
    }
}

// Funciones de paginación

function setupPagination() {
    const existingPagination = document.querySelector('.pagination');
    if (existingPagination) existingPagination.remove();

    const rows = Array.from(document.querySelectorAll('tbody tr')).filter(row => 
        row.style.display !== 'none'
    );

    if (rows.length <= 5) {
        rows.forEach(row => row.style.display = '');
        return;
    }

    const pageCount = Math.ceil(rows.length / 5);
    const paginationList = document.createElement('ul');
    paginationList.className = 'pagination justify-content-center';

    // Botón Anterior (agrega clase 'disabled' si es la primera página)
    const prevItem = document.createElement('li');
    prevItem.className = 'page-item';
    const prevLink = document.createElement('a');
    prevLink.className = 'page-link';
    prevLink.href = '#';
    prevLink.innerHTML = '&laquo;';
    prevLink.addEventListener('click', (e) => {
        e.preventDefault();
        const activePage = document.querySelector('.pagination .active');
        if (activePage?.previousElementSibling?.classList?.contains('page-item')) {
            const pageNum = parseInt(activePage.previousElementSibling.textContent);
            if (pageNum) showPage(pageNum, rows);
        }
    });
    prevItem.appendChild(prevLink);
    paginationList.appendChild(prevItem);

    // Números de página (asegura clases 'page-item' y 'page-link')
    for (let i = 1; i <= pageCount; i++) {
        const pageItem = document.createElement('li');
        pageItem.className = `page-item ${i === 1 ? 'active' : ''}`; // Clase 'active' para la primera página
        const pageLink = document.createElement('a');
        pageLink.className = 'page-link';
        pageLink.href = '#';
        pageLink.textContent = i;
        pageLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPage(i, rows);
        });
        pageItem.appendChild(pageLink);
        paginationList.appendChild(pageItem);
    }

    // Botón Siguiente
    const nextItem = document.createElement('li');
    nextItem.className = 'page-item';
    const nextLink = document.createElement('a');
    nextLink.className = 'page-link';
    nextLink.href = '#';
    nextLink.innerHTML = '&raquo;';
    nextLink.addEventListener('click', (e) => {
        e.preventDefault();
        const activePage = document.querySelector('.pagination .active');
        if (activePage?.nextElementSibling?.classList?.contains('page-item')) {
            const pageNum = parseInt(activePage.nextElementSibling.textContent);
            if (pageNum) showPage(pageNum, rows);
        }
    });
    nextItem.appendChild(nextLink);
    paginationList.appendChild(nextItem);

    // Asegúrate de que el contenedor exista
    const paginationContainer = document.querySelector('.pagination-container nav');
    if (paginationContainer) {
        paginationContainer.appendChild(paginationList);
    }

    showPage(1, rows);
}

function showPage(page, rows) {
    const start = (page - 1) * 5;
    const end = start + 5;

    rows.forEach((row, index) => {
        row.style.display = (index >= start && index < end) ? '' : 'none';
    });

    document.querySelectorAll('.pagination .page-item').forEach((item, idx) => {
        if (idx > 0 && idx < document.querySelectorAll('.pagination .page-item').length - 1) {
            const pageNum = parseInt(item.textContent);
            item.classList.toggle('active', pageNum === page);
        }
    });
}

// Ordenación por columnas

function setupColumnSorting() {
    document.querySelectorAll('th[scope="col"]').forEach(header => {
        header.style.cursor = 'pointer';
        header.addEventListener('click', function() {
            const columnIndex = this.cellIndex;
            const isNumericColumn = ['id'].includes(this.textContent.toLowerCase());
            const table = this.closest('table');
            const rows = Array.from(table.querySelectorAll('tbody tr')).filter(row => 
                row.style.display !== 'none'
            );

            document.querySelectorAll('th[scope="col"]').forEach(h => {
                h.classList.remove('asc', 'desc');
            });

            let isAscending;
            if (this.classList.contains('asc')) {
                this.classList.remove('asc');
                this.classList.add('desc');
                isAscending = false;
            } else if (this.classList.contains('desc')) {
                this.classList.remove('desc');
                isAscending = null;
            } else {
                this.classList.add('asc');
                isAscending = true;
            }

            if (isAscending !== null) {
                rows.sort((a, b) => {
                    const aText = a.cells[columnIndex].textContent.trim();
                    const bText = b.cells[columnIndex].textContent.trim();

                    if (isNumericColumn) {
                        return isAscending
                            ? (parseInt(aText) || 0) - (parseInt(bText) || 0)
                            : (parseInt(bText) || 0) - (parseInt(aText) || 0);
                    } else {
                        return isAscending
                            ? aText.localeCompare(bText)
                            : bText.localeCompare(aText);
                    }
                });
            } else {
                rows.sort((a, b) => parseInt(a.cells[0].textContent) - parseInt(b.cells[0].textContent));
            }

            const tbody = table.querySelector('tbody');
            rows.forEach(row => tbody.appendChild(row));

            if (document.querySelector('.pagination')) {
                const activePage = document.querySelector('.pagination .active');
                if (activePage) showPage(parseInt(activePage.textContent), rows);
            }
        });
    });
}

// Mostrar alertas

function showAlert(message, type) {
    const existingAlert = document.querySelector('.custom-alert');
    if (existingAlert) existingAlert.remove();

    const alert = document.createElement('div');
    alert.className = `custom-alert alert alert-${type} fixed-top w-50 mx-auto mt-5 text-center`;
    alert.style.zIndex = '2000';
    alert.innerHTML = `
        <div>${message}</div>
        <button type="button" class="btn-close" onclick="this.parentElement.remove()" aria-label="Close"></button>
    `;

    document.body.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Agregar polyfill para navegadores antiguos (opcional)
if (!String.prototype.includes) {
    String.prototype.includes = function(search, start) {
        'use strict';
        if (typeof start !== 'number') {
            start = 0;
        }
        
        if (start + search.length > this.length) {
            return false;
        } else {
            return this.indexOf(search, start) !== -1;
        }
    };
}