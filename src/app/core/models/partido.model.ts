/** Los dos equipos fijos del grupo. */
export type Equipo = 'naranja' | 'azul';

/** Lo que hizo un jugador en un partido puntual. */
export interface ActuacionJugador {
  nombre: string;
  goles: number;
  asistencias: number;
  equipo: Equipo;
}

/**
 * Gol que suma al marcador de un equipo pero no se le atribuye a ningun
 * jugador (gol en contra del rival). `favorA` es el equipo beneficiado.
 */
export interface GolEnContra {
  favorA: Equipo;
  cantidad: number;
}

export interface Partido {
  id: number;
  /** ISO. Opcional: de las 47 fechas historicas no tenemos la fecha real. */
  fecha?: string;
  jugadores: ActuacionJugador[];
  golesEnContra?: GolEnContra[];
}

/**
 * Estructura del partidos.json. `alias` permite fusionar dos nombres que
 * son la misma persona sin tocar los partidos: { "Martin2": "Martin" }.
 */
export interface ArchivoPartidos {
  alias: Record<string, string>;
  partidos: Partido[];
}

export interface Marcador {
  naranja: number;
  azul: number;
}
