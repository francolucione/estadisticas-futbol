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
import { VarService } from '../../core/services/var.service';
import { totalDe } from '../../core/services/var.engine';
import { Categoria } from '../../core/models/var.model';
import { formatearValor } from '../../shared/formato';
import { ContadorDirective } from '../../shared/contador.directive';
import { ContadorService } from '../../shared/contador.service';

type Vista = 'posiciones' | Metrica['familia'] | 'var';

@Component({
  selector: 'app-tabla',
  standalone: true,
  imports: [
    RouterLink,
    ContadorDirective,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
  ],
  templateUrl: './tabla.page.html',
  styleUrl: './tabla.page.scss',
})
export class TablaPage {
  private readonly statsSvc = inject(StatsService);
  private readonly partidosSvc = inject(PartidosService);
  private readonly contadores = inject(ContadorService);
  private readonly varSvc = inject(VarService);

  readonly minimo = MIN_PARTIDOS_RANKING;

  readonly vistas: { clave: Vista; etiqueta: string }[] = [
    { clave: 'posiciones', etiqueta: 'Posiciones' },
    { clave: 'ataque', etiqueta: 'Ataque' },
    { clave: 'resultados', etiqueta: 'Resultados' },
    { clave: 'goles', etiqueta: 'Goles' },
    { clave: 'var', etiqueta: 'VAR' },
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

  // --- VAR: rankings de lo marcado en los videos ---
  readonly categoriasVar = this.varSvc.categoriasConDatos;
  private readonly idVar = signal<string | null>(null);
  readonly categoriaVar = computed<Categoria | null>(() => {
    const todas = this.categoriasVar();
    return todas.find((c) => c.id === this.idVar()) ?? todas[0] ?? null;
  });
  readonly rankingVar = computed(() => {
    const c = this.categoriaVar();
    return c ? this.varSvc.ranking(c.id) : [];
  });
  readonly totalVar = computed(() => {
    const c = this.categoriaVar();
    return c ? totalDe(this.varSvc.contadores(), c.id) : 0;
  });

  constructor() {
    addIcons({ buildOutline });
  }

  elegirCategoriaVar(id: string): void {
    this.idVar.set(id);
    this.contadores.reiniciarGrupo('col-var');
  }

  /** Ionic la llama en cada entrada a la vista, tambien al volver a la pestana. */
  ionViewWillEnter(): void {
    this.contadores.reiniciar();
  }

  /** Cambia el juego de filas entero, asi que se re-anima toda la pantalla. */
  cambiarVista(vista: Vista): void {
    this.vista.set(vista);
    const primera = METRICAS.find((m) => m.familia === vista);
    if (primera) this.clave.set(primera.clave);
    this.contadores.reiniciar();
  }

  /**
   * Cambiar de metrica re-ordena las filas pero los numeros son los mismos: se re-anima
   * solo la columna nueva, que es la que pasa a importar. Sacudir la tabla entera por
   * cambiar de pestana marea.
   *
   * Se reinicia por COLUMNA y no por clave: varias metricas caen en la misma columna
   * (Goles y Goles/PJ resaltan `goles`; PG, PG% y Pts/PJ resaltan `PG`), y la que se
   * anima tiene que ser la que se resalta.
   */
  elegirMetrica(clave: ClaveMetrica): void {
    this.clave.set(clave);
    const columna = METRICAS.find((m) => m.clave === clave)?.columna;
    if (columna) this.contadores.reiniciarGrupo(this.grupoDe(columna));
  }

  /** Cambia que filas entran, no solo el orden: se re-anima todo. */
  cambiarSoloHabituales(valor: boolean): void {
    this.soloHabituales.set(valor);
    this.contadores.reiniciar();
  }

  /** Canal del reloj de una columna. La plantilla lo escribe literal en cada celda. */
  grupoDe(columna: string): string {
    return `col-${columna}`;
  }

  /** La columna de la tabla se resalta cuando la metrica activa la usa. */
  resaltada(columna: string): boolean {
    return this.metrica().columna === columna;
  }

  valor(stats: StatsJugador, clave: ClaveMetrica): string {
    const metrica = METRICAS.find((m) => m.clave === clave)!;
    return formatearValor(stats[clave], metrica.formato);
  }

  // Devuelven numeros y no texto: el formato lo pone [appContador] con `decimales` y
  // `sufijo`, que es lo unico que le deja animar la cifra.
  porcentaje(parte: number, total: number): number {
    return total > 0 ? (parte / total) * 100 : 0;
  }

  promedio(total: number, PJ: number): number {
    return PJ > 0 ? total / PJ : 0;
  }
}
