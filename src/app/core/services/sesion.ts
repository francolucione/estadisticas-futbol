import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { Autor } from './var.fuente';

export interface Usuario extends Autor {
  foto?: string;
  esAdmin: boolean;
}

/** Quien esta mirando. Leer es libre; para marcar hay que entrar con Google. */
export abstract class Sesion {
  abstract readonly usuario: Signal<Usuario | null>;
  /** `false` hasta que Firebase dice si habia sesion guardada: evita el parpadeo de "Entrar". */
  abstract readonly lista: Signal<boolean>;
  abstract entrar(): Promise<void>;
  abstract salir(): Promise<void>;
}

@Injectable()
export class FirebaseSesion extends Sesion {
  private readonly auth = inject(Auth);
  private readonly fs = inject(Firestore);

  private readonly estado = toSignal(
    new Observable<Usuario | null | undefined>((obs) =>
      onAuthStateChanged(this.auth, async (u) => {
        if (!u) return obs.next(null);
        // `admins/{uid}` se carga a mano desde la consola. Solo sirve para mostrar el
        // borrar en eventos ajenos: quien decide de verdad son las reglas.
        let esAdmin = false;
        try {
          esAdmin = (await getDoc(doc(this.fs, 'admins', u.uid))).exists();
        } catch {
          // Sin red el admin ve la app como cualquiera; no es motivo para no entrar.
        }
        obs.next({
          uid: u.uid,
          nombre: u.displayName?.split(' ')[0] || u.email?.split('@')[0] || 'Anónimo',
          foto: u.photoURL ?? undefined,
          esAdmin,
        });
      })
    ),
    { initialValue: undefined }
  );

  readonly usuario = computed(() => this.estado() ?? null);
  readonly lista = computed(() => this.estado() !== undefined);

  async entrar(): Promise<void> {
    await signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  async salir(): Promise<void> {
    await signOut(this.auth);
  }
}

/** Para las pruebas: arranca sin nadie y `entrar()` loguea a un usuario fijo. */
export class MemoriaSesion extends Sesion {
  private readonly actual = signal<Usuario | null>(null);
  readonly usuario = this.actual.asReadonly();
  readonly lista = signal(true).asReadonly();

  constructor(private readonly como: Usuario = { uid: 'uid-prueba', nombre: 'Prueba', esAdmin: false }) {
    super();
  }

  async entrar(): Promise<void> {
    this.actual.set(this.como);
  }

  async salir(): Promise<void> {
    this.actual.set(null);
  }
}
