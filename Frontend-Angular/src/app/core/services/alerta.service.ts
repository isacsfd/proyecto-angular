import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

export interface ConfirmarOpciones {
  titulo: string;
  texto?: string;
  textoBoton?: string;
}

/**
 * AlertaService — centraliza SweetAlert2 en toda la aplicación.
 * No expone datos sensibles (solo mensajes controlados por la UI).
 */
@Injectable({ providedIn: 'root' })
export class AlertaService {
  exito(mensaje: string, titulo = 'Operación completada'): Promise<unknown> {
    return Swal.fire({
      icon: 'success',
      title: titulo,
      text: mensaje,
      confirmButtonText: 'Aceptar',
    });
  }

  error(mensaje: string, titulo = 'Ocurrió un error'): Promise<unknown> {
    return Swal.fire({
      icon: 'error',
      title: titulo,
      text: mensaje,
      confirmButtonText: 'Entendido',
    });
  }

  aviso(mensaje: string, titulo = 'Aviso'): Promise<unknown> {
    return Swal.fire({
      icon: 'info',
      title: titulo,
      text: mensaje,
      confirmButtonText: 'Aceptar',
    });
  }

  async confirmar(opciones: ConfirmarOpciones): Promise<boolean> {
    const resultado = await Swal.fire({
      icon: 'warning',
      title: opciones.titulo,
      text: opciones.texto ?? '',
      showCancelButton: true,
      confirmButtonText: opciones.textoBoton ?? 'Sí, continuar',
      cancelButtonText: 'Cancelar',
    });
    return resultado.isConfirmed === true;
  }
}