import { describe, it, expect } from 'vitest';

import { construirUrlWebSocket } from './chat-url';

describe('construirUrlWebSocket', () => {
  it('convierte la apiUrl https de producción a wss con la ruta del chat', () => {
    expect(construirUrlWebSocket('https://biblioteca-iub-api.onrender.com', 'tok'))
      .toBe('wss://biblioteca-iub-api.onrender.com/api/chat/ws?token=tok');
  });

  it('convierte la apiUrl http de desarrollo a ws', () => {
    expect(construirUrlWebSocket('http://127.0.0.1:8000', 'abc'))
      .toBe('ws://127.0.0.1:8000/api/chat/ws?token=abc');
  });

  it('tolera barra final en la apiUrl sin duplicar la ruta', () => {
    expect(construirUrlWebSocket('https://api.example.com/', 't'))
      .toBe('wss://api.example.com/api/chat/ws?token=t');
  });

  it('codifica el token como parámetro de consulta seguro', () => {
    const url = construirUrlWebSocket('http://localhost:8000', 'a.b+c+d');
    expect(url).toContain('token=a.b%2Bc%2Bd');
    expect(url).not.toContain('a.b+c+d');
  });

  it('respeta una ruta personalizada cuando se indica', () => {
    expect(construirUrlWebSocket('http://h:1234', 't', '/ws/chat'))
      .toBe('ws://h:1234/ws/chat?token=t');
  });

  it('preserva el puerto de la apiUrl', () => {
    expect(construirUrlWebSocket('https://api.example.com:8443', 't'))
      .toBe('wss://api.example.com:8443/api/chat/ws?token=t');
  });
});
