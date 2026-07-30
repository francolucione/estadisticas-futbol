import { Routes } from '@angular/router';

const jugador = () => import('./features/jugador/jugador.page').then((m) => m.JugadorPage);
const comparar = () => import('./features/comparar/comparar.page').then((m) => m.CompararPage);

export const routes: Routes = [
  {
    path: 'tabs',
    loadComponent: () => import('./tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'tabla',
        loadComponent: () => import('./features/tabla/tabla.page').then((m) => m.TablaPage),
      },
      { path: 'tabla/jugador/:nombre', loadComponent: jugador },

      {
        path: 'fechas',
        loadComponent: () => import('./features/fechas/fechas.page').then((m) => m.FechasPage),
      },
      {
        path: 'fechas/:id',
        loadComponent: () =>
          import('./features/fechas/fecha-detalle.page').then((m) => m.FechaDetallePage),
      },

      {
        path: 'jugadores',
        loadComponent: () =>
          import('./features/jugadores/jugadores.page').then((m) => m.JugadoresPage),
      },
      { path: 'jugadores/jugador/:nombre', loadComponent: jugador },
      { path: 'jugadores/comparar/:a/:b', loadComponent: comparar },
      { path: 'jugadores/comparar/:a', loadComponent: comparar },

      {
        path: 'datos',
        loadComponent: () => import('./features/datos/datos.page').then((m) => m.DatosPage),
      },

      { path: '', redirectTo: 'tabla', pathMatch: 'full' },
    ],
  },

  // El panel admin vive fuera de las pestanas: es una herramienta, no una vista.
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin.page').then((m) => m.AdminPage),
  },
  {
    path: 'admin/fecha/:id',
    loadComponent: () =>
      import('./features/admin/editar-fecha.page').then((m) => m.EditarFechaPage),
  },

  { path: '', redirectTo: 'tabs/tabla', pathMatch: 'full' },
  { path: '**', redirectTo: 'tabs/tabla' },
];
