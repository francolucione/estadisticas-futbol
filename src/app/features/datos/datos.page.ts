import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { CATEGORIAS, CategoriaCuriosidad } from '../../core/models/curiosidad.model';
import { StatsService } from '../../core/services/stats.service';
import { PartidosService } from '../../core/services/partidos.service';
import { ContadorDirective } from '../../shared/contador.directive';
import { ContadorService } from '../../shared/contador.service';

type Filtro = 'todas' | CategoriaCuriosidad;

@Component({
  selector: 'app-datos',
  standalone: true,
  imports: [RouterLink, ContadorDirective, IonHeader, IonToolbar, IonTitle, IonContent],
  templateUrl: './datos.page.html',
  styleUrl: './datos.page.scss',
})
export class DatosPage {
  private readonly statsSvc = inject(StatsService);
  private readonly partidosSvc = inject(PartidosService);
  private readonly contadores = inject(ContadorService);

  ionViewWillEnter(): void {
    this.contadores.reiniciar();
  }

  readonly categorias = CATEGORIAS;
  readonly filtro = signal<Filtro>('todas');

  readonly liga = this.statsSvc.liga;
  readonly avisos = this.partidosSvc.avisos;

  readonly curiosidades = computed(() => {
    const f = this.filtro();
    const todas = this.statsSvc.curiosidades();
    return f === 'todas' ? todas : todas.filter((c) => c.categoria === f);
  });

  /** Reparto de resultados como escala divergente: naranja <- empate -> azul. */
  readonly reparto = computed(() => {
    const l = this.liga();
    const total = l.partidos || 1;
    return [
      { clave: 'naranja', etiqueta: 'Gano naranja', valor: l.victoriasNaranjas, pct: (l.victoriasNaranjas / total) * 100 },
      { clave: 'empate', etiqueta: 'Empates', valor: l.empates, pct: (l.empates / total) * 100 },
      { clave: 'azul', etiqueta: 'Gano azul', valor: l.victoriasAzules, pct: (l.victoriasAzules / total) * 100 },
    ];
  });

  /**
   * Parte el detalle en trozos para poder linkear los nombres de jugadores
   * sin meter HTML dentro del texto.
   */
  trozos(detalle: string, jugadores: string[]): { texto: string; jugador: boolean }[] {
    if (!jugadores.length) return [{ texto: detalle, jugador: false }];
    // Los nombres mas largos primero, para que "Adri B" gane sobre "Adri".
    const orden = [...new Set(jugadores)].sort((a, b) => b.length - a.length);
    const patron = new RegExp(`(${orden.map(escapar).join('|')})`, 'g');
    return detalle
      .split(patron)
      .filter((t) => t !== '')
      .map((texto) => ({ texto, jugador: orden.includes(texto) }));
  }
}

function escapar(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
