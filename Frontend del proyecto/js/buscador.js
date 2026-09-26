/**
 * buscador.js — Buscador en tiempo real para tablas
 * ===================================================
 * MEJORA 6: Filtra cualquier tabla del sistema mientras el usuario escribe.
 *
 * USO — agrega en el HTML un input con el atributo data-tabla
 * apuntando al ID del tbody que quieres filtrar:
 *
 *   <input type="text"
 *          id="buscadorUsuarios"
 *          class="form-control"
 *          placeholder="🔍 Buscar..."
 *          data-tabla="tablaUsuariosBody">
 *
 * Luego inicializa en tu JS con:
 *   activarBuscador('buscadorUsuarios');
 *
 * O activa todos los buscadores de la página de una vez:
 *   activarTodosBuscadores();
 */

/**
 * Activa el buscador para un input específico.
 * @param {string} inputId — ID del input de búsqueda
 */
function activarBuscador(inputId) {
    const input = document.getElementById(inputId);
    if (!input) {
        console.warn(`[buscador.js] No se encontró el input #${inputId}`);
        return;
    }

    const tablaId = input.getAttribute('data-tabla');
    if (!tablaId) {
        console.warn(`[buscador.js] El input #${inputId} no tiene el atributo data-tabla`);
        return;
    }

    input.addEventListener('input', () => {
        const termino = input.value.trim().toLowerCase();
        const tbody = document.getElementById(tablaId);
        if (!tbody) return;

        const filas = tbody.querySelectorAll('tr');
        let encontrados = 0;

        filas.forEach(fila => {
            // Ignorar filas de "no hay datos"
            if (fila.cells.length <= 1) return;

            const textoFila = Array.from(fila.cells)
                .map(celda => celda.textContent.toLowerCase())
                .join(' ');

            const coincide = termino === '' || textoFila.includes(termino);
            fila.style.display = coincide ? '' : 'none';
            if (coincide) encontrados++;
        });

        // Mostrar mensaje si no hay resultados
        _actualizarMensajeNoResultados(tbody, encontrados, termino);
    });

    // Limpiar con Escape
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            input.value = '';
            input.dispatchEvent(new Event('input'));
        }
    });
}

function _actualizarMensajeNoResultados(tbody, encontrados, termino) {
    let filaVacia = tbody.querySelector('.fila-sin-resultados');

    if (encontrados === 0 && termino !== '') {
        if (!filaVacia) {
            filaVacia = document.createElement('tr');
            filaVacia.className = 'fila-sin-resultados';
            const colCount = tbody.closest('table')?.querySelector('thead tr')?.cells.length || 5;
            filaVacia.innerHTML = `
                <td colspan="${colCount}" class="text-center text-muted py-4">
                    <i class="bi bi-search" style="font-size:24px; display:block; margin-bottom:8px;"></i>
                    No se encontraron resultados para "<strong>${termino}</strong>"
                </td>`;
            tbody.appendChild(filaVacia);
        } else {
            filaVacia.querySelector('td').innerHTML = `
                <i class="bi bi-search" style="font-size:24px; display:block; margin-bottom:8px;"></i>
                No se encontraron resultados para "<strong>${termino}</strong>"`;
        }
    } else if (filaVacia) {
        filaVacia.remove();
    }
}

/**
 * Activa todos los buscadores de la página que tengan data-tabla.
 * Llama esta función en DOMContentLoaded.
 */
function activarTodosBuscadores() {
    document.querySelectorAll('input[data-tabla]').forEach(input => {
        activarBuscador(input.id);
    });
}

document.addEventListener('DOMContentLoaded', activarTodosBuscadores);