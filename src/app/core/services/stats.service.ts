import { Injectable, computed, inject } from '@angular/core';
import { PerfilJugador, StatsJugador } from '../models/stats.model';
import { PartidosService } from './partidos.service';
import { MIN_PARTIDOS_RANKING, calcularLiga, calcularPerfil, calcularStats } from './stats.engine';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly partidosSvc = inject(PartidosService);

  /** Ordenadas por goles, igual que la vista inicial de la version original. */
  readonly stats = computed(() => calcularStats(this.partidosSvc.partidos()));

  readonly liga = computed(() => calcularLiga(this.partidosSvc.partidos()));

  private readonly indice = computed(
    () => new Map(this.stats().map((s) => [s.nombre, s]))
  );

  /** Jugadores que superan el minimo de partidos, ordenados alfabeticamente. */
  readonly habituales = computed(() =>
    this.stats()
      .filter((s) => s.PJ >= MIN_PARTIDOS_RANKING)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  );

  readonly esporadicos = computed(() =>
    this.stats()
      .filter((s) => s.PJ < MIN_PARTIDOS_RANKING)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  );

  buscar(nombre: string): StatsJugador | undefined {
    return this.indice().get(nombre);
  }

  perfil(nombre: string): PerfilJugador | null {
    const stats = this.buscar(nombre);
    return stats ? calcularPerfil(stats, this.stats()) : null;
  }
}
