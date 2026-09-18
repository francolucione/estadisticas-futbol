import { Injectable, inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import {
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
  collection,
  deleteDoc,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Categoria, Contadores, Evento, EventoNuevo, VideoCompleto } from '../models/var.model';
import { contadoresVacios } from './var.engine';

export interface Autor {
  uid: string;
  nombre: string;
}

/**
 * De donde salen y adonde van los datos del VAR. La app usa `FirestoreVarFuente`; las
 * pruebas de pantallas, `MemoriaVarFuente`, para montar todo sin red.
 */
export abstract class VarFuente {
  abstract contadores(): Observable<Contadores>;
  /** Solo las creadas por el grupo. Las de fabrica estan en `data/categorias.ts`. */
  abstract categorias(): Observable<Categoria[]>;
  abstract eventosDeVideo(videoId: string): Observable<Evento[]>;
  abstract eventosDeJugador(nombre: string, cuantos: number): Observable<Evento[]>;
  abstract bitacora(cuantos: number): Observable<Evento[]>;
  abstract completos(): Observable<VideoCompleto[]>;

  abstract anotar(evento: EventoNuevo, autor: Autor): Promise<void>;
  abstract borrar(evento: Evento): Promise<void>;
  abstract crearCategoria(categoria: Categoria, autor: Autor): Promise<void>;
  abstract marcarCompleto(completo: Omit<VideoCompleto, 'cuando'>): Promise<void>;
  abstract desmarcarCompleto(youtubeId: string): Promise<void>;
}

/** Envuelve un onSnapshot en un Observable que se da de baja solo. */
function escuchar<T>(suscribir: (emitir: (v: T) => void, fallar: (e: unknown) => void) => () => void): Observable<T> {
  return new Observable<T>((obs) => suscribir((v) => obs.next(v), (e) => obs.error(e)));
}

function aEvento(d: QueryDocumentSnapshot<DocumentData>): Evento {
  const x = d.data();
  // `creado` llega null en el primer snapshot local, antes de que el servidor ponga la
  // hora: se usa la del reloj para no dejar el evento sin orden.
  const creado = x['creado'] instanceof Timestamp ? x['creado'].toMillis() : Date.now();
  return { ...(x as Omit<Evento, 'id' | 'creado'>), id: d.id, creado };
}

/**
 * El cambio de `contadores/global` que acompaña a un alta (+1) o una baja (-1). Va con
 * `merge` e `increment`: dos personas marcando a la vez no se pisan. `ultimoEvento`
 * le dice a las reglas cual evento justifica el movimiento.
 */
function movimiento(evento: Pick<Evento, 'categoriaId' | 'jugador' | 'videoId'>, id: string, delta: 1 | -1) {
  return {
    categorias: {
      [evento.categoriaId]: { total: increment(delta), porJugador: { [evento.jugador]: increment(delta) } },
    },
    porVideo: { [evento.videoId]: increment(delta) },
    ultimoEvento: id,
  };
}

/** Saca las claves `undefined`: Firestore las rechaza y las reglas no las esperan. */
function limpio<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as T;
}

@Injectable()
export class FirestoreVarFuente extends VarFuente {
  private readonly fs = inject(Firestore);

  contadores(): Observable<Contadores> {
    return escuchar((emitir, fallar) =>
      onSnapshot(
        doc(this.fs, 'contadores', 'global'),
        (s) => {
          const d = s.data();
          emitir({ categorias: d?.['categorias'] ?? {}, porVideo: d?.['porVideo'] ?? {} });
        },
        fallar
      )
    );
  }

  categorias(): Observable<Categoria[]> {
    return escuchar((emitir, fallar) =>
      onSnapshot(collection(this.fs, 'categorias'), (s) => emitir(s.docs.map((d) => d.data() as Categoria)), fallar)
    );
  }

  eventosDeVideo(videoId: string): Observable<Evento[]> {
    // Un video tiene a lo sumo unos cientos de eventos: se trae entero y se ordena aca,
    // asi no hace falta un indice compuesto (videoId, t).
    return escuchar<Evento[]>((emitir, fallar) =>
      onSnapshot(
        query(collection(this.fs, 'eventos'), where('videoId', '==', videoId)),
        (s) => emitir(s.docs.map(aEvento)),
        fallar
      )
    ).pipe(map((evs) => evs.sort((a, b) => a.t - b.t)));
  }

  eventosDeJugador(nombre: string, cuantos: number): Observable<Evento[]> {
    return escuchar((emitir, fallar) =>
      onSnapshot(
        query(collection(this.fs, 'eventos'), where('jugador', '==', nombre), orderBy('creado', 'desc'), limit(cuantos)),
        (s) => emitir(s.docs.map(aEvento)),
        fallar
      )
    );
  }

  bitacora(cuantos: number): Observable<Evento[]> {
    return escuchar((emitir, fallar) =>
      onSnapshot(
        query(collection(this.fs, 'eventos'), orderBy('creado', 'desc'), limit(cuantos)),
        (s) => emitir(s.docs.map(aEvento)),
        fallar
      )
    );
  }

  completos(): Observable<VideoCompleto[]> {
    return escuchar((emitir, fallar) =>
      onSnapshot(
        collection(this.fs, 'videos'),
        (s) =>
          emitir(
            s.docs.map((d) => {
              const x = d.data();
              const cuando = x['cuando'] instanceof Timestamp ? x['cuando'].toMillis() : Date.now();
              return { ...(x as VideoCompleto), cuando };
            })
          ),
        fallar
      )
    );
  }

  async anotar(evento: EventoNuevo, autor: Autor): Promise<void> {
    const ref = doc(collection(this.fs, 'eventos'));
    const b = writeBatch(this.fs);
    b.set(
      ref,
      limpio({ ...evento, autorUid: autor.uid, autorNombre: autor.nombre, creado: serverTimestamp() })
    );
    b.set(doc(this.fs, 'contadores', 'global'), movimiento(evento, ref.id, 1), { merge: true });
    await b.commit();
  }

  async borrar(evento: Evento): Promise<void> {
    const b = writeBatch(this.fs);
    b.delete(doc(this.fs, 'eventos', evento.id));
    b.set(doc(this.fs, 'contadores', 'global'), movimiento(evento, evento.id, -1), { merge: true });
    await b.commit();
  }

  async crearCategoria(categoria: Categoria, autor: Autor): Promise<void> {
    const { segundo: _segundo, tecla: _tecla, ...resto } = categoria;
    await setDoc(doc(this.fs, 'categorias', categoria.id), limpio({ ...resto, creadaPor: autor.uid }));
  }

  async marcarCompleto(completo: Omit<VideoCompleto, 'cuando'>): Promise<void> {
    await setDoc(doc(this.fs, 'videos', completo.youtubeId), limpio({ ...completo, cuando: serverTimestamp() }));
  }

  async desmarcarCompleto(youtubeId: string): Promise<void> {
    await deleteDoc(doc(this.fs, 'videos', youtubeId));
  }
}

/**
 * Todo en memoria, sincronico. Para las pruebas de pantallas y para probar la logica de
 * alta y baja sin emulador.
 */
export class MemoriaVarFuente extends VarFuente {
  private readonly eventos$ = new BehaviorSubject<Evento[]>([]);
  private readonly contadores$ = new BehaviorSubject<Contadores>(contadoresVacios());
  private readonly categorias$ = new BehaviorSubject<Categoria[]>([]);
  private readonly completos$ = new BehaviorSubject<VideoCompleto[]>([]);
  private secuencia = 0;

  contadores = () => this.contadores$.asObservable();
  categorias = () => this.categorias$.asObservable();
  completos = () => this.completos$.asObservable();

  eventosDeVideo(videoId: string) {
    return this.eventos$.pipe(map((es) => es.filter((e) => e.videoId === videoId).sort((a, b) => a.t - b.t)));
  }

  eventosDeJugador(nombre: string, cuantos: number) {
    return this.eventos$.pipe(
      map((es) => es.filter((e) => e.jugador === nombre).sort((a, b) => b.creado - a.creado).slice(0, cuantos))
    );
  }

  bitacora(cuantos: number) {
    return this.eventos$.pipe(map((es) => [...es].sort((a, b) => b.creado - a.creado).slice(0, cuantos)));
  }

  async anotar(evento: EventoNuevo, autor: Autor): Promise<void> {
    const nuevo: Evento = {
      ...evento,
      id: `e${++this.secuencia}`,
      autorUid: autor.uid,
      autorNombre: autor.nombre,
      creado: Date.now() + this.secuencia,
    };
    this.eventos$.next([...this.eventos$.value, nuevo]);
    this.mover(nuevo, 1);
  }

  async borrar(evento: Evento): Promise<void> {
    this.eventos$.next(this.eventos$.value.filter((e) => e.id !== evento.id));
    this.mover(evento, -1);
  }

  async crearCategoria(categoria: Categoria, autor: Autor): Promise<void> {
    this.categorias$.next([...this.categorias$.value, { ...categoria, creadaPor: autor.uid }]);
  }

  async marcarCompleto(completo: Omit<VideoCompleto, 'cuando'>): Promise<void> {
    const resto = this.completos$.value.filter((c) => c.youtubeId !== completo.youtubeId);
    this.completos$.next([...resto, { ...completo, cuando: Date.now() }]);
  }

  async desmarcarCompleto(youtubeId: string): Promise<void> {
    this.completos$.next(this.completos$.value.filter((c) => c.youtubeId !== youtubeId));
  }

  private mover(e: Evento, delta: number): void {
    const c = structuredClone(this.contadores$.value);
    const cat = (c.categorias[e.categoriaId] ??= { total: 0, porJugador: {} });
    cat.total += delta;
    cat.porJugador[e.jugador] = (cat.porJugador[e.jugador] ?? 0) + delta;
    c.porVideo[e.videoId] = (c.porVideo[e.videoId] ?? 0) + delta;
    this.contadores$.next(c);
  }
}
