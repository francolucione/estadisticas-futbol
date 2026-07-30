import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { buildOutline } from 'ionicons/icons';
import { ClaveMetrica, METRICAS, Metrica, StatsJugador } from '../../core/models/stats.model';
import { StatsService } from '../../core/services/stats.service';
import { PartidosService } from '../../core/services/partidos.service';
import { MIN_PARTIDOS_RANKING } from '../../core/services/stats.engine';
import { formatearValor } from '../../shared/formato';
import { MarcaComponent } from '../../shared/components/marca.component';
import { ContadorDirective } from '../../shared/directives/contador.directive';
import { SubrayadoDirective } from '../../shared/directives/subrayado.directive';

type Vista = 'posiciones' | Metrica['familia'];

@Component({
  selector: 'app-tabla',
  standalone: true,
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    MarcaComponent,
    ContadorDirective,
    SubrayadoDirective,
  ],
  templateUrl: './tabla.page.html',
  styleUrl: './tabla.page.scss',
})
export class TablaPage {
  private readonly statsSvc = inject(StatsService);
  private readonly partidosSvc = inject(PartidosService);

  readonly minimo = MIN_PARTIDOS_RANKING;

  readonly vistas: { clave: Vista; etiqueta: string }[] = [
    { clave: 'posiciones', etiqueta: 'Posiciones' },
    { clave: 'ataque', etiqueta: 'Ataque' },
    { clave: 'resultados', etiqueta: 'Resultados' },
    { clave: 'goles', etiqueta: 'Goles' },
  ];

  readonly vista = signal<Vista>('posiciones');
  readonly clave = signal<ClaveMetrica>('goles');
  readonly soloHabituales = signal(true);

  readonly posiciones = this.statsSvc.posiciones;
  readonly hayCorrecciones = this.partidosSvc.hayCorrecciones;

  readonly metricasDeFamilia = computed(() => {
    const v = this.vista();
    return v === 'posiciones' ? [] : METRICAS.filter((m) => m.familia === v);
  });

  readonly metrica = computed(() => METRICAS.find((m) => m.clave === this.clave()) ?? METRICAS[0]);

  readonly filas = computed(() => {
    const clave = this.clave();
    const base = this.soloHabituales() ? this.statsSvc.habituales() : this.statsSvc.stats();
    // GC y PP se leen al reves: cuanto mas bajo, mejor.
    const menorEsMejor = clave === 'GC' || clave === 'PP' || clave === 'ppPorcentaje';
    return [...base].sort((a, b) => (menorEsMejor ? a[clave] - b[clave] : b[clave] - a[clave]));
  });

  constructor() {
    addIcons({ buildOutline });
  }

  cambiarVista(vista: Vista): void {
    this.vista.set(vista);
    const primera = METRICAS.find((m) => m.familia === vista);
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
