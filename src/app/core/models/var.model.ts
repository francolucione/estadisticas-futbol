import { Marcador } from './partido.model';

/**
 * El VAR: eventos marcados sobre los videos del canal, con su segundo exacto.
 *
 * Los videos salen de `data/videos.json` (lo genera `scripts/videos-canal.mjs`), los
 * eventos y los contadores viven en Firestore.
 */

export type Temporada = '2023-24' | '2025' | 'especial';

/** Un video del canal. Las fechas 1-47 traen `fechaId` y el marcador del titulo. */
export interface Video {
  youtubeId: string;
  titulo: string;
  duracionSeg: number;
  temporada: Temporada;
  /** Fecha del partidos.json a la que corresponde (solo 2023-24). */
  fechaId?: number;
  /** Numero de fecha dentro de la temporada 2025. */
  numero?: number;
  /** ISO. Algunos titulos 2023-24 lo traen, todos los de 2025. */
  fechaReal?: string;
  /** Lo que dice el titulo del video. Se cruza contra el JSON, no lo reemplaza. */
  marcadorTitulo?: Marcador;
}

/**
 * - `juego`: lo que pasa con la pelota (gol, palo, falta).
 * - `gesto`: lo que hace un jugador siempre (grita, se ata los cordones).
 * - `graciosa`: lo que no entra en ninguna otra.
 */
export type TipoCategoria = 'juego' | 'gesto' | 'graciosa';

export interface Categoria {
  id: string;
  emoji: string;
  nombre: string;
  /** Como se lee un evento. `{j}` el jugador, `{j2}` el segundo, `[...]` solo si hay segundo. */
  frase: string;
  descripcion?: string;
  tipo: TipoCategoria;
  /** El segundo jugador: el que asiste, el que sufre el robo. */
  segundo?: { etiqueta: string; obligatorio: boolean };
  /** Tecla de atajo en escritorio. */
  tecla?: string;
  /** Las de fabrica viven en el codigo; las creadas por el grupo, en Firestore. */
  creadaPor?: string;
}

export interface Evento {
  id: string;
  videoId: string;
  /** Segundo del video. */
  t: number;
  categoriaId: string;
  jugador: string;
  jugador2?: string;
  nota?: string;
  autorUid: string;
  autorNombre: string;
  /** Epoch ms. En Firestore es un Timestamp; el servicio lo traduce. */
  creado: number;
}

/** Lo que se carga para crear un evento: el resto lo pone el servicio. */
export type EventoNuevo = Pick<Evento, 'videoId' | 't' | 'categoriaId' | 'jugador' | 'jugador2' | 'nota'>;

/**
 * El documento `contadores/global`: todo lo que la tabla, la ficha y la lista de
 * videos necesitan saber, en una sola lectura. Se actualiza con `increment()` en el
 * mismo batch que crea o borra cada evento.
 */
export interface Contadores {
  categorias: Record<string, { total: number; porJugador: Record<string, number> }>;
  porVideo: Record<string, number>;
}

/**
 * `videos/{youtubeId}` en Firestore: solo existe cuando alguien tildo el video como
 * marcado completo. Guarda los goles por jugador de ese momento para controlarlos
 * contra el JSON sin tener que leer los eventos.
 */
export interface VideoCompleto {
  youtubeId: string;
  fechaId?: number;
  goles: Record<string, number>;
  por: string;
  cuando: number;
}
