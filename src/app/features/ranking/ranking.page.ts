import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { ClaveMetrica, METRICAS, Metrica, StatsJugador } from '../../core/models/stats.model';
import { StatsService } from '../../core/services/stats.service';
import { MIN_PARTIDOS_RANKING } from '../../core/services/stats.engine';
import { formatearValor } from '../../shared/formato';

type Familia = Metrica['familia'];

@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonItem,
    IonToggle,
    IonNote,
  ],
  templateUrl: './ranking.page.html',
  styleUrl: './ranking.page.scss',
})
export class RankingPage {
  private readonly statsSvc = inject(StatsService);

  readonly minimo = MIN_PARTIDOS_RANKING;
  readonly familias: { clave: Familia; etiqueta: string }[] = [
    { clave: 'ataque', etiqueta: 'Ataque' },
    { clave: 'resultados', etiqueta: 'Resultados' },
    { clave: 'goles', etiqueta: 'Goles' },
  ];

  readonly familia = signal<Familia>('ataque');
  readonly clave = signal<ClaveMetrica>('goles');
  readonly soloHabituales = signal(true);

  readonly metricasDeFamilia = computed(() =>
    METRICAS.filter((m) => m.familia === this.familia())
  );

  readonly metrica = computed(
    () => METRICAS.find((m) => m.clave === this.clave()) ?? METRICAS[0]
  );

  readonly filas = computed(() => {
    const clave = this.clave();
    const base = this.soloHabituales() ? this.statsSvc.habituales() : this.statsSvc.stats();
    // GC y PP se leen al reves: cuanto mas bajo, mejor.
    const menorEsMejor = clave === 'GC' || clave === 'PP' || clave === 'ppPorcentaje';
    return [...base].sort((a, b) =>
      menorEsMejor ? a[clave] - b[clave] : b[clave] - a[clave]
    );
  });

  cambiarFamilia(familia: Familia): void {
    this.familia.set(familia);
    const primera = METRICAS.find((m) => m.familia === familia);
    if (primera) this.clave.set(primera.clave);
  }

  /** La columna de la tabla se resalta cuando la metrica activa la usa. */
  resaltada(columna: string): boolean {
    return this.metrica().columna === columna;
  }

  valor(stats: StatsJugador, clave: ClaveMetrica): string {
    const metrica = METRICAS.find((m) => m.clave === clave)!;
    return formatearValor(stats[clave], metrica.formato);
  }

  porcentaje(parte: number, total: number): string {
    return total > 0 ? `${((parte / total) * 100).toFixed(0)}%` : '0%';
  }

  promedio(total: number, PJ: number): string {
    return PJ > 0 ? (total / PJ).toFixed(2) : '0.00';
  }
}
