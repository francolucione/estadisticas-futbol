import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonAvatar,
  IonContent,
  IonHeader,
  IonItem,
  IonItemGroup,
  IonItemDivider,
  IonLabel,
  IonNote,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { StatsService } from '../../core/services/stats.service';
import { MIN_PARTIDOS_RANKING } from '../../core/services/stats.engine';
import { iniciales } from '../../shared/formato';

@Component({
  selector: 'app-jugadores',
  standalone: true,
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonItem,
    IonItemGroup,
    IonItemDivider,
    IonLabel,
    IonAvatar,
    IonNote,
  ],
  templateUrl: './jugadores.page.html',
  styleUrl: './jugadores.page.scss',
})
export class JugadoresPage {
  private readonly statsSvc = inject(StatsService);

  readonly minimo = MIN_PARTIDOS_RANKING;
  readonly busqueda = signal('');

  private filtrar = (lista: ReturnType<StatsService['habituales']>) => {
    const q = this.busqueda().trim().toLowerCase();
    return q ? lista.filter((j) => j.nombre.toLowerCase().includes(q)) : lista;
  };

  readonly habituales = computed(() => this.filtrar(this.statsSvc.habituales()));
  readonly esporadicos = computed(() => this.filtrar(this.statsSvc.esporadicos()));

  iniciales = iniciales;
}
