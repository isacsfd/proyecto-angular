import { HttpRequest, HttpResponse } from '@angular/common/http';
import { HttpHandlerFn } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { describe, it, expect, beforeEach } from 'vitest';

import { demoInterceptor } from './demo.interceptor';
import { DemoService } from '../services/demo.service';

function invocar(req: HttpRequest<unknown>) {
  let backend = false;
  const next: HttpHandlerFn = () => {
    backend = true;
    return of(new HttpResponse({ status: 200, body: [] }));
  };
  return {
    obs: TestBed.runInInjectionContext(() => demoInterceptor(req, next)),
    llamoBackend: () => backend,
  };
}

describe('demoInterceptor', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [DemoService] });
    sessionStorage.clear();
  });

  it('en modo real, la petición sigue hacia el backend', async () => {
    const { obs, llamoBackend } = invocar(new HttpRequest('GET', 'https://api.test/usuarios/'));
    const r = (await firstValueFrom(obs)) as HttpResponse<unknown>;
    expect(llamoBackend()).toBe(true);
    expect(r.status).toBe(200);
  });

  it('en modo demo responde con datos simulados sin llamar al backend', async () => {
    TestBed.inject(DemoService).activar('Estudiante');
    const { obs, llamoBackend } = invocar(new HttpRequest('GET', 'https://api.test/usuarios/'));
    const r = (await firstValueFrom(obs)) as HttpResponse<unknown>;
    expect(llamoBackend()).toBe(false);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    expect((r.body as unknown[]).length).toBeGreaterThan(0);
  });

  it('mientras está activo, una petición protegida no sale al backend', async () => {
    TestBed.inject(DemoService).activar('Estudiante');
    const { obs, llamoBackend } = invocar(new HttpRequest('GET', 'https://api.test/loan/'));
    await firstValueFrom(obs);
    expect(llamoBackend()).toBe(false);
  });

  it('un endpoint no mapeado en demo responde lista vacía sin salir al backend', async () => {
    TestBed.inject(DemoService).activar('Estudiante');
    const { obs, llamoBackend } = invocar(new HttpRequest('GET', 'https://api.test/ruta-desconocida'));
    const r = (await firstValueFrom(obs)) as HttpResponse<unknown>;
    expect(llamoBackend()).toBe(false);
    expect(Array.isArray(r.body)).toBe(true);
    expect((r.body as unknown[]).length).toBe(0);
  });
});