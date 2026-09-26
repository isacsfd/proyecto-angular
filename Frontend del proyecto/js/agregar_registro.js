document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('prestamoForm');
    const codigoLibroInput = document.getElementById('codigo_libro');
    const identificacionUsuarioInput = document.getElementById('identificacion_usuario');
    const libroInfoDiv = document.getElementById('libroInfo');
    const usuarioInfoDiv = document.getElementById('usuarioInfo');
    
    const fechaActual = new Date().toISOString().split('T')[0];
    const fechaDevolucion = new Date();
    fechaDevolucion.setDate(fechaDevolucion.getDate() + 5);
    const fechaDevolucionStr = fechaDevolucion.toISOString().split('T')[0];
    
    document.getElementById('fecha_prestamo').value = fechaActual;
    document.getElementById('fecha_devolucion').value = fechaDevolucionStr;
    
    codigoLibroInput.addEventListener('change', async function() {
        const codigoLibro = this.value.trim();
        if (codigoLibro) {
            try {
                const response = await fetch(`http://127.0.0.1:8000/libros/${codigoLibro}`);
                if (!response.ok) {
                    throw new Error('Libro no encontrado');
                }
                const libro = await response.json();
                
                document.getElementById('titulo').value = libro.Titulo;
                document.getElementById('datos_libro').value = 
                    `Autor: ${libro.Autor}\nEditorial: ${libro.Editorial}\nAño: ${libro.Año}\nIdioma: ${libro.Idioma}`;
                
                libroInfoDiv.innerHTML = `<div class="alert alert-success">Libro encontrado: ${libro.Titulo}</div>`;
                
                if (libro.Ejemplar <= 0) {
                    libroInfoDiv.innerHTML += `<div class="alert alert-warning mt-2">No hay ejemplares disponibles</div>`;
                }
            } catch (error) {
                libroInfoDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
                document.getElementById('titulo').value = '';
                document.getElementById('datos_libro').value = '';
            }
        }
    });

    identificacionUsuarioInput.addEventListener('change', async function() {
        const identificacion = this.value.trim();
        if (identificacion) {
            try {
                const response = await fetch(`http://127.0.0.1:8000/usuarios/`);
                if (!response.ok) {
                    throw new Error('Error al buscar usuarios');
                }
                const usuarios = await response.json();
                const usuario = usuarios.find(u => u.identificacion === identificacion);
                
                if (usuario) {
                    document.getElementById('nombre').value = usuario.nombre;
                    document.getElementById('datos').value = 
                        `Identificación: ${usuario.identificacion}\nTipo: ${usuario.tipo || 'No especificado'}\n` +
                        `Nivel Académico: ${usuario.nivel_academico || 'No especificado'}\n` +
                        `Carrera: ${usuario.carrera || 'No especificado'}`;
                    
                    usuarioInfoDiv.innerHTML = `<div class="alert alert-success">Usuario encontrado: ${usuario.nombre}</div>`;
                } else {
                    throw new Error('Usuario no encontrado');
                }
            } catch (error) {
                usuarioInfoDiv.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
                document.getElementById('nombre').value = '';
                document.getElementById('datos').value = '';
            }
        }
    });
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const camposRequeridos = document.querySelectorAll('[required]');
        let valido = true;
        
        camposRequeridos.forEach(campo => {
            if (!campo.value.trim()) {
                campo.classList.add('is-invalid');
                valido = false;
            } else {
                campo.classList.remove('is-invalid');
            }
        });
        
        if (!valido) {
            alert('Por favor, complete todos los campos requeridos.');
            return;
        }
        
        const codigoLibro = document.getElementById('codigo_libro').value;
        const identificacionUsuario = document.getElementById('identificacion_usuario').value;
        const fechaPrestamo = document.getElementById('fecha_prestamo').value;
        const fechaDevolucion = document.getElementById('fecha_devolucion').value;
        
        try {
            const usuariosResponse = await fetch(`http://127.0.0.1:8000/usuarios/`);
            if (!usuariosResponse.ok) throw new Error('Error al buscar usuarios');
            const usuarios = await usuariosResponse.json();
            const usuario = usuarios.find(u => u.identificacion === identificacionUsuario);
            
            if (!usuario) throw new Error('Usuario no encontrado');
            
            const prestamoData = {
                user_id: usuario.id,
                book_id: parseInt(codigoLibro),
                loan_date: fechaPrestamo + 'T00:00:00',
                delivery_date: fechaDevolucion + 'T00:00:00',
                prestamo_state: 'Aprobado', 
                state: 'Activo'             
            };
            
            const response = await fetch('http://127.0.0.1:8000/loan/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(prestamoData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error al crear el préstamo');
            }
            
            alert('¡Préstamo creado con éxito!');
            window.location.href = 'Prestamos.html';
            
        } catch (error) {
            alert(`Error: ${error.message}`);
            console.error('Error al crear préstamo:', error);
        }
    });
    
    document.getElementById('cancelarBtn').addEventListener('click', function() {
        if (confirm('¿Está seguro que desea cancelar? Los datos no guardados se perderán.')) {
            window.location.href = 'Prestamos.html';
        }
    });
});