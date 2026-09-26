const URL = "http://127.0.0.1:8000/";

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM cargado, configurando formulario...");
    
    const form = document.getElementById('userForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log("Formulario enviado");
        
        try {
            showLoadingState(true);
            
            if (!validateForm()) {
                return;
            }
            
            const userData = {
                nombre: document.getElementById('nombre').value.trim(),
                username: document.getElementById('username').value.trim(),
                identificacion: document.getElementById('identificacion').value.trim(),
                email: document.getElementById('email').value.trim(),
                phone: document.getElementById('phone').value.trim() || null,
                address: document.getElementById('address').value.trim() || null,
                rol: document.getElementById('rol').value,
                nivel_academico: document.getElementById('nivel_academico').value.trim() || null,
                carrera: document.getElementById('carrera').value.trim() || null,
                password: document.getElementById('password').value
            };
            
            console.log("Enviando datos:", userData);
            
            const response = await fetch(`${URL}usuarios/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Usuario creado:", data);
            
            showAlert('Usuario creado exitosamente!', 'success');
            
            setTimeout(() => {
                window.location.href = 'Registro_Usuario.html';
            }, 1500);
            
        } catch (error) {
            console.error("Error al crear usuario:", error);
            showAlert(`Error: ${error.message}`, 'danger');
        } finally {
            showLoadingState(false);
        }
    });
});

function validateForm() {
    let isValid = true;
    const requiredFields = [
        {id: 'nombre', name: 'Nombre completo'},
        {id: 'username', name: 'Username'},
        {id: 'identificacion', name: 'Identificación'},
        {id: 'email', name: 'Email'},
        {id: 'rol', name: 'Tipo de usuario'},
        {id: 'password', name: 'Contraseña'}
    ];
    
    requiredFields.forEach(field => {
        const element = document.getElementById(field.id);
        const errorElement = document.getElementById(`${field.id}-error`);
        
        if (!element.value.trim()) {
            errorElement.textContent = `${field.name} es requerido`;
            isValid = false;
        } else {
            errorElement.textContent = '';
        }
    });
    
    // Validación de email
    const email = document.getElementById('email').value;
    const emailError = document.getElementById('email-error');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailError.textContent = 'Ingrese un email válido';
        isValid = false;
    }

    // Validación de contraseña
    const password = document.getElementById('password').value;
    const passwordError = document.getElementById('password-error');
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.*\s).{8,}$/;

    if (!passwordRegex.test(password)) {
        passwordError.textContent = 
            'La contraseña debe tener mínimo 8 caracteres, incluir una mayúscula, una minúscula, un carácter especial y no contener espacios.';
        isValid = false;
    } else {
        passwordError.textContent = '';
    }

    return isValid;
}


function showLoadingState(show) {
    const submitBtn = document.querySelector('#userForm button[type="submit"]');
    if (submitBtn) {
        if (show) {
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Procesando...';
            submitBtn.disabled = true;
        } else {
            submitBtn.innerHTML = '<i class="bi bi-person-plus"></i> Agregar Usuario';
            submitBtn.disabled = false;
        }
    }
}

function showAlert(message, type) {
    const existingAlert = document.querySelector('.custom-alert');
    if (existingAlert) existingAlert.remove();

    const alert = document.createElement('div');
    alert.className = `custom-alert alert alert-${type} fixed-top w-50 mx-auto mt-3 text-center`;
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