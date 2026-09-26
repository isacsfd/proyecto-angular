/**
 * dashboard.js — Dashboard de estadísticas con Chart.js
 * =======================================================
 * MEJORA 5: Gráficas en tiempo real con datos del backend.
 *
 * DEPENDENCIA — agrega en el HTML antes de dashboard.js:
 *   <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
 */

const API_BASE = 'http://127.0.0.1:8000';

// ── Paleta de colores IUB ─────────────────────────────────────────────────────
const COLORES = {
    azul:     'rgba(13, 110, 253, 0.85)',
    verde:    'rgba(25, 135, 84, 0.85)',
    amarillo: 'rgba(255, 193, 7, 0.85)',
    rojo:     'rgba(220, 53, 69, 0.85)',
    gris:     'rgba(108, 117, 125, 0.85)',
    celeste:  'rgba(13, 202, 240, 0.85)',
};

// Referencias a las instancias de Chart (para destruirlas antes de redibujar)
let chartDisponibilidad = null;
let chartIngresosDia    = null;
let chartPrestamosEstado = null;
let chartTopUsuarios    = null;

// ── Función principal ─────────────────────────────────────────────────────────
async function cargarDashboard() {
    const token = sessionStorage.getItem('jwt_token');
    if (!token) return;

    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        const [resDispositivos, resPrestamos, resIngresos, resUsuarios] = await Promise.all([
            fetch(`${API_BASE}/dispositivos/`,             { headers }),
            fetch(`${API_BASE}/prestamos-dispositivos/`,   { headers }),
            fetch(`${API_BASE}/api/library-access/`,       { headers }),
            fetch(`${API_BASE}/usuarios/`,                 { headers }),
        ]);

        const dispositivos = resDispositivos.ok ? await resDispositivos.json() : [];
        const prestamos    = resPrestamos.ok    ? await resPrestamos.json()    : [];
        const ingresos     = resIngresos.ok     ? await resIngresos.json()     : [];
        const usuarios     = resUsuarios.ok     ? await resUsuarios.json()     : [];

        // ── Tarjetas de resumen ───────────────────────────────────────────────
        _actualizarTarjeta('cardTotalUsuarios',     usuarios.length);
        _actualizarTarjeta('cardTotalDispositivos', dispositivos.length);
        _actualizarTarjeta('cardIngresosHoy',       _ingresosHoy(ingresos));
        _actualizarTarjeta('cardPrestamosActivos',  prestamos.filter(p => p.estado === 'Activo').length);

        // ── Gráficas ──────────────────────────────────────────────────────────
        _graficarDisponibilidad(dispositivos);
        _graficarIngresosPorDia(ingresos);
        _graficarPrestamosEstado(prestamos);
        _graficarTopUsuarios(ingresos);

    } catch (e) {
        console.error('[dashboard.js] Error al cargar datos:', e);
    }
}

// ── Tarjetas ──────────────────────────────────────────────────────────────────
function _actualizarTarjeta(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
}

function _ingresosHoy(ingresos) {
    const hoy = new Date().toDateString();
    return ingresos.filter(i => new Date(i.created_at).toDateString() === hoy).length;
}

// ── Gráfica 1: Disponibilidad de dispositivos (dona) ─────────────────────────
function _graficarDisponibilidad(dispositivos) {
    const canvas = document.getElementById('chartDisponibilidad');
    if (!canvas) return;

    const disponibles    = dispositivos.filter(d => d.estado === 'Disponible').length;
    const prestados      = dispositivos.filter(d => d.estado === 'Prestado').length;
    const mantenimiento  = dispositivos.filter(d => d.estado === 'En Mantenimiento').length;
    const danados        = dispositivos.filter(d => d.estado === 'Dañado').length;

    if (chartDisponibilidad) chartDisponibilidad.destroy();

    chartDisponibilidad = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Disponibles', 'Prestados', 'En Mantenimiento', 'Dañados'],
            datasets: [{
                data: [disponibles, prestados, mantenimiento, danados],
                backgroundColor: [COLORES.verde, COLORES.azul, COLORES.amarillo, COLORES.rojo],
                borderWidth: 2,
                borderColor: '#fff',
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                title: { display: false },
            }
        }
    });
}

// ── Gráfica 2: Ingresos por día (últimos 7 días, barras) ─────────────────────
function _graficarIngresosPorDia(ingresos) {
    const canvas = document.getElementById('chartIngresosDia');
    if (!canvas) return;

    // Generar etiquetas para los últimos 7 días
    const dias = [];
    const conteos = [];
    for (let i = 6; i >= 0; i--) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        const etiqueta = fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });
        const fechaStr = fecha.toDateString();
        dias.push(etiqueta);
        conteos.push(ingresos.filter(ing => new Date(ing.created_at).toDateString() === fechaStr).length);
    }

    if (chartIngresosDia) chartIngresosDia.destroy();

    chartIngresosDia = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: dias,
            datasets: [{
                label: 'Ingresos',
                data: conteos,
                backgroundColor: COLORES.azul,
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

// ── Gráfica 3: Estado de préstamos (pastel) ───────────────────────────────────
function _graficarPrestamosEstado(prestamos) {
    const canvas = document.getElementById('chartPrestamosEstado');
    if (!canvas) return;

    const activos    = prestamos.filter(p => p.estado === 'Activo').length;
    const completados = prestamos.filter(p => p.estado === 'Completado').length;
    const danados    = prestamos.filter(p => p.estado === 'Dañado').length;

    if (chartPrestamosEstado) chartPrestamosEstado.destroy();

    chartPrestamosEstado = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: ['Activos', 'Completados', 'Dañados'],
            datasets: [{
                data: [activos, completados, danados],
                backgroundColor: [COLORES.azul, COLORES.verde, COLORES.rojo],
                borderWidth: 2,
                borderColor: '#fff',
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// ── Gráfica 4: Top 5 usuarios con más ingresos (barras horizontales) ──────────
function _graficarTopUsuarios(ingresos) {
    const canvas = document.getElementById('chartTopUsuarios');
    if (!canvas) return;

    // Contar ingresos por usuario
    const contadorUsuarios = {};
    ingresos.forEach(ing => {
        const nombre = ing.user_name || 'Desconocido';
        contadorUsuarios[nombre] = (contadorUsuarios[nombre] || 0) + 1;
    });

    // Ordenar y tomar top 5
    const top5 = Object.entries(contadorUsuarios)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (chartTopUsuarios) chartTopUsuarios.destroy();

    chartTopUsuarios = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: top5.map(([nombre]) => nombre),
            datasets: [{
                label: 'Ingresos',
                data: top5.map(([, count]) => count),
                backgroundColor: [COLORES.azul, COLORES.verde, COLORES.celeste, COLORES.amarillo, COLORES.gris],
                borderRadius: 6,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

// ── Auto-actualizar cada 60 segundos ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    cargarDashboard();
    setInterval(cargarDashboard, 60000);
});