/**
 * login.js — Manejo de sesión con JWT
 * =====================================
 * Cambios respecto a la versión anterior:
 *  - El token JWT que devuelve el backend se guarda en sessionStorage.
 *  - Todas las peticiones al backend deben incluir el header:
 *      Authorization: Bearer <token>
 *  - La URL base ahora apunta a HTTPS (puerto 8443).
 *    Si aún no tienes el certificado, cambia 8443 por 8000 temporalmente.
 */

document.addEventListener('DOMContentLoaded', function () {

    // ── Si ya hay sesión activa, redirigir ──────────────────────────
    if (sessionStorage.getItem('sesionActiva') === 'true') {
        const userData = sessionStorage.getItem('userData');
        if (userData) {
            try {
                const usuario = JSON.parse(userData);
                window.location.replace(
                    usuario.rol === 'Administrador'
                        ? './Interfaces del admin/Inicio.html'
                        : './Interfaces de usuario/Inicio.html'
                );
            } catch (e) {
                console.error('Error al parsear userData:', e);
            }
        }
    }

    // ── Elementos del formulario ────────────────────────────────────
    const identificacionInput = document.getElementById('email');   // campo identificación
    const passwordInput       = document.getElementById('password');
    const cancelBtn           = document.querySelector('.c');
    const acceptBtn           = document.querySelector('.acp');
    const loginForm           = document.querySelector('form');

    // ── URL base — cambia a http://127.0.0.1:8000 si aún no tienes HTTPS ──
    const API_BASE_URL = 'http://127.0.0.1:8000';
    cancelBtn.addEventListener('click', () => loginForm.reset());

    acceptBtn.addEventListener('click', async function () {
        if (!validateForm()) return;

        acceptBtn.disabled = true;
        acceptBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Cargando...';

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identificacion: identificacionInput.value.trim(),
                    password: passwordInput.value,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                showAlert('danger', data.detail || 'Error al iniciar sesión');
                return;
            }

            handleSuccessfulLogin(data);

        } catch (error) {
            showAlert('danger', 'Error de conexión. Verifique que el servidor esté activo.');
            console.error(error);
        } finally {
            acceptBtn.disabled = false;
            acceptBtn.textContent = 'ACEPTAR';
        }
    });

    // ── Login exitoso: guardar token y datos de usuario ────────────
    function handleSuccessfulLogin(data) {
        // Guardar el JWT — se usará en todas las peticiones posteriores
        sessionStorage.setItem('jwt_token', data.access_token);
        sessionStorage.setItem('userData', JSON.stringify(data.user));
        sessionStorage.setItem('sesionActiva', 'true');

        showAlert('success', 'Inicio de sesión exitoso. Redirigiendo...');

        const targetUrl = data.user.rol === 'Administrador'
            ? './Interfaces del admin/Inicio.html'
            : './Interfaces de usuario/Inicio.html';

        setTimeout(() => window.location.replace(targetUrl), 1000);
    }

    // ── Validación del formulario ───────────────────────────────────
    function validateForm() {
        if (!identificacionInput.value.trim()) {
            showAlert('danger', 'Por favor ingrese su identificación');
            identificacionInput.focus();
            return false;
        }
        if (!passwordInput.value) {
            showAlert('danger', 'Por favor ingrese su contraseña');
            passwordInput.focus();
            return false;
        }
        return true;
    }

    function showAlert(type, message) {
        document.querySelector('.alert')?.remove();
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
        loginForm.appendChild(alertDiv);
        setTimeout(() => {
            alertDiv.classList.remove('show');
            setTimeout(() => alertDiv.remove(), 150);
        }, 5000);
    }

    loginForm.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); acceptBtn.click(); }
    });
});