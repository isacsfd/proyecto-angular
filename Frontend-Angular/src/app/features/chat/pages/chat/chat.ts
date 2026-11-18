import { Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { construirUrlWebSocket } from '../../../../core/services/chat-url';
import { environment } from '../../../../../environments/environment';
import { ChatEventoWS, ChatMensajeWS, ChatPresenciaWS } from '../../../../core/models';

/** Reintentos automáticos de reconexión antes de exigir acción manual. */
const MAX_REINTENTOS = 10;
const MS_REINTENTO = 3000;
/** Ping de mantenimiento: mantiene la conexión viva tras proxies (Render). */
const MS_PING = 30000;

/**
 * ChatEnVivo — Chat institucional en tiempo real (WebSocket, parcial 2).
 * Distinto del chatbot IA: aquí los mensajes se distribuyen entre los
 * usuarios conectados. Se usa tanto en el panel admin como en el portal
 * del usuario; el backend autentica el JWT y difunde presencia + mensajes.
 */
@Component({
  selector: 'app-chat-en-vivo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class ChatEnVivo implements OnDestroy {
  private readonly auth = inject(AuthService);

  readonly messages = signal<ChatMensajeWS[]>([]);
  readonly users = signal<{ id: number; name: string }[]>([]);
  readonly connected = signal(false);
  readonly estado = signal('');
  readonly draft = signal('');

  private socket: WebSocket | null = null;
  private destruido = false;
  private intentos = 0;
  private temporizadorReconexion: number | null = null;
  private temporizadorPing: number | null = null;

  private readonly contenedorMensajes = viewChild<ElementRef<HTMLElement>>('.chat-messages');

  constructor() {
    this.conectar();
  }

  private conectar(): void {
    const token = this.auth.getToken();
    if (!token) {
      this.estado.set('Necesita iniciar sesión para usar el chat.');
      return;
    }
    this.estado.set('');
    const socket = new WebSocket(construirUrlWebSocket(environment.apiUrl, token));
    this.socket = socket;

    socket.onopen = () => {
      this.connected.set(true);
      this.intentos = 0;
      this.estado.set('');
      this.iniciarPing();
    };

    socket.onmessage = (evento: MessageEvent<string>) => {
      let dato: ChatEventoWS;
      try {
        dato = JSON.parse(evento.data) as ChatEventoWS;
      } catch {
        return; // trama corrupta: se ignora sin romper la sesión
      };
      if (dato.type === 'presence') {
        this.users.set((dato as ChatPresenciaWS).users);
      } else if (dato.type === 'message') {
        this.messages.update((items) => [...items, dato as ChatMensajeWS]);
        this.hacerScrollAbajo();
      }
    };

    socket.onclose = (evento: CloseEvent) => {
      this.connected.set(false);
      this.detenerPing();
      if (this.destruido) return;
      this.intentos += 1;
      if (this.intentos <= MAX_REINTENTOS) {
        this.estado.set(
          `Conexión perdida${evento.reason ? ` (${evento.reason})` : ''}. Reintentando…`,
        );
        this.temporizadorReconexion = window.setTimeout(() => this.conectar(), MS_REINTENTO);
      } else {
        this.estado.set('No se pudo mantener la conexión. Pulse «Reintentar».');
      }
    };

    socket.onerror = () => {
      // El detalle llega en onclose (reconexión); aquí solo se marca el estado.
      if (this.intentos === 0 && !this.connected()) this.estado.set('Conectando al chat…');
    };
  }

  /** Reconexión manual tras agotar los reintentos automáticos. */
  reintentar(): void {
    this.intentos = 0;
    this.conectar();
  }

  esPropio(mensaje: ChatMensajeWS): boolean {
    return mensaje.user_id === this.auth.usuario()?.id;
  }

  /** ¿El usuario de la lista de presencia es quien mira la página? */
  esUsuarioActual(id: number): boolean {
    return this.auth.usuario()?.id === id;
  }

  /** ¿Se agotaron los reintentos automáticos de reconexión? */
  intentosAgotados(): boolean {
    return this.intentos >= MAX_REINTENTOS;
  }

  enviar(): void {
    const mensaje = this.draft().trim();
    if (!mensaje || this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ message: mensaje }));
    this.draft.set('');
  }

  private iniciarPing(): void {
    this.detenerPing();
    this.temporizadorPing = window.setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, MS_PING);
  }

  private detenerPing(): void {
    if (this.temporizadorPing !== null) {
      window.clearInterval(this.temporizadorPing);
      this.temporizadorPing = null;
    }
  }

  private hacerScrollAbajo(): void {
    queueMicrotask(() => {
      const elemento = this.contenedorMensajes()?.nativeElement;
      if (elemento) elemento.scrollTop = elemento.scrollHeight;
    });
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.detenerPing();
    if (this.temporizadorReconexion !== null) {
      window.clearTimeout(this.temporizadorReconexion);
      this.temporizadorReconexion = null;
    }
    this.socket?.close();
  }
}
