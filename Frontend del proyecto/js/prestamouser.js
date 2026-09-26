document.addEventListener('DOMContentLoaded', function () {
    const userData = JSON.parse(localStorage.getItem('userData'));
    const libroData = JSON.parse(localStorage.getItem('libroSeleccionado'));

    document.getElementById('form-buscar-libro').addEventListener('submit', async function (e) {
        e.preventDefault();
        const termino = document.getElementById('input-buscar-libro').value.trim();
        if (termino) {
            await buscarLibroExacto(termino);
        }
    });

    if (libroData) {
        mostrarLibroSeleccionado(libroData);
        configurarBotonPrestamo(libroData, userData);
    } else {
        document.querySelector('.cont-libro-seleccionado').style.display = 'none';
    }

    if (userData) {
        cargarPrestamosPendientes();
    }
});

async function buscarLibroExacto(titulo) {
    try {
        const response = await fetch('http://127.0.0.1:8000/libros/');
        if (!response.ok) throw new Error('Error al buscar libros');

        const libros = await response.json();
        const libroEncontrado = libros.find(libro =>
            libro.Titulo.toLowerCase() === titulo.toLowerCase()
        );

        if (libroEncontrado) {
            mostrarLibroSeleccionado(libroEncontrado);
            localStorage.setItem('libroSeleccionado', JSON.stringify(libroEncontrado));

            const userData = JSON.parse(localStorage.getItem('userData'));
            if (userData) {
                configurarBotonPrestamo(libroEncontrado, userData);
            }
        } else {
            alert('Libro no disponible');
            document.getElementById('libro-titulo').textContent = 'Libro no disponible';
            document.getElementById('libro-autor').textContent = '';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al buscar el libro');
    }
}

function mostrarLibroSeleccionado(libroData) {
    document.getElementById('libro-titulo').textContent = libroData.Titulo;
    document.getElementById('libro-autor').textContent = libroData.Autor;
    document.querySelector('.cont-libro-seleccionado').style.display = 'block';
}

function configurarBotonPrestamo(libroData, userData) {
    const btnPrestar = document.getElementById('btn-prestar');
    btnPrestar.onclick = null;
    btnPrestar.addEventListener('click', function () {
        if (!userData) {
            alert('Debe iniciar sesión para realizar préstamos');
            window.location.href = '../login.html';
            return;
        }
        realizarPrestamo(libroData.ID, userData.id);
    });
}

async function realizarPrestamo(libroId, userId) {
    const btnPrestar = document.getElementById('btn-prestar');
    btnPrestar.disabled = true;
    btnPrestar.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Procesando...';

    try {
        const fechaActual = new Date().toISOString();
        const fechaEntrega = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const response = await fetch('http://127.0.0.1:8000/loan/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                book_id: libroId,
                loan_date: fechaActual,
                delivery_date: fechaEntrega,
                prestamo_state: "No Aprobado"
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al realizar el préstamo');
        }

        alert('Préstamo realizado con éxito');
        window.location.reload();
        localStorage.removeItem('libroSeleccionado');
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    } finally {
        btnPrestar.disabled = false;
        btnPrestar.textContent = 'Prestar';
    }
}

async function cargarPrestamosPendientes() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData) return;

    const contenedor = document.getElementById('prestamos-pendientes');
    contenedor.innerHTML = '<p class="text-center text-muted">Cargando préstamos...</p>';

    try {
        const response = await fetch(`http://127.0.0.1:8000/loan/`);
        if (!response.ok) throw new Error('Error al cargar préstamos');

        const prestamos = await response.json();
        const pendientes = prestamos.filter(p => p.user_id === userData.id && p.state !== 'Devuelto');

        if (pendientes.length > 0) {
            contenedor.innerHTML = pendientes.map(p => `
                <div class="mb-3 border-bottom pb-2">
                    <p class="mb-1"><strong>${p.book}</strong></p>
                    <p class="mb-1 small">Estado de prestamo: <span class="badge ${p.state === 'Activo' ? 'bg-success' : 'bg-warning'}">${p.state}</span></p>
                    <p class="mb-1 small">Validacion: <span class="badge ${p.prestamo_state === 'No Aprobado' || p.prestamo_state === 'Rechazado' ? 'bg-warning' : 'bg-success'}">${p.prestamo_state}</span></p>
                    <p class="mb-1 small">Fecha entrega: ${new Date(p.delivery_date).toLocaleDateString()}</p>
                    ${p.prestamo_state === 'Aprobado'
                    ? `<button class="btn btn-sm btn-outline-primary" onclick="devolverPrestamo(${p.id})">Marcar como devuelto</button>`
                    : ''
                }
                </div>
            `).join('');
        } else {
            contenedor.innerHTML = '<p class="text-center text-muted">No tienes préstamos pendientes</p>';
        }
    } catch (error) {
        console.error('Error:', error);
        contenedor.innerHTML = '<p class="text-center text-danger">Error al cargar préstamos</p>';
    }
}

async function devolverPrestamo(loanId) {
    try {
        const response = await fetch(`http://127.0.0.1:8000/loan/${loanId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                state: "Devuelto",
                entry_date: new Date().toISOString()
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al marcar como devuelto');
        }

        alert('Libro devuelto correctamente');
        cargarPrestamosPendientes();
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}
