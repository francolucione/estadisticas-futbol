// Entorno por defecto: apunta al Firebase REAL.
//
// `ng serve` usa este archivo, asi que probar en local marca eventos de verdad. Para
// trabajar contra los emuladores: npm run dev:emu
import { FIREBASE_CONFIG } from './firebase-config';

export const environment = {
  production: false,
  usarEmulador: false,
  firebaseConfig: FIREBASE_CONFIG,
};
