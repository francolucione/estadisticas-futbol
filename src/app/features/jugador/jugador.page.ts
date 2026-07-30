import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { StatsService } from '../../core/services/stats.service';
import { MIN_PARTIDOS_PAR, MIN_PARTIDOS_RANKING } from '../../core/services/stats.engine';
import { GraficoEvolucionComponent } from '../../shared/components/grafico-evolucion.component';
import { BarrasDeltaComponent } from '../../shared/components/barras-delta.component';
import { iniciales } from '../../shared/formato';
import { ContadorDirective } from '../../shared/contador.directive';
import { ContadorService } from '../../shared/contador.service';

type Orden = 'mejores' | 'peores';

@Component({
  selector: 'app-jugador',
  standalone: true,
  imports: [
    RouterLink,
    ContadorDirective,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    GraficoEvolucionComponent,
    BarrasDeltaComponent,
  ],
  templateUrl: './jugador.page.html',
  styleUrl: './jugador.page.scss',
})
export class JugadorPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly statsSvc = inject(StatsService);
  private readonly contadores = inject(ContadorService);

  ionViewWillEnter(): void {
    this.contadores.reiniciar();
  }

  readonly minimoPar = MIN_PARTIDOS_PAR;
  readonly minimoRanking = MIN_PARTIDOS_RANKING;

  readonly nombre = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('nombre') ?? '')),
    { initialValue: '' }
  );

  readonly perfil = computed(() => this.statsSvc.perfil(this.nombre()));

  readonly ordenCompaneros = signal<Orden>('mejores');
  readonly ordenRivales = signal<Orden>('mejores');

  /**
   * La ficha se alcanza desde dos tabs. Los enlaces a otros jugadores tienen
   * que quedarse en el mismo stack para que el boton de volver siga teniendo
   * sentido.
   */
  readonly enlaceBase = computed(() =>
    this.router.url.startsWith('/tabs/tabla')
      ? '/tabs/tabla/jugador'
      : '/tabs/jugadores/jugador'
  );

  readonly medias = computed(() => this.perfil()?.evolucion.map((e) => e.mediaMovil) ?? []);

  iniciales = iniciales;

  ordinal(puesto: number): string {
    return `${puesto}º`;
  }

  etiquetaResultado(r: string): string {
    return r === 'V' ? 'Ganado' : r === 'E' ? 'Empatado' : 'Perdido';
  }

  textoRacha(tipo: string, cantidad: number): string {
    const plural = cantidad === 1 ? '' : 's';
    if (tipo === 'V') return `${cantidad} victoria${plural} al hilo`;
    if (tipo === 'D') return `${cantidad} derrota${plural} al hilo`;
    return `${cantidad} empate${plural} al hilo`;
  }
}
