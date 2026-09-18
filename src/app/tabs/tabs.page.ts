import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  peopleOutline,
  podiumOutline,
  sparklesOutline,
  videocamOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="tabla">
          <ion-icon name="podium-outline" />
          <ion-label>Tabla</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="fechas">
          <ion-icon name="calendar-outline" />
          <ion-label>Fechas</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="jugadores">
          <ion-icon name="people-outline" />
          <ion-label>Jugadores</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="videos">
          <ion-icon name="videocam-outline" />
          <ion-label>VAR</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="datos">
          <ion-icon name="sparkles-outline" />
          <ion-label>Datos</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [
    `
      ion-tab-bar {
        border-top: 1px solid var(--metal-borde);
        box-shadow: inset 0 1px 0 var(--metal-filo);
      }

      ion-tab-button {
        --padding-top: 6px;
        --padding-bottom: 5px;
        position: relative;
        font-family: var(--f-texto);
        font-size: 0.74rem;
        font-weight: 600;
      }

      /* La pestana activa: hueso y una costura arriba, como el cuello de la camiseta. */
      ion-tab-button.tab-selected::before {
        content: '';
        position: absolute;
        top: 0;
        left: 28%;
        right: 28%;
        height: 2px;
        border-radius: 0 0 2px 2px;
        background: var(--tinta);
      }

      ion-icon {
        font-size: 1.15rem;
      }
    `,
  ],
})
export class TabsPage {
  constructor() {
    addIcons({ podiumOutline, calendarOutline, peopleOutline, videocamOutline, sparklesOutline });
  }
}
