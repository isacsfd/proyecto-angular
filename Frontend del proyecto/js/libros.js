const URL = "http://127.0.0.1:8000/";

document.addEventListener('DOMContentLoaded', async function () {
    setupSearch();
    setupFilters();
    setupFormValidation();
    setupCRUD();
    setupPagination();
    setupColumnSorting();
    await loadBooks();
    setupExport();
});


function setupSearch() {
    const searchForm = document.querySelector('form.d-flex');
    if (searchForm) {
        searchForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const searchInput = document.querySelector('input[placeholder="Buscar registro"]');
            const searchTerm = searchInput.value.trim().toLowerCase();
            const rows = document.querySelectorAll('tbody tr');

            rows.forEach(row => {
                const rowText = row.textContent.toLowerCase();
                row.style.display = rowText.includes(searchTerm) ? '' : 'none';
            });

            if (document.querySelector('.pagination')) {
                setupPagination();
            }
        });
    }
}


function setupFilters() {
    const filterButton = document.getElementById('filterBtn');
    if (filterButton) {
        filterButton.addEventListener('click', applyFilters);
    }
}

function applyFilters() {
    const autor = document.getElementById('autores')?.value || '';
    const anio = document.getElementById('anio')?.value || '';
    const virtual = document.getElementById('virtual')?.value || '';


    if (!autor && !anio && !virtual) {
        document.querySelectorAll('tbody tr').forEach(row => {
            row.style.display = '';
        });
        if (document.querySelector('.pagination')) {
            setupPagination();
        }
        return;
    }

    document.querySelectorAll('tbody tr').forEach(row => {
        const rowData = {
            autor: row.cells[2].textContent.trim().toLowerCase(),
            anio: row.cells[4].textContent.trim(),
            virtual: row.cells[6].textContent.trim().toLowerCase()
        };

        const matchesAutor = !autor || rowData.autor.includes(autor.toLowerCase());
        const matchesAnio = !anio || rowData.anio === anio;
        const matchesVirtual = !virtual || 
            (virtual === 'si' && rowData.virtual === 'sí') || 
            (virtual === 'no' && rowData.virtual === 'no');

        row.style.display = (matchesAutor && matchesAnio && matchesVirtual) ? '' : 'none';
    });

    if (document.querySelector('.pagination')) {
        setupPagination();
    }
}

function setupFormValidation() {
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function (e) {
            const searchInput = document.querySelector('input[placeholder="Buscar registro"]');
            if (searchInput && searchInput.value.trim() === '') {
                e.preventDefault();
                showAlert('Por favor ingrese un término de búsqueda', 'warning');
                searchInput.focus();
            }
        });
    }
}


function setupCRUD() {
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('bi-trash3')) {
            const row = e.target.closest('tr');
            const bookId = row.querySelector('th').textContent;
            deleteBook(bookId, row);
        }
        if (e.target.classList.contains('bi-pencil-square')) {
            const row = e.target.closest('tr');
            const bookId = row.querySelector('th').textContent;
            openEditModal(bookId);
        } else if (e.target.classList.contains('bi-eye')) {
            const bookId = e.target.closest('.view-btn').getAttribute('data-id');
            viewBookDetails(bookId);
        }
    });
}

async function openEditModal(bookId) {
    try {
        const response = await fetch(`${URL}libros/${bookId}`);
        if (!response.ok) {
            throw new Error('Libro no encontrado');
        }
        const book = await response.json();
        

        document.getElementById('editBookId').value = book.ID;
        document.getElementById('editAutor').value = book.Autor;
        document.getElementById('editTitulo').value = book.Titulo;
        document.getElementById('editPrograma').value = book.Programa;
        document.getElementById('editItem').value = book.Item;
        document.getElementById('editSignatura').value = book.Signatura;
        document.getElementById('editAreas').value = book.Areas;
        document.getElementById('editEjemplar').value = book.Ejemplar;
        document.getElementById('editEditorial').value = book.Editorial;
        document.getElementById('editAnio').value = book.Año;
        document.getElementById('editIdioma').value = book.Idioma;
        document.getElementById('editObservaciones').value = book.Observaciones || '';
        document.getElementById('editPrecio').value = book.Precio || '';
        document.getElementById('editProveedor').value = book.Proveedor || '';
        document.getElementById('editRegistroLinea').value = book.Registro_en_linea || '';
        

        document.getElementById('saveEditBtn').onclick = () => saveBookChanges(bookId);
        

        const editModal = new bootstrap.Modal(document.getElementById('editBookModal'));
        editModal.show();
        
    } catch (error) {
        console.error('Error al cargar libro para editar:', error);
        showAlert('Error al cargar el libro para editar', 'danger');
    }
}


async function saveBookChanges(originalBookId) {
    const form = document.getElementById('editBookForm');
    const bookId = document.getElementById('editBookId').value;
    
    if (!validateEditForm()) {
        return;
    }

    const bookData = {
        Autor: document.getElementById('editAutor').value.trim(),
        Titulo: document.getElementById('editTitulo').value.trim(),
        Programa: document.getElementById('editPrograma').value.trim(),
        Item: parseInt(document.getElementById('editItem').value.trim()),
        Signatura: document.getElementById('editSignatura').value.trim(),
        Areas: parseInt(document.getElementById('editAreas').value.trim()),
        Ejemplar: parseInt(document.getElementById('editEjemplar').value.trim()),
        Editorial: document.getElementById('editEditorial').value.trim(),
        Año: parseInt(document.getElementById('editAnio').value.trim()),
        Idioma: document.getElementById('editIdioma').value.trim(),
        Observaciones: document.getElementById('editObservaciones').value.trim() || null,
        Precio: document.getElementById('editPrecio').value.trim() || null,
        Proveedor: document.getElementById('editProveedor').value.trim() || null,
        Registro_en_linea: document.getElementById('editRegistroLinea').value || null
    };

    try {
        showLoading(true, '#saveEditBtn');
        
        const response = await fetch(`${URL}libros/${bookId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Error al actualizar el libro');
        }

        const updatedBook = await response.json();
        showAlert('success', 'Libro actualizado correctamente');
        

        const editModal = bootstrap.Modal.getInstance(document.getElementById('editBookModal'));
        editModal.hide();
        

        await loadBooks();
        
    } catch (error) {
        console.error('Error al actualizar libro:', error);
        showAlert('danger', `Error al actualizar: ${error.message}`);
    } finally {
        showLoading(false, '#saveEditBtn');
    }
}


function validateEditForm() {
    const requiredFields = [
        'editAutor', 'editTitulo', 'editPrograma', 'editItem',
        'editSignatura', 'editAreas', 'editEjemplar',
        'editEditorial', 'editAnio', 'editIdioma'
    ];

    let isValid = true;

    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            markFieldAsInvalid(field, `El campo es obligatorio`);
            isValid = false;
        } else if (['editItem', 'editAreas', 'editEjemplar', 'editAnio'].includes(fieldId)) {
            if (isNaN(field.value.trim())) {
                markFieldAsInvalid(field, `Debe ser un número`);
                isValid = false;
            }
        }
    });

    return isValid;
}


function markFieldAsInvalid(field, message) {
    field.classList.add('is-invalid');
    
    let feedback = field.nextElementSibling;
    if (!feedback || !feedback.classList.contains('invalid-feedback')) {
        feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        field.parentNode.appendChild(feedback);
    }
    feedback.textContent = message;
}


function showLoading(show, selector = null) {
    const button = selector ? document.querySelector(selector) : document.querySelector('#libroForm button[type="submit"]');
    if (button) {
        if (show) {
            button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Procesando...';
            button.disabled = true;
        } else {
            const originalText = selector === '#saveEditBtn' ? 'Guardar Cambios' : 'Guardar';
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }
}


async function deleteBook(bookId, rowElement) {
    try {

        const isConfirmed = await showDeleteConfirmation();
        if (!isConfirmed) return;

        showAlert('Eliminando libro...', 'info');

        const response = await fetch(`${URL}libros/${bookId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Error al eliminar el libro');
        }


        rowElement.remove();
        showAlert('Libro eliminado correctamente', 'success');
        

        if (document.querySelector('.pagination')) {
            setupPagination();
        }

    } catch (error) {
        console.error('Error al eliminar libro:', error);
        showAlert(`Error al eliminar libro: ${error.message}`, 'danger');
    }
}


function showDeleteConfirmation() {
    return new Promise((resolve) => {

        if (!document.getElementById('deleteConfirmationModal')) {
            const modalHTML = `
            <div class="modal fade" id="deleteConfirmationModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-danger text-white">
                            <h5 class="modal-title">Confirmar eliminación</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>¿Está seguro que desea eliminar este libro permanentemente?</p>
                            <p class="fw-bold">Esta acción no se puede deshacer.</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-danger" id="confirmDeleteBtn">
                                <i class="bi bi-trash3"></i> Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        const modal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'));
        modal.show();


        const confirmBtn = document.getElementById('confirmDeleteBtn');
        confirmBtn.onclick = () => {
            modal.hide();
            resolve(true);
        };


        const modalElement = document.getElementById('deleteConfirmationModal');
        modalElement.addEventListener('hidden.bs.modal', () => {
            resolve(false);
        });
    });
}


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

    const pageCount = Math.ceil(rows.length / 25);
    const paginationContainer = document.querySelector('.pagination-container');
    const paginationList = document.createElement('ul');
    paginationList.className = 'pagination';


    const prevItem = document.createElement('li');
    prevItem.className = 'page-item';
    const prevLink = document.createElement('a');
    prevLink.className = 'page-link';
    prevLink.href = '#';
    prevLink.innerHTML = '&laquo;';
    prevLink.addEventListener('click', (e) => {
        e.preventDefault();
        const activePage = document.querySelector('.pagination .active');
        if (activePage && activePage.previousElementSibling && activePage.previousElementSibling.classList.contains('page-item')) {
            const pageNum = parseInt(activePage.previousElementSibling.textContent);
            if (pageNum) showPage(pageNum, rows);
        }
    });
    prevItem.appendChild(prevLink);
    paginationList.appendChild(prevItem);


    for (let i = 1; i <= pageCount; i++) {
        const pageItem = document.createElement('li');
        pageItem.className = `page-item ${i === 1 ? 'active' : ''}`;
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


    const nextItem = document.createElement('li');
    nextItem.className = 'page-item';
    const nextLink = document.createElement('a');
    nextLink.className = 'page-link';
    nextLink.href = '#';
    nextLink.innerHTML = '&raquo;';
    nextLink.addEventListener('click', (e) => {
        e.preventDefault();
        const activePage = document.querySelector('.pagination .active');
        if (activePage && activePage.nextElementSibling && activePage.nextElementSibling.classList.contains('page-item')) {
            const pageNum = parseInt(activePage.nextElementSibling.textContent);
            if (pageNum) showPage(pageNum, rows);
        }
    });
    nextItem.appendChild(nextLink);
    paginationList.appendChild(nextItem);


    paginationContainer.innerHTML = '';
    paginationContainer.appendChild(paginationList);
    showPage(1, rows);
}

function showPage(page, rows) {
    const start = (page - 1) * 25;
    const end = start + 25;

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


function setupColumnSorting() {
    document.querySelectorAll('th[scope="col"]').forEach(header => {
        header.style.cursor = 'pointer';
        header.addEventListener('click', function () {
            const columnIndex = this.cellIndex;
            const isNumericColumn = ['id', 'año'].includes(this.textContent.toLowerCase());
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


async function loadBooks() {
    const requestOptions = {method: "GET"};

    try {
        const response = await fetch(`${URL}libros`, requestOptions);
        const data = await response.json();

        data.sort((a, b) => a.ID - b.ID);
        populateTable(data);
    } catch (error) {
        console.error('Error al obtener libros:', error);
        showAlert('Error al cargar los libros', 'danger');
        return [];
    }
}


function formatTextWithLineBreaks(text, maxLength = 20) {
    if (!text) return '';
    
    let result = '';
    let currentLine = '';
    
    const words = text.split(' ');
    for (const word of words) {
        if (currentLine.length + word.length + 1 <= maxLength) {
            currentLine += (currentLine ? ' ' : '') + word;
        } else {
            result += (result ? '<br>' : '') + currentLine;
            currentLine = word;
        }
    }
    
    if (currentLine) {
        result += (result ? '<br>' : '') + currentLine;
    }
    
    return result;
}


function populateTable(books) {
    const tbody = document.querySelector('tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    books.forEach(book => {
        const row = document.createElement('tr');
        const formattedTitle = formatTextWithLineBreaks(book.Titulo);
        const virtualStatus = book.Registro_en_linea ? 'Sí' : 'No';

        row.innerHTML = `
            <th scope="row" class="text-start">${book.ID}</th>
            <td class="text-start title-cell">${formattedTitle}</td>
            <td class="text-start">${book.Autor}</td>
            <td class="text-start">${book.Ejemplar}</td>
            <td class="text-start">${book.Año}</td>
            <td class="text-start">${book.Idioma}</td>
            <td class="text-start">${virtualStatus}</td>
            <td class="text-start">
                <button class="btn btn-primary text-white ms-2 edit-btn" style="height: 38px;" data-id="${book.ID}">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-danger text-white ms-2" style="height: 38px;">
                    <i class="bi bi-trash3"></i>
                </button>
                <button class="btn btn-info text-white ms-2 view-btn" style="height: 38px;" data-id="${book.ID}">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });


    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const bookId = btn.getAttribute('data-id');
            openEditModal(bookId);
        });
    });

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const bookId = btn.getAttribute('data-id');
            viewBookDetails(bookId);
        });
    });

    loadFilterOptions(books);
    setupPagination();
}

async function viewBookDetails(bookId) {
    try {
        const response = await fetch(`${URL}libros/${bookId}`);
        if (!response.ok) {
            throw new Error('Libro no encontrado');
        }
        const book = await response.json();
        

        showBookModal(book);
    } catch (error) {
        console.error('Error al obtener detalles del libro:', error);
        showAlert('Error al cargar los detalles del libro', 'danger');
    }
}

function showBookModal(book) {

    if (!document.getElementById('bookModal')) {
        const modalHTML = `
        <div class="modal fade" id="bookModal" tabindex="-1" aria-labelledby="bookModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="bookModalLabel">Detalles del Libro</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="container-fluid">
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>ID:</strong> <span id="modalBookId">${book.ID}</span></p>
                                    <p><strong>Título:</strong> <span id="modalBookTitle">${book.Titulo}</span></p>
                                    <p><strong>Autor:</strong> <span id="modalBookAuthor">${book.Autor}</span></p>
                                    <p><strong>Programa:</strong> <span id="modalBookProgram">${book.Programa}</span></p>
                                    <p><strong>Item:</strong> <span id="modalBookItem">${book.Item}</span></p>
                                    <p><strong>Signatura:</strong> <span id="modalBookSign">${book.Signatura}</span></p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>Áreas:</strong> <span id="modalBookAreas">${book.Areas}</span></p>
                                    <p><strong>Ejemplares:</strong> <span id="modalBookCopies">${book.Ejemplar}</span></p>
                                    <p><strong>Editorial:</strong> <span id="modalBookEditorial">${book.Editorial}</span></p>
                                    <p><strong>Año:</strong> <span id="modalBookYear">${book.Año}</span></p>
                                    <p><strong>Idioma:</strong> <span id="modalBookLanguage">${book.Idioma}</span></p>
                                    <p><strong>Virtual:</strong> <span id="modalBookVirtual">${book.Registro_en_linea ? 'Sí' : 'No'}</span></p>
                                </div>
                            </div>
                            <div class="row mt-3">
                                <div class="col-12">
                                    <p><strong>Observaciones:</strong> <span id="modalBookObservations">${book.Observaciones || 'N/A'}</span></p>
                                    <p><strong>Precio:</strong> <span id="modalBookPrice">${book.Precio || 'N/A'}</span></p>
                                    <p><strong>Proveedor:</strong> <span id="modalBookProvider">${book.Proveedor || 'N/A'}</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }


    document.getElementById('modalBookId').textContent = book.ID;
    document.getElementById('modalBookTitle').textContent = book.Titulo;
    document.getElementById('modalBookAuthor').textContent = book.Autor;
    document.getElementById('modalBookProgram').textContent = book.Programa;
    document.getElementById('modalBookItem').textContent = book.Item;
    document.getElementById('modalBookSign').textContent = book.Signatura;
    document.getElementById('modalBookAreas').textContent = book.Areas;
    document.getElementById('modalBookCopies').textContent = book.Ejemplar;
    document.getElementById('modalBookEditorial').textContent = book.Editorial;
    document.getElementById('modalBookYear').textContent = book.Año;
    document.getElementById('modalBookLanguage').textContent = book.Idioma;
    document.getElementById('modalBookVirtual').textContent = book.Registro_en_linea ? 'Sí' : 'No';
    document.getElementById('modalBookObservations').textContent = book.Observaciones || 'N/A';
    document.getElementById('modalBookPrice').textContent = book.Precio || 'N/A';
    document.getElementById('modalBookProvider').textContent = book.Proveedor || 'N/A';


    const modal = new bootstrap.Modal(document.getElementById('bookModal'));
    modal.show();
}


function loadFilterOptions(books) {

    const autoresSelect = document.getElementById('autores');
    if (autoresSelect) {
        autoresSelect.innerHTML = '<option value="">Autores</option>';
        const autores = [...new Set(books.map(book => book.Autor))];
        autores.forEach(autor => {
            const option = document.createElement('option');
            option.value = autor;
            option.textContent = autor;
            autoresSelect.appendChild(option);
        });
    }


    const anioSelect = document.getElementById('anio');
    if (anioSelect) {
        anioSelect.innerHTML = '<option value="">Año</option>';
        const years = [...new Set(books.map(book => book.Año))].sort((a, b) => b - a);
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            anioSelect.appendChild(option);
        });
    }
}


function setupExport() {
    if (!document.getElementById('exportBtn')) {
        const exportBtn = document.createElement('button');
        exportBtn.id = 'exportBtn';
        exportBtn.className = 'btn acp text-white ms-2';
        exportBtn.style.height = '38px';
        exportBtn.innerHTML = '<i class="bi bi-download"></i> Exportar';
        exportBtn.addEventListener('click', exportToCSV);

        const searchContainer = document.querySelector('.search-container');
        if (searchContainer) {
            searchContainer.appendChild(exportBtn);
        }
    }
}

function exportToCSV() {

    showAlert('Generando archivo CSV...', 'info');
    

    fetch(`${URL}libros`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al obtener los datos');
            }
            return response.json();
        })
        .then(books => {

            books.sort((a, b) => a.ID - b.ID);
            
            let csvContent = "data:text/csv;charset=utf-8,";
            

            const headers = [
                "ID", "Autor", "Título", "Programa", "Item", 
                "Signatura", "Areas", "Ejemplar", "Editorial", 
                "Año", "Idioma", "Observaciones", "Precio", 
                "Proveedor", "Registro_en_linea"
            ];
            csvContent += headers.join(",") + "\r\n";


            books.forEach(book => {
                const virtualStatus = book.Registro_en_linea ? 'Sí' : 'No';
                const rowData = [
                    book.ID,
                    `"${book.Autor.replace(/"/g, '""')}"`,
                    `"${book.Titulo.replace(/"/g, '""')}"`,
                    `"${book.Programa.replace(/"/g, '""')}"`,
                    book.Item,
                    `"${book.Signatura.replace(/"/g, '""')}"`,
                    book.Areas,
                    book.Ejemplar,
                    `"${book.Editorial.replace(/"/g, '""')}"`,
                    book.Año,
                    `"${book.Idioma.replace(/"/g, '""')}"`,
                    book.Observaciones ? `"${book.Observaciones.replace(/"/g, '""')}"` : 'N/A',
                    book.Precio ? `"${book.Precio.replace(/"/g, '""')}"` : 'N/A',
                    book.Proveedor ? `"${book.Proveedor.replace(/"/g, '""')}"` : 'N/A',
                    virtualStatus
                ];
                csvContent += rowData.join(",") + "\r\n";
            });


            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "libros_completos.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showAlert('Exportación completada', 'success');
        })
        .catch(error => {
            console.error('Error al exportar libros:', error);
            showAlert('Error al exportar los libros: ' + error.message, 'danger');
        });
}


function showAlert(message, type) {
    const existingAlert = document.querySelector('.custom-alert');
    if (existingAlert) existingAlert.remove();

    const alert = document.createElement('div');
    alert.className = `custom-alert alert alert-${type} fixed-top w-50 mx-auto mt-5 text-center`;
    alert.style.zIndex = '2000';
    alert.textContent = message;

    document.body.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, 3000);
}