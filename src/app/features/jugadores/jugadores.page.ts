import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { StatsJugador } from '../../core/models/stats.model';
import { StatsService } from '../../core/services/stats.service';
import { MIN_PARTIDOS_RANKING } from '../../core/services/stats.engine';
import { iniciales } from '../../shared/formato';
import { ContadorDirective } from '../../shared/contador.directive';
import { ContadorService } from '../../shared/contador.service';

@Component({
  selector: 'app-jugadores',
  standalone: true,
  imports: [RouterLink, ContadorDirective, IonHeader, IonToolbar, IonTitle, IonContent],
  templateUrl: './jugadores.page.html',
  styleUrl: './jugadores.page.scss',
})
export class JugadoresPage {
  private readonly statsSvc = inject(StatsService);
  private readonly contadores = inject(ContadorService);

  ionViewWillEnter(): void {
    this.contadores.reiniciar();
  }

  readonly minimo = MIN_PARTIDOS_RANKING;
  readonly busqueda = signal('');

  private filtrar = (lista: StatsJugador[]) => {
    const q = this.busqueda().trim().toLowerCase();
    return q ? lista.filter((j) => j.nombre.toLowerCase().includes(q)) : lista;
  };

  readonly habituales = computed(() => this.filtrar(this.statsSvc.habituales()));
  readonly esporadicos = computed(() => this.filtrar(this.statsSvc.esporadicos()));

  iniciales = iniciales;
}
