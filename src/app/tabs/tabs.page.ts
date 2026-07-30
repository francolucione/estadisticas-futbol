import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { footballOutline, listOutline, peopleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="ranking">
          <ion-icon name="list-outline" />
          <ion-label>Ranking</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="jugadores">
          <ion-icon name="people-outline" />
          <ion-label>Jugadores</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="liga">
          <ion-icon name="football-outline" />
          <ion-label>Liga</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
})
export class TabsPage {
  constructor() {
    addIcons({ listOutline, peopleOutline, footballOutline });
  }
}
