let booksData = {}

const URL = "http://127.0.0.1:8000/";
const booksContainer = document.getElementById('books-container');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const categoryTitle = document.querySelector('h1.display-5');

const urlParams = new URLSearchParams(window.location.search);
const categoria = urlParams.get('categoria') || 'basica';

const titles = {
    basica: "Básica y Transversales",
    economicas: "Ciencias Económicas y Administrativas",
    diseno: "Diseño Gráfico",
    industrial: "Ingeniería Industrial",
    electrica: "Ingeniería Eléctrica",
    seguridad: "Ingeniería en Seguridad y Salud en el Trabajo",
    mecatronica: "Ingeniería Mecatrónica",
    telematica: "Ingeniería Telemática",
    licenciatura: "Licenciatura"
};

function setCategoryTitle() {
    categoryTitle.textContent = `"${titles[categoria] || 'Categoría desconocida'}"`;
}

function renderBooks(books) {
    booksContainer.innerHTML = '';
    if (books.length === 0) {
        booksContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <h3 class="text-muted">No se encontraron libros</h3>
                <p>Intenta con otros términos de búsqueda</p>
            </div>
        `;
        return;
    }
    books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'col-md-6 col-lg-4';
        bookCard.innerHTML = `
            <div class="book-card card h-100 shadow" data-book-id="${book.ID}">
                <div class="card-body d-flex">
                    <div class="me-3">
                        <i class="bi bi-journal-bookmark fs-2"></i>
                    </div>
                    <div>
                        <h3 class="card-title h5">${book.Titulo}</h3>
                        <p class="card-subtitle mb-2 text-muted">${book.Autor}</p>
                    </div>
                </div>
            </div>
        `;
        booksContainer.appendChild(bookCard);
    });
    setupBookCards();
}

function setupBookCards() {
    document.querySelectorAll('.book-card').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function() {
            const bookId = this.getAttribute('data-book-id');
            const book = booksData.find(b => b.ID == bookId);
            if (book) {
                localStorage.setItem('libroSeleccionado', JSON.stringify(book));
                window.location.href = '../interfaces de usuario/Prestamouser.html';
            }
        });
    });
}

function filterBooks() {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredBooks = booksData?.filter(book =>
        book.Titulo.toLowerCase().includes(searchTerm) ||
        book.Autor.toLowerCase().includes(searchTerm)
    ) || [];
    renderBooks(filteredBooks);
}

async function fetchAndRenderBooks() {
    try {
        const response = await fetch(`${URL}libros/categoria?categoria=${categoria}`);
        if (!response.ok) throw new Error('Error al cargar libros');
        const books = await response.json();
        booksData = books;
        renderBooks(books);
    } catch (error) {
        console.error(error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setCategoryTitle();
    fetchAndRenderBooks();
});

searchInput.addEventListener('input', filterBooks);
searchButton.addEventListener('click', filterBooks);