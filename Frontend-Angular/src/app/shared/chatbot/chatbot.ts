import { firstValueFrom } from 'rxjs';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface Mensaje {
  texto: string;
  autor: 'bot' | 'user';
}

@Component({
  selector: 'app-chatbot',
  imports: [FormsModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css',
})
export class Chatbot {
  private readonly api = inject(ApiService);

  abierto = signal(false);
  mensajes = signal<Mensaje[]>([
    {
      texto:
        '¡Hola! Soy IUBot, el asistente virtual de la Biblioteca. Puedo ayudarte a buscar libros, recomendarte lecturas o resolver dudas del reglamento.',
      autor: 'bot',
    },
  ]);
  texto = '';
  escribiendo = signal(false);
  motor = signal('');

  alternar(): void {
    this.abierto.update((v) => !v);
  }

  async enviar(): Promise<void> {
    const mensaje = this.texto.trim();
    if (!mensaje || this.escribiendo()) return;
    this.texto = '';
    this.mensajes.update((m) => [...m, { texto: mensaje, autor: 'user' }]);
    this.escribiendo.set(true);
    try {
      const res = await firstValueFrom(this.api.chat(mensaje));
      this.mensajes.update((m) => [...m, { texto: res.respuesta, autor: 'bot' }]);
      this.motor.set(res.motor);
    } catch {
      this.mensajes.update((m) => [
        ...m,
        { texto: 'No pude conectar con el asistente. Intente de nuevo.', autor: 'bot' },
      ]);
    } finally {
      this.escribiendo.set(false);
    }
  }
}