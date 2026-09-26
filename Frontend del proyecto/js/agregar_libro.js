const URL = "http://127.0.0.1:8000/";

document.addEventListener('DOMContentLoaded', function() {
    setupForm();
    setupEventListeners();
});

function setupForm() {
    const form = document.getElementById('libroForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleFormSubmit();
    });
}

function setupEventListeners() {
    document.getElementById('cancelBtn').addEventListener('click', function() {
        if (confirm('¿Está seguro de cancelar? Los datos no guardados se perderán.')) {
            window.location.href = 'Libross.html';
        }
    });
}

function handleFormSubmit() {
    if (validateForm()) {
        const libroData = getFormData();
        createBook(libroData);
    }
}

function validateForm() {
    const requiredFields = [
        'autor', 'titulo', 'programa', 'item', 
        'signatura', 'areas', 'ejemplar', 
        'editorial', 'anio', 'idioma'
    ];

    let isValid = true;

    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            markFieldAsInvalid(field, `El campo ${getFieldLabel(fieldId)} es obligatorio`);
            isValid = false;
        } else if (['item', 'areas', 'ejemplar', 'anio'].includes(fieldId)) {
            if (isNaN(field.value.trim())) {
                markFieldAsInvalid(field, `El campo ${getFieldLabel(fieldId)} debe ser un número`);
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
        field.parentNode.insertBefore(feedback, field.nextSibling);
    }
    feedback.textContent = message;
    
    // Scroll al primer campo inválido
    if (!document.querySelector('.is-invalid:first-of-type')) {
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function getFieldLabel(fieldId) {
    const labels = {
        'autor': 'Autor',
        'titulo': 'Título',
        'programa': 'Programa',
        'item': 'Item',
        'signatura': 'Signatura',
        'areas': 'Áreas',
        'ejemplar': 'Ejemplar',
        'editorial': 'Editorial',
        'anio': 'Año',
        'idioma': 'Idioma'
    };
    return labels[fieldId] || fieldId;
}

function getFormData() {
    document.querySelectorAll('.is-invalid').forEach(el => {
        el.classList.remove('is-invalid');
    });

    return {
        Autor: document.getElementById('autor').value.trim(),
        Titulo: document.getElementById('titulo').value.trim(),
        Programa: document.getElementById('programa').value.trim(),
        Item: parseInt(document.getElementById('item').value.trim()),
        Signatura: document.getElementById('signatura').value.trim(),
        Areas: parseInt(document.getElementById('areas').value.trim()),
        Ejemplar: parseInt(document.getElementById('ejemplar').value.trim()),
        Editorial: document.getElementById('editorial').value.trim(),
        Año: parseInt(document.getElementById('anio').value.trim()),
        Idioma: document.getElementById('idioma').value.trim(),
        Observaciones: document.getElementById('observaciones').value.trim() || null,
        Precio: document.getElementById('precio').value.trim() || null,
        Proveedor: document.getElementById('proveedor').value.trim() || null,
        Registro_en_linea: document.getElementById('registro_linea').value || null
    };
}

async function createBook(libroData) {
    try {
        showLoading(true);
        
        const response = await fetch(`${URL}libros/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(libroData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error detallado:', errorData);
            
            if (errorData.detail) {
                if (Array.isArray(errorData.detail)) {
                    errorData.detail.forEach(error => {
                        const field = document.getElementById(error.loc[1]);
                        if (field) {
                            markFieldAsInvalid(field, error.msg);
                        }
                    });
                }
                throw new Error(Array.isArray(errorData.detail) ? 
                    'Revise los campos marcados' : errorData.detail);
            }
            throw new Error('Error al crear el libro');
        }

        const createdBook = await response.json();
        showAlert('success', 'Libro creado exitosamente');
        
        setTimeout(() => {
            window.location.href = 'Libross.html';
        }, 2000);

    } catch (error) {
        console.error('Error completo:', error);
        showAlert('danger', `Error: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show fixed-top mx-auto mt-5`;
    alertDiv.style.width = '50%';
    alertDiv.style.zIndex = '2000';
    alertDiv.style.left = '0';
    alertDiv.style.right = '0';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        const bsAlert = new bootstrap.Alert(alertDiv);
        bsAlert.close();
    }, 5000);
}

function showLoading(show) {
    const submitBtn = document.querySelector('#libroForm button[type="submit"]');
    if (submitBtn) {
        if (show) {
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';
            submitBtn.disabled = true;
        } else {
            submitBtn.innerHTML = '<i class="bi bi-save"></i> Guardar';
            submitBtn.disabled = false;
        }
    }
}