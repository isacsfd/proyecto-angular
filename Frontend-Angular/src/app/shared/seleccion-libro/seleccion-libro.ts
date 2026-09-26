import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { LibroBuscar } from '../../core/models';

const MIN_CARACTERES = 2;
const DEBOUNCE_MS = 300;

/**
 * SeleccionLibro — Búsqueda inteligente de libros con autocompletado.
 * Reemplaza el <select> de libros en los formularios de préstamo.
 *
 * - Busca en el backend (/libros/buscar) por título, autor o signatura.
 * - Debounce de 300 ms, mínimo 2 caracteres, máx. 8 sugerencias.
 * - Navegación con teclado (↑/↓/Enter/Escape) y cierre al hacer clic fuera.
 * - Conserva internamente el ID real del libro y lo emite con [(libroId)].
 */
@Component({
  selector: 'app-seleccion-libro',
  imports: [FormsModule],
  templateUrl: './seleccion-libro.html',
  styleUrl: './seleccion-libro.css',
  standalone: true,
})
export class SeleccionLibro implements OnChanges {
  private readonly api = inject(ApiService);
  private readonly el = inject(ElementRef).nativeElement as HTMLElement;

  @Input() libroId: number | null = null;
  @Input() placeholder = 'Buscar libro...';
  @Input() sede = '';
  @Output() libroIdChange = new EventEmitter<number | null>();
  @Output() seleccion = new EventEmitter<LibroBuscar>();

  texto = '';
  sugerencias = signal<LibroBuscar[]>([]);
  abierto = signal(false);
  cargando = signal(false);
  indice = signal(-1);

  private seleccionado: LibroBuscar | null = null;
  private debounce: any = null;
  private peticionId = 0;
  private cambioInterno = false;

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['libroId']) {
      if (this.cambioInterno) {
        this.cambioInterno = false;
        return;
      }
      if (this.libroId == null && this.seleccionado) {
        this.seleccionado = null;
        this.texto = '';
        this.sugerencias.set([]);
      }
    }
  }

  alEscribir(): void {
    // Si el usuario modifica el texto tras seleccionar, se limpia la selección
    if (this.seleccionado && this.texto !== this.textoSeleccionado()) {
      this.limpiarSeleccion();
    }
    this.abierto.set(true);
    if (this.debounce) clearTimeout(this.debounce);
    const termino = this.texto.trim();
    if (termino.length < MIN_CARACTERES) {
      this.sugerencias.set([]);
      this.cargando.set(false);
      this.indice.set(-1);
      return;
    }
    this.debounce = setTimeout(() => this.buscar(termino), DEBOUNCE_MS);
  }

  onFocus(): void {
    // Si ya hay un libro seleccionado, no reaparece la lista anterior
    if (this.seleccionado) {
      this.abierto.set(false);
      return;
    }
    this.abierto.set(true);
  }

  private textoSeleccionado(): string {
    return this.seleccionado
      ? `${this.seleccionado.titulo} — ${this.seleccionado.autor}`
      : '';
  }

  private limpiarSeleccion(): void {
    this.seleccionado = null;
    this.cambioInterno = true;
    this.libroId = null;
    this.libroIdChange.emit(null);
  }

  private async buscar(termino: string): Promise<void> {
    const id = ++this.peticionId;
    this.cargando.set(true);
    try {
      const resultados = await firstValueFrom(this.api.buscarLibros(termino, 8, this.sede));
      if (id !== this.peticionId) return; // resultado obsoleto: ignorar
      this.sugerencias.set(resultados);
      this.indice.set(-1);
    } catch {
      if (id !== this.peticionId) return;
      this.sugerencias.set([]);
    } finally {
      if (id === this.peticionId) this.cargando.set(false);
    }
  }

  seleccionar(s: LibroBuscar): void {
    this.seleccionado = s;
    this.texto = this.textoSeleccionado();
    this.abierto.set(false);
    this.indice.set(-1);
    this.cambioInterno = true;
    this.libroId = s.id;
    this.libroIdChange.emit(s.id);
    this.seleccion.emit(s);
  }

  onKeydown(event: KeyboardEvent): void {
    const lista = this.sugerencias();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!lista.length) return;
      this.abierto.set(true);
      this.indice.set((this.indice() + 1) % lista.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!lista.length) return;
      this.abierto.set(true);
      this.indice.set((this.indice() - 1 + lista.length) % lista.length);
    } else if (event.key === 'Enter') {
      if (this.abierto() && this.indice() >= 0 && lista[this.indice()]) {
        event.preventDefault();
        this.seleccionar(lista[this.indice()]);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.abierto.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (!this.el.contains(event.target as Node)) {
      this.abierto.set(false);
    }
  }
}