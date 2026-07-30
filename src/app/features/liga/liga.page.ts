import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonNote,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { PartidosService } from '../../core/services/partidos.service';
import { StatsService } from '../../core/services/stats.service';

@Component({
  selector: 'app-liga',
  standalone: true,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonNote],
  templateUrl: './liga.page.html',
  styleUrl: './liga.page.scss',
})
export class LigaPage {
  private readonly statsSvc = inject(StatsService);
  private readonly partidosSvc = inject(PartidosService);

  readonly liga = this.statsSvc.liga;
  readonly avisos = this.partidosSvc.avisos;

  /** Reparto de resultados como escala divergente: naranja <- empates -> azul. */
  readonly reparto = computed(() => {
    const l = this.liga();
    const total = l.partidos || 1;
    return [
      { clave: 'naranja', etiqueta: 'Gano naranja', valor: l.victoriasNaranjas, pct: (l.victoriasNaranjas / total) * 100 },
      { clave: 'empate', etiqueta: 'Empates', valor: l.empates, pct: (l.empates / total) * 100 },
      { clave: 'azul', etiqueta: 'Gano azul', valor: l.victoriasAzules, pct: (l.victoriasAzules / total) * 100 },
    ];
  });

  /** Quien fue MVP mas veces. */
  readonly mvpRanking = computed(() => {
    const conteo = new Map<string, number>();
    for (const mvp of this.liga().mvpPorFecha) {
      conteo.set(mvp.nombre, (conteo.get(mvp.nombre) ?? 0) + 1);
    }
    return [...conteo.entries()]
      .map(([nombre, veces]) => ({ nombre, veces }))
      .sort((a, b) => b.veces - a.veces)
      .slice(0, 8);
  });

  readonly ultimosMvp = computed(() => [...this.liga().mvpPorFecha].reverse().slice(0, 10));
}
