import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline } from 'ionicons/icons';
import { Equipo } from '../../core/models/partido.model';
import { PartidosService, marcadorDe } from '../../core/services/partidos.service';
import { ContadorDirective } from '../../shared/contador.directive';
import { VarService } from '../../core/services/var.service';
import { ContadorService } from '../../shared/contador.service';

@Component({
  selector: 'app-fecha-detalle',
  standalone: true,
  imports: [
    RouterLink,
    ContadorDirective,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonContent,
  ],
  templateUrl: './fecha-detalle.page.html',
  styleUrl: './fecha-detalle.page.scss',
})
export class FechaDetallePage {
  private readonly route = inject(ActivatedRoute);
  private readonly partidosSvc = inject(PartidosService);
  private readonly contadores = inject(ContadorService);
  private readonly varSvc = inject(VarService);

  ionViewWillEnter(): void {
    this.contadores.reiniciar();
  }

  readonly id = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('id')))), {
    initialValue: 0,
  });

  readonly partido = computed(() => this.partidosSvc.porId(this.id()) ?? null);

  readonly marcador = computed(() => {
    const p = this.partido();
    return p ? marcadorDe(p) : null;
  });

  readonly video = computed(() => this.varSvc.videoDeFecha(this.id()) ?? null);
  readonly marcasVideo = computed(() => {
    const v = this.video();
    return v ? Math.max(0, this.varSvc.contadores().porVideo[v.youtubeId] ?? 0) : 0;
  });
  readonly diferenciaTitulo = computed(
    () => this.varSvc.diferenciasTitulos().find((d) => d.fechaId === this.id()) ?? null
  );

  readonly editada = computed(() => this.partidosSvc.fueEditada(this.id()));

  formacion(equipo: Equipo) {
    const p = this.partido();
    if (!p) return [];
    return p.jugadores
      .filter((j) => j.equipo === equipo)
      .sort((a, b) => b.goles + b.asistencias - (a.goles + a.asistencias));
  }

  readonly golesEnContra = computed(() => this.partido()?.golesEnContra ?? []);

  readonly figura = computed(() => {
    const p = this.partido();
    if (!p) return null;
    return p.jugadores.reduce((mejor, j) =>
      j.goles + j.asistencias > mejor.goles + mejor.asistencias ? j : mejor
    );
  });

  constructor() {
    addIcons({ createOutline });
  }
}
