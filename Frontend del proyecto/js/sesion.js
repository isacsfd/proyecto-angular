/**
 * sesion.js — Manejo de sesión con cierre automático por inactividad
 * ===================================================================
 * MEJORA 1: Si el usuario no interactúa en 30 minutos, se cierra la sesión
 *           automáticamente y se muestra una advertencia 2 minutos antes.
 * MEJORA 2: Al cargar cualquier página, verifica si el usuario tiene
 *           préstamos de dispositivos vencidos y muestra una alerta.
 */

// ── Configuración de inactividad ─────────────────────────────────────────────
const INACTIVIDAD_LIMITE_MS  = 30 * 60 * 1000;  // 30 minutos
const INACTIVIDAD_AVISO_MS   = 28 * 60 * 1000;  // Aviso a los 28 minutos
const API_BASE = 'http://127.0.0.1:8000';

let timerInactividad;
let timerAviso;
let modalAviso = null;

// ── Funciones de sesión ───────────────────────────────────────────────────────
function verificarSesionActiva() {
    return sessionStorage.getItem('sesionActiva') === 'true';
}

function mostrarNombreUsuario() {
    const rawData = sessionStorage.getItem('userData');
    if (!rawData) { _mostrarNombrePorDefecto(); return; }
    try {
        const usuario = JSON.parse(rawData);
        const el = document.querySelector('h1.mt-1');
        if (el && usuario.nombre) {
            el.textContent = `Bienvenido, ${usuario.nombre}`;
        } else {
            _mostrarNombrePorDefecto();
        }
    } catch (e) {
        console.error('[sesion.js] Error al parsear userData:', e);
        _mostrarNombrePorDefecto();
    }
}

function _mostrarNombrePorDefecto() {
    const el = document.querySelector('h1.mt-1');
    if (el) el.textContent = 'Bienvenido, Usuario';
}

function cerrarSesion() {
    _limpiarTimers();
    sessionStorage.removeItem('userData');
    sessionStorage.removeItem('sesionActiva');
    sessionStorage.removeItem('jwt_token');
    window.location.href = '../login.html';
}

function prevenirRetroceso() {
    window.history.pushState(null, null, window.location.href);
    window.onpopstate = () => window.history.go(1);
}

// ── MEJORA 1: Cierre automático por inactividad ───────────────────────────────
function _limpiarTimers() {
    clearTimeout(timerInactividad);
    clearTimeout(timerAviso);
}

function _reiniciarTimerInactividad() {
    _limpiarTimers();
    // Aviso a los 28 minutos
    timerAviso = setTimeout(_mostrarAvisoInactividad, INACTIVIDAD_AVISO_MS);
    // Cierre a los 30 minutos
    timerInactividad = setTimeout(_cerrarSesionPorInactividad, INACTIVIDAD_LIMITE_MS);
}

function _mostrarAvisoInactividad() {
    // Crear modal de aviso si no existe
    if (document.getElementById('modalInactividad')) return;

    const modal = document.createElement('div');
    modal.id = 'modalInactividad';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); z-index: 9999;
        display: flex; align-items: center; justify-content: center;
    `;
    modal.innerHTML = `
        <div style="background:#fff; border-radius:12px; padding:32px; max-width:420px; width:90%; text-align:center; box-shadow:0 8px 32px rgba(0,0,0,0.2);">
            <div style="font-size:48px; margin-bottom:12px;">⏱️</div>
            <h4 style="color:#dc3545; margin-bottom:8px;">Sesión por expirar</h4>
            <p style="color:#555; margin-bottom:24px;">
                Tu sesión se cerrará en <strong>2 minutos</strong> por inactividad.<br>
                ¿Deseas continuar?
            </p>
            <button id="btnContinuarSesion"
                style="background:#0d6efd; color:#fff; border:none; border-radius:8px; padding:10px 28px; font-size:15px; cursor:pointer; margin-right:8px;">
                Sí, continuar
            </button>
            <button id="btnCerrarAhora"
                style="background:#dc3545; color:#fff; border:none; border-radius:8px; padding:10px 28px; font-size:15px; cursor:pointer;">
                Cerrar sesión
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    modalAviso = modal;

    document.getElementById('btnContinuarSesion').addEventListener('click', () => {
        modal.remove();
        modalAviso = null;
        _reiniciarTimerInactividad();
    });

    document.getElementById('btnCerrarAhora').addEventListener('click', cerrarSesion);
}

function _cerrarSesionPorInactividad() {
    if (modalAviso) { modalAviso.remove(); modalAviso = null; }
    alert('Tu sesión fue cerrada por inactividad. Por favor inicia sesión nuevamente.');
    cerrarSesion();
}

function _activarControlInactividad() {
    const eventos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    eventos.forEach(evento => {
        document.addEventListener(evento, () => {
            // Solo reiniciar si el modal de aviso NO está visible
            if (!modalAviso) _reiniciarTimerInactividad();
        }, { passive: true });
    });
    _reiniciarTimerInactividad(); // Iniciar el timer al cargar
}

// ── MEJORA 2: Verificar préstamos vencidos al cargar ─────────────────────────
async function verificarPrestamosVencidos() {
    const rawData = sessionStorage.getItem('userData');
    if (!rawData) return;

    let usuario;
    try { usuario = JSON.parse(rawData); } catch (e) { return; }

    const token = sessionStorage.getItem('jwt_token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE}/prestamos-dispositivos/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;

        const prestamos = await response.json();
        const ahora = new Date();

        // Filtrar préstamos activos del usuario actual que tengan más de 1 día
        const vencidos = prestamos.filter(p => {
            if (p.user_id !== usuario.id) return false;
            if (p.estado !== 'Activo') return false;
            const fechaPrestamo = new Date(p.fecha_prestamo);
            const diasTranscurridos = (ahora - fechaPrestamo) / (1000 * 60 * 60 * 24);
            return diasTranscurridos > 1;
        });

        if (vencidos.length > 0) {
            _mostrarAlertaPrestamosVencidos(vencidos);
        }
    } catch (e) {
        console.warn('[sesion.js] No se pudo verificar préstamos vencidos:', e);
    }
}

function _mostrarAlertaPrestamosVencidos(prestamos) {
    if (document.getElementById('alertaPrestamosVencidos')) return;

    const lista = prestamos.map(p =>
        `<li><strong>${p.dispositivo}</strong> — prestado el ${new Date(p.fecha_prestamo).toLocaleDateString('es-CO')}</li>`
    ).join('');

    const alerta = document.createElement('div');
    alerta.id = 'alertaPrestamosVencidos';
    alerta.style.cssText = `
        position: fixed; top: 70px; right: 20px; z-index: 9998;
        background: #fff3cd; border: 1px solid #ffc107; border-radius: 10px;
        padding: 16px 20px; max-width: 380px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    `;
    alerta.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <strong style="color:#856404;">⚠️ Préstamos por vencer</strong>
            <button onclick="document.getElementById('alertaPrestamosVencidos').remove()"
                style="background:none; border:none; font-size:18px; cursor:pointer; color:#856404;">✕</button>
        </div>
        <p style="color:#856404; margin-bottom:8px; font-size:14px;">
            Tienes ${prestamos.length} préstamo(s) activo(s) con más de 1 día:
        </p>
        <ul style="color:#856404; font-size:13px; padding-left:16px; margin:0;">${lista}</ul>
    `;
    document.body.appendChild(alerta);

    // Auto-cerrar después de 15 segundos
    setTimeout(() => alerta.remove(), 15000);
}

// ── Inicialización automática ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (verificarSesionActiva()) {
        _activarControlInactividad();
        verificarPrestamosVencidos();
    }
});
