async function getPrestamos() {
    const response = await fetch('http://127.0.0.1:8000/loan/');
    if (!response.ok) throw new Error('Error al cargar préstamos');
    return await response.json();
}

function formatearFecha(fecha) {
    if (!fecha) return '';
    const date = new Date(fecha);
    if (isNaN(date)) return '';
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}

function renderTable(prestamos) {
    const tableBody = document.querySelector('#prestamos-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (prestamos.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="9" class="text-center">No hay préstamos registrados.</td>
        `;
        tableBody.appendChild(row);
        return;
    }

    prestamos.forEach(prestamo => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${prestamo.id}</td>
            <td>${prestamo.book_id || 'No disponible'}</td>
            <td class="">${prestamo.book}</td>
            <td>${formatearFecha(prestamo.loan_date)}</td>
            <td>${formatearFecha(prestamo.delivery_date)}</td>
            <td>${prestamo.user}</td>
            <td>
                <span class="${getEstadoClass(prestamo.state)}">${prestamo.state}</span> /
                <span class="${getEstadoClass(prestamo.prestamo_state)}">${prestamo.prestamo_state}</span>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function getEstadoClass(estado) {
    switch (estado) {
        case 'Aprobado':
            return 'badge bg-success text-white px-2 py-1 rounded-pill';
        case 'Rechazado':
            return 'badge bg-danger text-white px-2 py-1 rounded-pill';
        case 'Activo':
            return 'badge bg-warning text-dark px-2 py-1 rounded-pill';
        case 'Vencido':
            return 'badge bg-dark text-white px-2 py-1 rounded-pill';
        case 'Devuelto':
            return 'badge bg-primary text-white px-2 py-1 rounded-pill';
        default:
            return 'badge bg-secondary text-white px-2 py-1 rounded-pill';
    }
}

async function setupFilters() {
    document.querySelector('.btn-fil').addEventListener('click', async () => {
        const filtroFecha = document.querySelector('#fecha').value;
        const filtroEstado = document.querySelector('#estado-filter').value;

        let prestamosData = await getPrestamos();

        if (filtroFecha) {
            prestamosData = prestamosData.filter(prestamo =>
                prestamo.loan_date && prestamo.loan_date.startsWith(filtroFecha)
            );
        }

        if (filtroEstado) {
            prestamosData = prestamosData.filter(prestamo =>
                prestamo.state === filtroEstado || prestamo.prestamo_state === filtroEstado
            );
        }

        if (prestamosData.length > 0) {
            renderTable(prestamosData);
        } else {
            document.querySelector('#prestamos-body').innerHTML = `
                <tr>
                    <td colspan="9" class="text-center">No se encontraron préstamos con esos filtros.</td>
                </tr>
            `;
        }
    });
}

async function searchRegister() {
    document.getElementById("formSearch").addEventListener("submit", async (e) => {
        e.preventDefault();
        const filtro = document.querySelector('.input-filter').value.toLowerCase();

        let prestamosData = await getPrestamos();

        if (filtro) {
            prestamosData = prestamosData.filter(prestamo => 
                prestamo.id.toString().includes(filtro) ||
                (prestamo.book && prestamo.book.toLowerCase().includes(filtro)) ||
                (prestamo.user && prestamo.user.toLowerCase().includes(filtro))
            );
        }

        if (prestamosData.length > 0) {
            renderTable(prestamosData);
        } else {
            document.querySelector('#prestamos-body').innerHTML = `
                <tr>
                    <td colspan="9" class="text-center">No se encontraron préstamos que coincidan con "${filtro}".</td>
                </tr>
            `;
        }
    });
}

async function fetchSolicitudes() {
    try {
        const response = await fetch('http://127.0.0.1:8000/loan/');
        if (!response.ok) throw new Error('Error al cargar préstamos.');

        const prestamos = await response.json();
        const solicitudesPendientes = prestamos.filter(p => p.prestamo_state === 'No Aprobado');

        const container = document.getElementById('solicitudes-container');
        container.innerHTML = '';

        if (solicitudesPendientes.length === 0) {
            container.innerHTML = `<p class="text-center text-muted">No hay solicitudes pendientes.</p>`;
            return;
        }

        solicitudesPendientes.forEach(prestamo => {
            const card = document.createElement('div');
            card.className = "card shadow border-0";
            card.style.width = "18rem";

            card.innerHTML = `
                <div class="card-body d-flex flex-column justify-content-between">
                    <div class="mb-3">
                        <h5 class="card-title">${prestamo.book}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">Solicitado por: ${prestamo.user}</h6>
                        <p class="card-text small">
                            <strong>Fecha Préstamo:</strong> ${formatearFecha(prestamo.loan_date)}<br>
                            <strong>Fecha Devolución:</strong> ${formatearFecha(prestamo.delivery_date)}
                        </p>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-success w-100" onclick="aprobarPrestamo(${prestamo.id})">
                            Aprobar
                        </button>
                        <button class="btn btn-danger w-100" onclick="rechazarPrestamo(${prestamo.id})">
                            Rechazar
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        document.getElementById('solicitudes-container').innerHTML = `<p class="text-center text-danger">Error al cargar solicitudes.</p>`;
    }
}

async function actualizarEstado(id, estado) {
    const payload = {
        prestamo_state: estado,
        state: estado === 'Aprobado' ? 'Activo' : 'Rechazado'
    };

    try {
        const response = await fetch(`http://127.0.0.1:8000/loan/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            await fetchSolicitudes();
            const prestamosData = await getPrestamos();
            renderTable(prestamosData);
            alert(`Préstamo ${estado === 'Aprobado' ? 'aprobado' : 'rechazado'} correctamente.`);
        } else {
            alert('Error al actualizar el préstamo.');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión al servidor.');
    }
}

async function aprobarPrestamo(id) {
    await actualizarEstado(id, 'Aprobado');
}

async function rechazarPrestamo(id) {
    await actualizarEstado(id, 'Rechazado');
}

document.getElementById('exampleModal').addEventListener('show.bs.modal', fetchSolicitudes);

document.addEventListener('DOMContentLoaded', async () => {
    const prestamosData = await getPrestamos();
    renderTable(prestamosData);
    setupFilters();
    searchRegister();
});