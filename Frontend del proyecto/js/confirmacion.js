/**
 * confirmacion.js — Modal de confirmación antes de borrar
 * =========================================================
 * MEJORA 3: Reemplaza el window.confirm() nativo (feo) por un modal
 *           de Bootstrap moderno y reutilizable en toda la aplicación.
 *
 * USO en cualquier JS:
 *   confirmarAccion(
 *       '¿Eliminar usuario?',
 *       'Esta acción no se puede deshacer. Se eliminarán también sus préstamos e ingresos.',
 *       () => { ... código que se ejecuta si el usuario confirma ... }
 *   );
 */

(function crearModalConfirmacion() {
    // Crear el modal solo una vez al cargar el script
    if (document.getElementById('modalConfirmacionGlobal')) return;

    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="modal fade" id="modalConfirmacionGlobal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow">
                    <div class="modal-header border-0 pb-0">
                        <div class="d-flex align-items-center gap-2">
                            <span id="modalConfirmIcono" style="font-size:28px;">⚠️</span>
                            <h5 class="modal-title fw-bold" id="modalConfirmTitulo">¿Estás seguro?</h5>
                        </div>
                    </div>
                    <div class="modal-body pt-2">
                        <p class="text-muted mb-0" id="modalConfirmMensaje"></p>
                    </div>
                    <div class="modal-footer border-0 pt-0">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-danger" id="modalConfirmBtnAceptar">
                            Sí, eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal.firstElementChild);
})();

/**
 * Muestra el modal de confirmación y ejecuta el callback si el usuario acepta.
 *
 * @param {string}   titulo    — Título del modal, ej: '¿Eliminar usuario?'
 * @param {string}   mensaje   — Descripción del efecto de la acción
 * @param {Function} onConfirm — Función a ejecutar si el usuario confirma
 * @param {string}   [textoBtnConfirmar='Sí, eliminar'] — Texto del botón de confirmación
 * @param {string}   [icono='🗑️'] — Emoji del ícono
 */
function confirmarAccion(titulo, mensaje, onConfirm, textoBtnConfirmar = 'Sí, eliminar', icono = '🗑️') {
    const modalEl    = document.getElementById('modalConfirmacionGlobal');
    const btnAceptar = document.getElementById('modalConfirmBtnAceptar');

    document.getElementById('modalConfirmTitulo').textContent  = titulo;
    document.getElementById('modalConfirmMensaje').textContent = mensaje;
    document.getElementById('modalConfirmIcono').textContent   = icono;
    btnAceptar.textContent = textoBtnConfirmar;

    // Clonar el botón para eliminar listeners anteriores
    const btnNuevo = btnAceptar.cloneNode(true);
    btnAceptar.replaceWith(btnNuevo);

    const instancia = new bootstrap.Modal(modalEl);

    btnNuevo.addEventListener('click', () => {
        instancia.hide();
        onConfirm();
    });

    instancia.show();
}