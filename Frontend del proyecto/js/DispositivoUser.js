document.addEventListener('DOMContentLoaded', function () {
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData) {
        alert('Debe iniciar sesión para acceder a esta página');
        window.location.href = '../login.html';
        return;
    }

    cargarDispositivosDisponibles();
    cargarPrestamosPendientes(userData.id);
});

async function cargarDispositivosDisponibles() {
    const contenedor = document.getElementById('dispositivos-disponibles');
    contenedor.innerHTML = '<p class="text-center text-muted">Cargando dispositivos...</p>';

    try {
        const response = await fetch('http://127.0.0.1:8000/dispositivos/');
        if (!response.ok) throw new Error('Error al cargar dispositivos');

        const dispositivos = await response.json();
        const disponibles = dispositivos.filter(d => d.estado === "Disponible");

        if (disponibles.length > 0) {
            contenedor.innerHTML = disponibles.map(d => `
                <div class="col-md-4 mb-3">
                    <div class="card h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <h5 class="card-title">Dispositivo #${d.id}: ${d.tipo} ${d.marca}</h5>
                                <span class="badge bg-success">Disponible</span>
                            </div>
                            <p class="card-text">
                                <small class="text-muted">Modelo: ${d.modelo}</small><br>
                                <small class="text-muted">Sede: ${d.sede}</small>
                            </p>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            contenedor.innerHTML = '<p class="text-center text-muted">No hay dispositivos disponibles actualmente</p>';
        }
    } catch (error) {
        console.error('Error:', error);
        contenedor.innerHTML = '<p class="text-center text-danger">Error al cargar dispositivos</p>';
    }
}

async function cargarPrestamosPendientes(userId) {
    const contenedor = document.getElementById('prestamos-pendientes');
    contenedor.innerHTML = '<p class="text-center text-muted">Cargando préstamos...</p>';

    try {
        const response = await fetch('http://127.0.0.1:8000/prestamos-dispositivos/');
        if (!response.ok) throw new Error('Error al cargar préstamos');

        const prestamos = await response.json();
        const pendientes = prestamos.filter(p => p.user_id === userId && p.estado === "Activo");

        if (pendientes.length > 0) {
            contenedor.innerHTML = pendientes.map(p => `
                <div class="mb-3 border-bottom pb-2">
                    <p class="mb-1"><strong>Dispositivo #${p.dispositivo_id}: ${p.dispositivo}</strong></p>
                    <p class="mb-1 small">Fecha préstamo: ${new Date(p.fecha_prestamo).toLocaleString()}</p>
                    <p class="mb-1 small">Estado: <span class="badge bg-warning">${p.estado}</span></p>
                </div>
            `).join('');
        } else {
            contenedor.innerHTML = '<p class="text-center text-muted">No tienes préstamos activos</p>';
        }
    } catch (error) {
        console.error('Error:', error);
        contenedor.innerHTML = '<p class="text-center text-danger">Error al cargar préstamos</p>';
    }
}