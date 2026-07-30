import { Routes } from '@angular/router';

const jugador = {
  path: 'jugador/:nombre',
  loadComponent: () => import('./features/jugador/jugador.page').then((m) => m.JugadorPage),
};

export const routes: Routes = [
  {
    path: 'tabs',
    loadComponent: () => import('./tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'ranking',
        loadComponent: () => import('./features/ranking/ranking.page').then((m) => m.RankingPage),
      },
      { path: 'ranking/jugador/:nombre', loadComponent: jugador.loadComponent },
      {
        path: 'jugadores',
        loadComponent: () =>
          import('./features/jugadores/jugadores.page').then((m) => m.JugadoresPage),
      },
      { path: 'jugadores/jugador/:nombre', loadComponent: jugador.loadComponent },
      {
        path: 'liga',
        loadComponent: () => import('./features/liga/liga.page').then((m) => m.LigaPage),
      },
      { path: '', redirectTo: 'ranking', pathMatch: 'full' },
    ],
  },
  { path: '', redirectTo: 'tabs/ranking', pathMatch: 'full' },
  { path: '**', redirectTo: 'tabs/ranking' },
];
