import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { PartidosService, marcadorDe } from '../../core/services/partidos.service';
import { StatsService } from '../../core/services/stats.service';

@Component({
  selector: 'app-fechas',
  standalone: true,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent],
  templateUrl: './fechas.page.html',
  styleUrl: './fechas.page.scss',
})
export class FechasPage {
  private readonly partidosSvc = inject(PartidosService);
  private readonly statsSvc = inject(StatsService);

  /** De la mas reciente a la mas vieja, que es como se quiere mirar. */
  readonly fechas = computed(() => {
    const mvps = new Map(this.statsSvc.liga().mvpPorFecha.map((m) => [m.partidoId, m]));
    return [...this.partidosSvc.partidos()]
      .sort((a, b) => b.id - a.id)
      .map((p) => {
        const m = marcadorDe(p);
        return {
          id: p.id,
          naranja: m.naranja,
          azul: m.azul,
          ganador: m.naranja > m.azul ? 'naranja' : m.azul > m.naranja ? 'azul' : null,
          total: m.naranja + m.azul,
          mvp: mvps.get(p.id) ?? null,
          editada: this.partidosSvc.fueEditada(p.id),
        };
      });
  });

  readonly resumen = computed(() => {
    const l = this.statsSvc.liga();
    return `${l.partidos} fechas · ${l.golesTotales} goles · ${l.promedioGolesPorPartido.toFixed(1)} por partido`;
  });
}
