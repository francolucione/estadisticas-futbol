import { Categoria } from '../models/var.model';

/**
 * Las categorias de fabrica. Viven en el codigo y no en Firestore: son las que la app
 * necesita para funcionar (el control de goles contra el JSON usa `gol`) y no cuesta
 * ninguna lectura traerlas. Las que invente el grupo van a la coleccion `categorias`.
 *
 * El `id` es la clave en `contadores/global`: no se cambia nunca, o los conteos quedan
 * huerfanos. El resto (emoji, nombre, frase) se puede tocar cuando se quiera.
 */
export const CATEGORIAS_BASE: Categoria[] = [
  {
    id: 'gol',
    emoji: '⚽',
    nombre: 'Gol',
    frase: 'Gol de {j}[, asistencia de {j2}]',
    tipo: 'juego',
    segundo: { etiqueta: 'Asistencia', obligatorio: false },
    tecla: 'g',
  },
  { id: 'palo', emoji: '🥅', nombre: 'Palo', frase: '{j} la estrella en el palo', tipo: 'juego', tecla: 'p' },
  {
    id: 'golazo-que-se-fue',
    emoji: '🚀',
    nombre: 'Era un golazo',
    frase: '{j}: era un golazo pero se fue a la mierda',
    descripcion: 'La paraste de pecho, le pegaste al arco y se fue lejísimo. Pero era un golazo.',
    tipo: 'juego',
    tecla: 'e',
  },
  {
    id: 'falta',
    emoji: '🟨',
    nombre: 'Falta',
    frase: 'Falta de {j}[ sobre {j2}]',
    tipo: 'juego',
    segundo: { etiqueta: 'Sobre', obligatorio: false },
    tecla: 'f',
  },
  {
    id: 'robo',
    emoji: '🏴‍☠️',
    nombre: 'Robo',
    frase: '{j} roba[ a {j2}]',
    tipo: 'juego',
    segundo: { etiqueta: 'A quién', obligatorio: false },
    tecla: 'r',
  },
  { id: 'grita', emoji: '📣', nombre: 'Grita', frase: '{j} grita', tipo: 'gesto', tecla: 'x' },
  {
    id: 'cordones',
    emoji: '👟',
    nombre: 'Cordones',
    frase: '{j} se ata los cordones',
    tipo: 'gesto',
    tecla: 'c',
  },
  { id: 'graciosa', emoji: '😂', nombre: 'Cosa graciosa', frase: '{j}: cosa graciosa', tipo: 'graciosa', tecla: 'j' },
];

/** Emojis ofrecidos al crear una categoria nueva. Se puede escribir cualquier otro. */
export const EMOJIS_SUGERIDOS = ['🤦', '🙌', '🧤', '🦵', '🐢', '💨', '🤌', '😤', '🍀', '🧱', '🎯', '🤡'];
