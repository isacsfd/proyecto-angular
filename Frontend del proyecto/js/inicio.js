/**
 * inicio.js — Inicialización de las pantallas de inicio (admin y usuario)
 *
 * CORRECCIÓN: este archivo ya no redefine verificarSesionActiva() ni
 * mostrarNombreUsuario() localmente. Delega en sesion.js (que debe
 * cargarse ANTES que este script en el HTML).
 */
document.addEventListener('DOMContentLoaded', function () {

    // 1. Verificar sesión activa en esta pestaña
    if (!verificarSesionActiva()) {
        window.location.href = '../login.html';
        return;
    }

    // 2. Mostrar el nombre del usuario de ESTA sesión
    mostrarNombreUsuario();

    // 3. Evitar retroceso al login con el botón del navegador
    prevenirRetroceso();
});