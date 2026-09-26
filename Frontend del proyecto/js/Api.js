/**
 * api.js — Función centralizada para llamadas al backend con JWT
 * ================================================================
 * INSTRUCCIONES:
 *   1. Carga este script en todos los HTML ANTES de los demás scripts JS:
 *        <script src="../js/api.js"></script>
 *
 *   2. En cualquier JS que necesite llamar al backend, reemplaza:
 *        fetch('http://127.0.0.1:8000/usuarios/')
 *      por:
 *        apiFetch('usuarios/')
 *
 *   apiFetch adjunta automáticamente el token JWT y maneja la expiración.
 */

// ── URL base del backend ────────────────────────────────────────────────────
// Cambia a 'http://127.0.0.1:8000' si aún no tienes el certificado HTTPS.
const API_BASE = 'http://127.0.0.1:8000';
/**
 * Wrapper de fetch que:
 *  - Adjunta el JWT guardado en sessionStorage al header Authorization.
 *  - Si el servidor responde 401, cierra la sesión y redirige al login.
 *  - Si el servidor responde 403, muestra un mensaje de "sin permisos".
 *
 * @param {string} endpoint  — Ruta relativa, ej: 'usuarios/' o 'dispositivos/1'
 * @param {object} options   — Opciones de fetch (method, body, headers extra)
 * @returns {Promise<Response>}
 */
async function apiFetch(endpoint, options = {}) {
    const token = sessionStorage.getItem('jwt_token');

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE}/${endpoint}`;
    const response = await fetch(url, { ...options, headers });

    // Token expirado o inválido → cerrar sesión automáticamente
    if (response.status === 401) {
        sessionStorage.clear();
        alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
        window.location.replace('/login.html');
        return response;
    }

    // Sin permisos suficientes
    if (response.status === 403) {
        alert('No tienes permisos para realizar esta acción.');
        return response;
    }

    return response;
}