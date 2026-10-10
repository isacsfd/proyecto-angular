import { firstValueFrom } from 'rxjs';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Recomendacion, EstadoIA } from '../../../../core/models';

@Component({
  selector: 'app-user-inicio',
  imports: [RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class UserInicio {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  recomendaciones = signal<Recomendacion[]>([]);
  estadoIa = signal<EstadoIA | null>(null);
  cargando = signal(true);
  error = signal('');

  constructor() {
    this.cargar();
  }

  nombre(): string {
    return this.auth.usuario()?.nombre ?? '';
  }

  carrera(): string {
    return this.auth.usuario()?.carrera ?? '';
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const [recomendaciones, estado] = await Promise.all([
        firstValueFrom(this.api.recomendaciones(5)),
        firstValueFrom(this.api.estadoIA()),
      ]);
      this.recomendaciones.set(recomendaciones);
      this.estadoIa.set(estado);
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'No se pudieron cargar las recomendaciones.');
    } finally {
      this.cargando.set(false);
    }
  }
}