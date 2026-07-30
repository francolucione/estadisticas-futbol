import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  peopleOutline,
  podiumOutline,
  sparklesOutline,
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
        --padding-top: 5px;
        --padding-bottom: 4px;
        font-size: 0.62rem;
        letter-spacing: 0.03em;
      }

      ion-icon {
        font-size: 1.15rem;
      }
    `,
  ],
})
export class TabsPage {
  constructor() {
    addIcons({ podiumOutline, calendarOutline, peopleOutline, sparklesOutline });
  }
}
