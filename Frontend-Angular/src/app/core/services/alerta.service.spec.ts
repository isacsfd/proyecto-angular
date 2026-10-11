import { describe, it, expect, vi, beforeEach } from 'vitest';

const { fireMock } = vi.hoisted(() => ({ fireMock: vi.fn() }));

vi.mock('sweetalert2', () => ({ default: { fire: fireMock } }));

import { AlertaService } from './alerta.service';

describe('AlertaService', () => {
  let servicio: AlertaService;

  beforeEach(() => {
    fireMock.mockReset();
    fireMock.mockResolvedValue({ isConfirmed: true });
    servicio = new AlertaService();
  });

  it('exito muestra un cuadro de diálogo con icono de éxito', async () => {
    await servicio.exito('Guardado correctamente');
    expect(fireMock).toHaveBeenCalledTimes(1);
    const opciones = fireMock.mock.calls[0][0] as { icon: string; text: string };
    expect(opciones.icon).toBe('success');
    expect(opciones.text).toBe('Guardado correctamente');
  });

  it('error muestra un cuadro de diálogo con icono de error', async () => {
    await servicio.error('No se pudo conectar');
    const opciones = fireMock.mock.calls[0][0] as { icon: string };
    expect(opciones.icon).toBe('error');
  });

  it('confirmar devuelve true si el usuario confirma', async () => {
    fireMock.mockResolvedValueOnce({ isConfirmed: true });
    await expect(servicio.confirmar({ titulo: '¿Continuar?' })).resolves.toBe(true);
  });

  it('confirmar devuelve false si el usuario cancela', async () => {
    fireMock.mockResolvedValueOnce({ isConfirmed: false });
    await expect(servicio.confirmar({ titulo: '¿Continuar?' })).resolves.toBe(false);
  });
});