import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { getApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  connectAuthEmulator,
  GoogleAuthProvider,
  signInWithCredential,
  initializeAuth,
  provideAuth,
} from '@angular/fire/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  provideFirestore,
} from '@angular/fire/firestore';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { FirestoreVarFuente, VarFuente } from './app/core/services/var.fuente';
import { FirebaseSesion, Sesion } from './app/core/services/sesion';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => {
      // Sesion guardada en IndexedDB: el que entro una vez no tiene que volver a entrar.
      // `initializeAuth` no trae el resolver del popup (getAuth si): sin el, el login con
      // Google tira auth/argument-error.
      const auth = initializeAuth(getApp(), {
        persistence: browserLocalPersistence,
        popupRedirectResolver: browserPopupRedirectResolver,
      });
      if (environment.usarEmulador) {
        connectAuthEmulator(auth, 'http://127.0.0.1:9098', { disableWarnings: true });
        // Solo contra el emulador: entrar sin el popup de Google, para probar la carga
        // desde la consola o un navegador automatizado. `__entrarPrueba('Adri')`.
        (window as unknown as Record<string, unknown>)['__entrarPrueba'] = (nombre = 'Prueba') =>
          signInWithCredential(
            auth,
            GoogleAuthProvider.credential(
              JSON.stringify({ sub: `prueba-${nombre}`, email: `${nombre}@gallo.test`, name: `${nombre} Prueba` })
            )
          );
      }
      return auth;
    }),
    provideFirestore(() => {
      // Cache persistente: al volver a un video ya visto, los eventos salen de IndexedDB
      // y solo se facturan los que cambiaron.
      const fs = initializeFirestore(getApp(), {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
      if (environment.usarEmulador) connectFirestoreEmulator(fs, '127.0.0.1', 8081);
      return fs;
    }),
    { provide: VarFuente, useClass: FirestoreVarFuente },
    { provide: Sesion, useClass: FirebaseSesion },
  ],
});
