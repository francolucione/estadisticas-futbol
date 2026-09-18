import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { Temporada, Video } from '../../core/models/var.model';
import { hms, nombreDeVideo } from '../../core/services/var.engine';
import { VarService } from '../../core/services/var.service';
import { ContadorDirective } from '../../shared/contador.directive';
import { ContadorService } from '../../shared/contador.service';
import { BotonSesionComponent } from './boton-sesion.component';

@Component({
  selector: 'app-videos',
  standalone: true,
  imports: [RouterLink, ContadorDirective, BotonSesionComponent, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>VAR</ion-title>
        <ion-buttons slot="end"><app-boton-sesion /></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <nav class="segmento" aria-label="Temporada">
        @for (t of temporadas; track t.clave) {
          <button type="button" [class.activo]="temporada() === t.clave" (click)="temporada.set(t.clave)">
            {{ t.etiqueta }}
          </button>
        }
      </nav>

      <div class="contenido">
        <p class="explica intro">
          Elegí un partido, dale play y marcá lo que pasa: goles, palos, robos, quién se ata los cordones. Cada
          marca queda en su segundo y suma a la estadística de todos.
        </p>

        <div class="barra-seccion">
          <h2>{{ etiqueta() }}</h2>
          <span class="nota">
            <span [appContador]="totalEventos()"></span> marcas en total ·
            <a routerLink="bitacora">ver la bitácora</a>
          </span>
        </div>

        <div class="panel">
          <ul class="videos-lista">
            @for (v of lista(); track v.youtubeId) {
              <li>
                <a [routerLink]="[v.youtubeId]">
                  <span class="v-nombre">{{ nombre(v) }}</span>
                  <span class="v-meta">
                    {{ detalle(v) }}
                    @if (terminado(v)) {
                      · <span class="v-terminado">terminado</span>
                    }
                  </span>
                  <span class="v-marcas">
                    <strong [appContador]="marcas(v)"></strong>
                    {{ marcas(v) === 1 ? 'marca' : 'marcas' }}
                  </span>
                </a>
              </li>
            }
          </ul>
        </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .intro {
        margin: 12px 2px 0;
      }
      .nota a {
        color: var(--acento);
        text-decoration: none;
        font-weight: 600;
      }
      .contenido {
        padding: 0 10px 16px;
      }
    `,
  ],
})
export class VideosPage {
  private readonly varSvc = inject(VarService);
  private readonly contadores = inject(ContadorService);

  readonly temporadas: { clave: Temporada; etiqueta: string }[] = [
    { clave: '2025', etiqueta: '2025' },
    { clave: '2023-24', etiqueta: 'Fechas 1 a 47' },
    { clave: 'especial', etiqueta: 'Especiales' },
  ];

  readonly temporada = signal<Temporada>('2025');
  readonly etiqueta = computed(() => this.temporadas.find((t) => t.clave === this.temporada())!.etiqueta);
  readonly lista = computed(() => this.varSvc.videos.filter((v) => v.temporada === this.temporada()));
  readonly totalEventos = this.varSvc.totalEventos;

  ionViewWillEnter(): void {
    this.contadores.reiniciar();
  }

  nombre(v: Video): string {
    return v.temporada === 'especial' ? v.titulo : nombreDeVideo(v);
  }

  detalle(v: Video): string {
    const partes: string[] = [];
    if (v.marcadorTitulo) partes.push(`Naranja ${v.marcadorTitulo.naranja} - ${v.marcadorTitulo.azul} Azul`);
    if (v.fechaReal) partes.push(v.fechaReal.split('-').reverse().join('/'));
    partes.push(hms(v.duracionSeg));
    if (/falta primera parte/i.test(v.titulo)) partes.push('falta el primer tiempo');
    return partes.join(' · ');
  }

  marcas(v: Video): number {
    return Math.max(0, this.varSvc.contadores().porVideo[v.youtubeId] ?? 0);
  }

  terminado(v: Video): boolean {
    return !!this.varSvc.completo(v.youtubeId);
  }
}
