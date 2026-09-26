// Variable global para almacenar los préstamos actuales
let currentPrestamos = [];

async function getPrestamosDispositivos() {
    try {
        const token = sessionStorage.getItem('jwt_token');
        const response = await fetch('http://127.0.0.1:8000/prestamos-dispositivos/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const prestamos = await response.json();

        const dispositivosResponse = await fetch('http://127.0.0.1:8000/dispositivos/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!dispositivosResponse.ok) throw new Error(`Error al obtener dispositivos: ${dispositivosResponse.status}`);
        const dispositivos = await dispositivosResponse.json();

        const prestamosCombinados = prestamos.map(prestamo => {
            const dispositivo = dispositivos.find(d => d.id === prestamo.dispositivo_id);
            return {
                ...prestamo,
                dispositivo: dispositivo ? `${dispositivo.tipo} ${dispositivo.marca} ${dispositivo.modelo}` : 'Dispositivo no encontrado',
                sede: dispositivo ? dispositivo.sede : 'N/A',
                tipo_dispositivo: dispositivo ? dispositivo.tipo : 'N/A'
            };
        });

        currentPrestamos = prestamosCombinados;
        return prestamosCombinados;
    } catch (error) {
        console.error('Error al obtener préstamos:', error);
        alert('Error al cargar préstamos: ' + error.message);
        return [];
    }
}

async function getDispositivosDisponibles() {
    try {
        const token = sessionStorage.getItem('jwt_token');
        const response = await fetch('http://127.0.0.1:8000/dispositivos/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        return data.filter(d => d.estado === "Disponible");
    } catch (error) {
        console.error('Error al obtener dispositivos:', error);
        alert('Error al cargar dispositivos disponibles: ' + error.message);
        return [];
    }
}

async function getUsuarios() {
    try {
        const token = sessionStorage.getItem('jwt_token');
        const response = await fetch('http://127.0.0.1:8000/usuarios/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        alert('Error al cargar usuarios: ' + error.message);
        return [];
    }
}

function formatearFecha(fecha) {
    if (!fecha) return 'No devuelto';
    try {
        const dateUTC = new Date(fecha);
        const colombiaDate = new Date(dateUTC.getTime() - (5 * 60 * 60 * 1000));
        const dia = colombiaDate.getDate().toString().padStart(2, '0');
        const mes = (colombiaDate.getMonth() + 1).toString().padStart(2, '0');
        const anio = colombiaDate.getFullYear();
        const horas = colombiaDate.getHours().toString().padStart(2, '0');
        const minutos = colombiaDate.getMinutes().toString().padStart(2, '0');
        return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
    } catch (e) {
        return fecha;
    }
}

function getEstadoBadge(estado) {
    const badges = {
        'Disponible':      'bg-success',
        'Prestado':        'bg-warning text-dark',
        'Dañado':          'bg-danger',
        'En Mantenimiento':'bg-secondary',
        'Activo':          'bg-primary',
        'Completado':      'bg-success',
    };
    return `<span class="badge ${badges[estado] || 'bg-secondary'}">${estado}</span>`;
}

async function renderDispositivos() {
    const token = sessionStorage.getItem('jwt_token');
    const tbody = document.getElementById('dispositivos-body');
    tbody.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';

    try {
        const response = await fetch('http://127.0.0.1:8000/dispositivos/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`Error ${response.status}`);
        const dispositivos = await response.json();

        tbody.innerHTML = '';
        if (dispositivos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-muted">No hay dispositivos registrados.</td></tr>';
            return;
        }

        dispositivos.forEach(d => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${d.id}</td>
                <td>${d.tipo}</td>
                <td>${d.marca}</td>
                <td>${d.modelo}</td>
                <td>${d.sede}</td>
                <td>${getEstadoBadge(d.estado)}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="abrirModalPrestamo(${d.id})"
                        ${d.estado !== 'Disponible' ? 'disabled' : ''}>
                        <i class="bi bi-arrow-right-circle"></i> Prestar
                    </button>
                </td>`;
        });
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-danger">Error: ${error.message}</td></tr>`;
    }
}

async function renderPrestamos() {
    const tbody = document.getElementById('prestamos-body');
    tbody.innerHTML = '<tr><td colspan="8">Cargando...</td></tr>';

    const prestamos = await getPrestamosDispositivos();
    tbody.innerHTML = '';

    if (prestamos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-muted">No hay préstamos registrados.</td></tr>';
        return;
    }

    prestamos.forEach(p => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${p.id}</td>
            <td>${p.dispositivo}</td>
            <td>${p.sede}</td>
            <td>${formatearFecha(p.fecha_prestamo)}</td>
            <td>${formatearFecha(p.fecha_devolucion)}</td>
            <td>${p.user}</td>
            <td>${getEstadoBadge(p.estado)}</td>
            <td>
                ${p.estado === 'Activo'
                    ? `<button class="btn btn-sm btn-success me-1" onclick="finalizarPrestamo(${p.id})">
                           <i class="bi bi-check-circle"></i> Finalizar
                       </button>`
                    : '<span class="text-muted">—</span>'}
            </td>`;
    });
}

// ── Modal de préstamo ─────────────────────────────────────────────────────────
async function abrirModalPrestamo(dispositivoId) {
    const usuarios = await getUsuarios();

    let selectHTML = '<option value="">Seleccionar usuario...</option>';
    usuarios.forEach(u => {
        selectHTML += `<option value="${u.id}">${u.nombre} (${u.identificacion})</option>`;
    });

    // Reusar modal de confirmación como formulario de préstamo
    const modalEl = document.getElementById('modalConfirmacionGlobal');
    document.getElementById('modalConfirmIcono').textContent = '💻';
    document.getElementById('modalConfirmTitulo').textContent = 'Registrar Préstamo';
    document.getElementById('modalConfirmMensaje').innerHTML = `
        <div class="mb-3">
            <label class="form-label">Usuario</label>
            <select class="form-select" id="selectUsuarioPrestamo">${selectHTML}</select>
        </div>`;

    const btnAceptar = document.getElementById('modalConfirmBtnAceptar');
    btnAceptar.textContent = 'Confirmar préstamo';
    const btnNuevo = btnAceptar.cloneNode(true);
    btnAceptar.replaceWith(btnNuevo);

    const instancia = new bootstrap.Modal(modalEl);

    btnNuevo.addEventListener('click', async () => {
        const userId = document.getElementById('selectUsuarioPrestamo').value;
        if (!userId) { alert('Selecciona un usuario.'); return; }
        instancia.hide();
        await crearPrestamo(dispositivoId, parseInt(userId));
    });

    instancia.show();
}

async function crearPrestamo(dispositivoId, userId) {
    try {
        const token = sessionStorage.getItem('jwt_token');
        const response = await fetch('http://127.0.0.1:8000/prestamos-dispositivos/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                dispositivo_id: dispositivoId,
                user_id: userId,
                fecha_prestamo: new Date().toISOString()
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Error al crear préstamo');
        }

        alert('✅ Préstamo registrado correctamente.');
        renderDispositivos();
        renderPrestamos();
    } catch (error) {
        console.error('Error al crear préstamo:', error);
        alert('Error al crear préstamo: ' + error.message);
    }
}

// ── ✅ MEJORA 3: confirmarAccion reemplaza window.confirm() ──────────────────
async function finalizarPrestamo(prestamoId) {
    confirmarAccion(
        '¿Finalizar préstamo?',
        'Se marcará el dispositivo como devuelto y quedará disponible para otros usuarios.',
        async () => {
            try {
                const token = sessionStorage.getItem('jwt_token');
                const response = await fetch(`http://127.0.0.1:8000/prestamos-dispositivos/${prestamoId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        estado: "Completado",
                        fecha_devolucion: new Date().toISOString()
                    })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.detail || 'Error al finalizar préstamo');
                }

                alert('✅ Préstamo finalizado correctamente.');
                renderDispositivos();
                renderPrestamos();
            } catch (error) {
                console.error('Error al finalizar préstamo:', error);
                alert('Error al finalizar préstamo: ' + error.message);
            }
        },
        '✅ Sí, finalizar',
        '✅'
    );
}

// ── Inicialización ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    renderDispositivos();
    renderPrestamos();

    // Recargar al cambiar de tab
    document.getElementById('prestamos-tab')?.addEventListener('shown.bs.tab', renderPrestamos);
    document.getElementById('dispositivos-tab')?.addEventListener('shown.bs.tab', renderDispositivos);
}); 