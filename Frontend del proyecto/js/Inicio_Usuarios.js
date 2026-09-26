/**
 * Inicio_Usuarios.js — Inicialización pantalla de inicio para usuarios normales
 *
 * CORRECCIÓN: delega en sesion.js en lugar de redefinir las funciones.
 */
document.addEventListener('DOMContentLoaded', function () {

    if (!verificarSesionActiva()) {
        window.location.href = '../login.html';
        return;
    }

    mostrarNombreUsuario();
    prevenirRetroceso();
});