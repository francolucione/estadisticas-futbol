import { EscudoComponent } from '../../shared/components/escudo.component';
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
  imports: [
    EscudoComponent,
    RouterLink,
    ContadorDirective,
    BotonSesionComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><app-escudo tam="30" class="escudo-cabecera" [decorativo]="false" /></ion-buttons>
        <ion-title>VAR</ion-title>
        <ion-buttons slot="end"><app-boton-sesion /></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <nav class="segmento ancho" aria-label="Temporada">
        @for (t of temporadas; track t.clave) {
          <button type="button" [class.activo]="temporada() === t.clave" (click)="temporada.set(t.clave)">
            {{ t.etiqueta }}
          </button>
        }
      </nav>

      <div class="contenido ancho">
        <p class="explica intro">
          Elegí un partido, dale play y marcá lo que pasa: goles, palos, robos, quién se ata los cordones. Cada
          marca queda en su segundo y suma a la estadística de todos.
        </p>

        <div class="barra-seccion">
          <h2>{{ etiqueta() }}</h2>
          <span class="nota">
            <span [appContador]="totalEventos()"></span> marcas en total,
            <a routerLink="bitacora">ver la bitácora</a>
          </span>
        </div>

        <ul class="videos-grilla">
          @for (v of lista(); track v.youtubeId; let i = $index) {
            <li>
              <a [routerLink]="[v.youtubeId]" class="video-tarjeta">
                <span class="v-foto">
                  <img
                    [src]="'https://i.ytimg.com/vi/' + v.youtubeId + '/mqdefault.jpg'"
                    alt=""
                    width="320"
                    height="180"
                    [attr.loading]="i < 8 ? 'eager' : 'lazy'"
                  />
                  <span class="v-duracion">{{ duracion(v) }}</span>
                  @if (marcas(v)) {
                    <span class="v-marcas"><strong>{{ marcas(v) }}</strong> {{ marcas(v) === 1 ? 'marca' : 'marcas' }}</span>
                  }
                </span>
                <span class="v-nombre">{{ nombre(v) }}</span>
                <span class="v-meta">
                  @if (v.marcadorTitulo; as m) {
                    <span class="v-resultado">
                      <i class="naranja" aria-hidden="true"></i>{{ m.naranja }} – {{ m.azul }}<i class="azul" aria-hidden="true"></i>
                      <span class="sr">Naranja {{ m.naranja }}, Azul {{ m.azul }}</span>
                    </span>
                  }
                  @if (v.fechaReal) {
                    <span>{{ dia(v) }}</span>
                  }
                  @if (terminado(v)) {
                    <span class="v-terminado">terminado</span>
                  }
                  @if (sinPrimerTiempo(v)) {
                    <span>sin el primer tiempo</span>
                  }
                </span>
              </a>
            </li>
          }
        </ul>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .intro {
        margin: 12px 2px 0;
      }
      .nota a {
        color: var(--tinta);
        font-weight: 700;
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

  /** Adentro de la pestana 2025 el año sobra: "Fecha 7". */
  nombre(v: Video): string {
    if (v.temporada === 'especial') return v.titulo;
    return v.numero !== undefined ? `Fecha ${v.numero}` : nombreDeVideo(v);
  }

  duracion(v: Video): string {
    // "01:07:20" -> "1:07:20"; "00:54:05" -> "54:05", como lo muestra YouTube.
    return hms(v.duracionSeg).replace(/^00:/, '').replace(/^0/, '');
  }

  dia(v: Video): string {
    return new Date(`${v.fechaReal}T12:00:00`).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    });
  }

  sinPrimerTiempo(v: Video): boolean {
    return /falta primera parte/i.test(v.titulo);
  }

  marcas(v: Video): number {
    return Math.max(0, this.varSvc.contadores().porVideo[v.youtubeId] ?? 0);
  }

  terminado(v: Video): boolean {
    return !!this.varSvc.completo(v.youtubeId);
  }
}
