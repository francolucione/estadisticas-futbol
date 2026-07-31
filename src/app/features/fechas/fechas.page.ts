import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { PartidosService, marcadorDe } from '../../core/services/partidos.service';
import { StatsService } from '../../core/services/stats.service';
import { ContadorDirective } from '../../shared/contador.directive';
import { ContadorService } from '../../shared/contador.service';

@Component({
  selector: 'app-fechas',
  standalone: true,
  imports: [RouterLink, ContadorDirective, IonHeader, IonToolbar, IonTitle, IonContent],
  templateUrl: './fechas.page.html',
  styleUrl: './fechas.page.scss',
})
export class FechasPage {
  private readonly partidosSvc = inject(PartidosService);
  private readonly statsSvc = inject(StatsService);
  private readonly contadores = inject(ContadorService);

  ionViewWillEnter(): void {
    this.contadores.reiniciar();
  }

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

  /** Los tres numeros del resumen se arman en la plantilla, para poder animarlos. */
  readonly liga = this.statsSvc.liga;
}
