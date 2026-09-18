import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { Evento } from '../../core/models/var.model';
import { fraseDe, hms, nombreDeVideo } from '../../core/services/var.engine';
import { VarService } from '../../core/services/var.service';

const PAGINA = 30;

/** Todo lo que se marco, lo ultimo primero, con quien lo marco. Es publica a proposito. */
@Component({
  selector: 'app-bitacora',
  standalone: true,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/videos" text="VAR" />
        </ion-buttons>
        <ion-title>Bitácora</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="contenido">
        <p class="explica intro">Cada marca del VAR, quién la hizo y cuándo. Tocá una para ir a ese segundo del video.</p>
        @if (eventos().length) {
          <div class="panel">
            <ul class="var-eventos">
              @for (e of eventos(); track e.id) {
                <li>
                  <a class="var-ir" [routerLink]="['/tabs/videos', e.videoId]" [queryParams]="{ t: e.t }">
                    {{ hms(e.t) }}
                  </a>
                  <span class="var-ev-emoji" aria-hidden="true">{{ emoji(e) }}</span>
                  <span class="var-ev-texto">
                    {{ frase(e) }}
                    @if (e.nota) {
                      <span class="var-ev-nota">«{{ e.nota }}»</span>
                    }
                    <span class="var-ev-autor">{{ e.autorNombre }} · {{ video(e) }} · {{ cuando(e) }}</span>
                  </span>
                  <span></span>
                </li>
              }
            </ul>
          </div>
          @if (eventos().length >= cuantos()) {
            <p class="mas"><button type="button" class="bt" (click)="verMas()">Ver más</button></p>
          }
        } @else {
          <p class="explica">Todavía nadie marcó nada. El primero que marque algo aparece acá.</p>
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      .contenido {
        padding: 0 10px 16px;
      }
      .intro {
        margin: 12px 2px;
      }
      .var-ir {
        text-decoration: none;
      }
      .mas {
        text-align: center;
      }
    `,
  ],
})
export class BitacoraPage {
  private readonly varSvc = inject(VarService);
  readonly hms = hms;

  readonly cuantos = signal(PAGINA);
  readonly eventos = toSignal(toObservable(this.cuantos).pipe(switchMap((n) => this.varSvc.bitacora(n))), {
    initialValue: [] as Evento[],
  });

  private readonly formato = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  readonly indice = computed(() => new Map(this.varSvc.categorias().map((c) => [c.id, c])));

  verMas(): void {
    this.cuantos.update((n) => n + PAGINA);
  }

  frase(e: Evento): string {
    return fraseDe(this.indice().get(e.categoriaId), e);
  }

  emoji(e: Evento): string {
    return this.indice().get(e.categoriaId)?.emoji ?? '•';
  }

  video(e: Evento): string {
    const v = this.varSvc.video(e.videoId);
    return v ? nombreDeVideo(v) : 'video';
  }

  cuando(e: Evento): string {
    return this.formato.format(e.creado);
  }
}
