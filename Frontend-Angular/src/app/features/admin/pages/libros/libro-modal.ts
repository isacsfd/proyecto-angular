import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Libro } from '../../../../core/models';

export interface LibroDatos {
  id: number | null;
  Autor: string;
  Titulo: string;
  Programa?: string;
  Item?: number;
  Signatura?: string;
  Areas?: number;
  Ejemplar?: number;
  Editorial?: string;
  Año?: number;
  Idioma?: string;
  sede?: string;
  Precio?: string;
  Proveedor?: string;
  Observaciones?: string;
}

@Component({
  selector: 'app-libro-modal',
  imports: [FormsModule],
  templateUrl: './libro-modal.html',
  styleUrl: './libro-modal.css',
})
export class LibroModal {
  @Input() libro: Libro | null = null;
  @Input() sedes: Array<{ clave: string; nombre: string }> = [];
  @Input() sedePorDefecto = 'Soledad';
  @Input() guardando = false;
  @Output() guardar = new EventEmitter<LibroDatos>();
  @Output() cerrar = new EventEmitter<void>();

  mensaje = signal('');
  enviando = false;

  form: any = {};

  ngOnChanges(): void {
    this._iniciarForm();
  }

  private _iniciarForm(): void {
    const base = {
      Autor: '',
      Titulo: '',
      Programa: '',
      Item: 0,
      Signatura: '',
      Areas: 0,
      Ejemplar: 1,
      Editorial: '',
      Año: new Date().getFullYear(),
      Idioma: 'Español',
      sede: this.sedePorDefecto,
      Precio: '',
      Proveedor: '',
      Observaciones: '',
    };
    if (this.libro) {
      this.form = { ...base, ...this.libro };
    } else {
      this.form = { ...base };
    }
  }

  esEdicion(): boolean {
    return this.libro !== null;
  }

  guardarLibro(): void {
    this.mensaje.set('');
    if (!this.form.Titulo || !this.form.Autor) {
      this.mensaje.set('Título y autor son obligatorios.');
      return;
    }
    if (this.enviando || this.guardando) return;
    this.enviando = true;
    this.guardar.emit({
      id: this.libro?.ID ?? null,
      Autor: this.form.Autor,
      Titulo: this.form.Titulo,
      Programa: this.form.Programa,
      Item: this.form.Item,
      Signatura: this.form.Signatura,
      Areas: this.form.Areas,
      Ejemplar: this.form.Ejemplar,
      Editorial: this.form.Editorial,
      Año: this.form['Año'],
      Idioma: this.form.Idioma,
      sede: this.form.sede,
      Precio: this.form.Precio,
      Proveedor: this.form.Proveedor,
      Observaciones: this.form.Observaciones,
    });
  }

  cerrarModal(): void {
    if (this.enviando || this.guardando) return;
    this.cerrar.emit();
  }
}