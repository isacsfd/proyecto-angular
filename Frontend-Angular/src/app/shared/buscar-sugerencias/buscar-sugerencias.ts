import {
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  Output,
  EventEmitter,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Libro, Usuario } from '../../core/models';

function normalizar(t: string): string {
  return (t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * BuscarSugerencias — input de búsqueda con autocompletado en vivo.
 * Muestra "posibles libros o estudiantes" a medida que se escribe.
 * En vistas de administrador se pasan [libros] y [usuarios]; en vistas de
 * usuario solo [libros].
 *
 * Usa [(termino)] para enlazar con el término de búsqueda del padre.
 */
@Component({
  selector: 'app-buscar-sugerencias',
  imports: [FormsModule],
  templateUrl: './buscar-sugerencias.html',
  styleUrl: './buscar-sugerencias.css',
  standalone: true,
})
export class BuscarSugerencias {
  @Input() libros: Libro[] = [];
  @Input() usuarios: Usuario[] = [];
  @Input() mostrarUsuarios = false;
  @Input() placeholder = 'Buscar...';
  @Input() maxLibros = 5;
  @Input() maxUsuarios = 5;

  @Input() termino = '';
  @Output() terminoChange = new EventEmitter<string>();
  @Output() seleccion = new EventEmitter<{ tipo: 'libro' | 'usuario'; valor: string }>();

  abierto = signal(false);

  private readonly el = inject(ElementRef).nativeElement as HTMLElement;

  librosFiltrados(): Libro[] {
    const f = normalizar(this.termino);
    if (!f) return [];
    const lista = this.libros.filter((l) => {
      const texto = normalizar(`${l.Titulo} ${l.Autor} ${l.Programa ?? ''} ${l.Editorial ?? ''}`);
      return texto.includes(f);
    });
    return lista.slice(0, this.maxLibros);
  }

  usuariosFiltrados(): Usuario[] {
    const f = normalizar(this.termino);
    if (!f) return [];
    const lista = this.usuarios.filter((u) => {
      const texto = normalizar(`${u.nombre} ${u.identificacion} ${u.carrera ?? ''} ${u.rol}`);
      return texto.includes(f);
    });
    return lista.slice(0, this.maxUsuarios);
  }

  hayResultados(): boolean {
    return this.librosFiltrados().length > 0 || (this.mostrarUsuarios && this.usuariosFiltrados().length > 0);
  }

  alEscribir(): void {
    this.abierto.set(true);
    this.terminoChange.emit(this.termino);
  }

  seleccionarLibro(event: MouseEvent, l: Libro): void {
    event.preventDefault();
    this.termino = l.Titulo;
    this.abierto.set(false);
    this.terminoChange.emit(this.termino);
    this.seleccion.emit({ tipo: 'libro', valor: l.Titulo });
  }

  seleccionarUsuario(event: MouseEvent, u: Usuario): void {
    event.preventDefault();
    this.termino = u.nombre;
    this.abierto.set(false);
    this.terminoChange.emit(this.termino);
    this.seleccion.emit({ tipo: 'usuario', valor: u.nombre });
  }

  cerrar(): void {
    this.abierto.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (!this.el.contains(event.target as Node)) {
      this.abierto.set(false);
    }
  }
}