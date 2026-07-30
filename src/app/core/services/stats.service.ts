import { Injectable, computed, inject } from '@angular/core';
import { Curiosidad } from '../models/curiosidad.model';
import { PerfilJugador, StatsJugador } from '../models/stats.model';
import { PartidosService } from './partidos.service';
import { MIN_PARTIDOS_RANKING, calcularLiga, calcularPerfil, calcularStats } from './stats.engine';
import { calcularCuriosidades } from './curiosidades.engine';
import { CabezaACabeza, calcularCabezaACabeza } from './comparacion.engine';

/** Fila de la tabla de posiciones: las stats mas los puntos de liga. */
export interface FilaPosicion extends StatsJugador {
  puntos: number;
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly partidosSvc = inject(PartidosService);

  /** Ordenadas por goles, igual que la vista inicial de la version original. */
  readonly stats = computed(() => calcularStats(this.partidosSvc.partidos()));

  readonly liga = computed(() => calcularLiga(this.partidosSvc.partidos()));

  readonly curiosidades = computed<Curiosidad[]>(() =>
    calcularCuriosidades(this.stats(), this.partidosSvc.partidos())
  );

  private readonly indice = computed(() => new Map(this.stats().map((s) => [s.nombre, s])));

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

  /**
   * Tabla de posiciones estilo liga: 3 puntos por victoria, 1 por empate.
   * Desempata por diferencia de gol y despues por goles a favor.
   */
  readonly posiciones = computed<FilaPosicion[]>(() =>
    this.habituales()
      .map((s) => ({ ...s, puntos: s.PG * 3 + s.PE }))
      .sort((a, b) => b.puntos - a.puntos || b.DG - a.DG || b.GF - a.GF)
  );

  buscar(nombre: string): StatsJugador | undefined {
    return this.indice().get(nombre);
  }

  perfil(nombre: string): PerfilJugador | null {
    const stats = this.buscar(nombre);
    return stats ? calcularPerfil(stats, this.stats()) : null;
  }

  comparar(a: string, b: string): CabezaACabeza | null {
    const uno = this.buscar(a);
    const otro = this.buscar(b);
    return uno && otro ? calcularCabezaACabeza(uno, otro) : null;
  }
}
