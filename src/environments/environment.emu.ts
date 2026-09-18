// `npm run dev:emu`: Auth y Firestore contra los emuladores locales (puertos en
// firebase.json). No gasta cuota ni toca los eventos reales.
import { FIREBASE_CONFIG } from './firebase-config';

export const environment = {
  production: false,
  usarEmulador: true,
  firebaseConfig: FIREBASE_CONFIG,
};
