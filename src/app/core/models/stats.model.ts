import { Equipo } from './partido.model';

export type Resultado = 'V' | 'E' | 'D';

/** Un partido visto desde la perspectiva de un jugador concreto. */
export interface PartidoDeJugador {
  partidoId: number;
  equipo: Equipo;
  goles: number;
  asistencias: number;
  influencias: number;
  /** Marcador de su equipo (incluye goles en contra a favor). */
  golesFavor: number;
  golesContra: number;
  resultado: Resultado;
  companeros: string[];
  rivales: string[];
}

export interface StatsJugador {
  nombre: string;

  // --- Totales, identicos a los de la tabla original ---
  goles: number;
  asistencias: number;
  influencias: number;
  PJ: number;
  PG: number;
  PE: number;
  PP: number;
  GF: number;
  GC: number;
  DG: number;

  // --- Derivados ---
  golesPorPartido: number;
  asistenciasPorPartido: number;
  influenciasPorPartido: number;
  /** 0..1 */
  pgPorcentaje: number;
  pePorcentaje: number;
  ppPorcentaje: number;
  /** (goles + asistencias) / goles de su equipo, en los partidos que jugo. 0..1 */
  participacionGoles: number;
  /** Puntos tipo liga: 3 por victoria, 1 por empate. */
  puntosPorPartido: number;

  historial: PartidoDeJugador[];
}

/**
 * Relacion entre un jugador y otro, como companero o como rival.
 *
 * `delta` es la metrica que vale: compara el rendimiento del jugador CON
 * el otro contra su rendimiento en el resto de sus partidos. Un 60% de
 * victorias junto a alguien no dice nada si ese alguien gana el 60% con
 * cualquiera; lo que informa es la diferencia.
 */
export interface StatsPar {
  nombre: string;
  PJ: number;
  PG: number;
  PE: number;
  PP: number;
  /** 0..1, victorias del jugador en los partidos compartidos con este otro. */
  winRate: number;
  /** 0..1, victorias del jugador en sus OTROS partidos. */
  winRateSin: number;
  /** winRate - winRateSin. Positivo = le rinde mejor con/contra el. */
  delta: number;
  /** Diferencia de gol promedio del jugador en esos partidos. */
  dgPromedio: number;
}

export interface Racha {
  tipo: Resultado;
  cantidad: number;
}

export interface Records {
  mejorPartido: PartidoDeJugador | null;
  hatTricks: number;
  partidosDe5: number;
  enBlanco: number;
  maxGolesEnUnPartido: number;
}

/** Todo lo que muestra la ficha individual. */
export interface PerfilJugador {
  stats: StatsJugador;
  companeros: StatsPar[];
  rivales: StatsPar[];
  ultimos5: Resultado[];
  rachaActual: Racha;
  mejorInvicto: number;
  peorRacha: number;
  records: Records;
  /** Posicion en cada ranking, entre los jugadores que superan el minimo. */
  posiciones: Record<string, { puesto: number; total: number }>;
  companeroMasFrecuente: StatsPar | null;
  rivalMasFrecuente: StatsPar | null;
  /** Influencias por partido, en orden cronologico, para el grafico. */
  evolucion: { partidoId: number; influencias: number; mediaMovil: number }[];
}

export interface MvpFecha {
  partidoId: number;
  nombre: string;
  influencias: number;
  goles: number;
  asistencias: number;
}

export interface StatsLiga {
  partidos: number;
  victoriasNaranjas: number;
  victoriasAzules: number;
  empates: number;
  golesNaranjas: number;
  golesAzules: number;
  golesTotales: number;
  promedioGolesPorPartido: number;
  partidoMasGoleador: { partidoId: number; total: number } | null;
  goleadaMasGrande: { partidoId: number; diferencia: number; marcador: string } | null;
  mvpPorFecha: MvpFecha[];
}

/** Metricas ordenables de la tabla general. */
export type ClaveMetrica =
  | 'goles'
  | 'golesPorPartido'
  | 'asistencias'
  | 'asistenciasPorPartido'
  | 'influencias'
  | 'influenciasPorPartido'
  | 'PJ'
  | 'PG'
  | 'pgPorcentaje'
  | 'PE'
  | 'pePorcentaje'
  | 'PP'
  | 'ppPorcentaje'
  | 'GF'
  | 'GC'
  | 'DG'
  | 'participacionGoles'
  | 'puntosPorPartido';

export interface Metrica {
  clave: ClaveMetrica;
  etiqueta: string;
  familia: 'ataque' | 'resultados' | 'goles';
  /** Como formatear el valor en la tabla. */
  formato: 'entero' | 'decimal' | 'porcentaje';
  /** Columna de la tabla que se resalta al ordenar por esta metrica. */
  columna: string;
}

export const METRICAS: Metrica[] = [
  { clave: 'goles', etiqueta: 'Goles', familia: 'ataque', formato: 'entero', columna: 'goles' },
  { clave: 'golesPorPartido', etiqueta: 'Goles/PJ', familia: 'ataque', formato: 'decimal', columna: 'goles' },
  { clave: 'asistencias', etiqueta: 'Asist', familia: 'ataque', formato: 'entero', columna: 'asistencias' },
  { clave: 'asistenciasPorPartido', etiqueta: 'Asist/PJ', familia: 'ataque', formato: 'decimal', columna: 'asistencias' },
  { clave: 'influencias', etiqueta: 'Influencias', familia: 'ataque', formato: 'entero', columna: 'influencias' },
  { clave: 'influenciasPorPartido', etiqueta: 'Infl/PJ', familia: 'ataque', formato: 'decimal', columna: 'influencias' },
  { clave: 'participacionGoles', etiqueta: 'Participacion', familia: 'ataque', formato: 'porcentaje', columna: 'influencias' },

  { clave: 'PJ', etiqueta: 'PJ', familia: 'resultados', formato: 'entero', columna: 'PJ' },
  { clave: 'PG', etiqueta: 'PG', familia: 'resultados', formato: 'entero', columna: 'PG' },
  { clave: 'pgPorcentaje', etiqueta: 'PG%', familia: 'resultados', formato: 'porcentaje', columna: 'PG' },
  { clave: 'PE', etiqueta: 'PE', familia: 'resultados', formato: 'entero', columna: 'PE' },
  { clave: 'pePorcentaje', etiqueta: 'PE%', familia: 'resultados', formato: 'porcentaje', columna: 'PE' },
  { clave: 'PP', etiqueta: 'PP', familia: 'resultados', formato: 'entero', columna: 'PP' },
  { clave: 'ppPorcentaje', etiqueta: 'PP%', familia: 'resultados', formato: 'porcentaje', columna: 'PP' },
  { clave: 'puntosPorPartido', etiqueta: 'Pts/PJ', familia: 'resultados', formato: 'decimal', columna: 'PG' },

  { clave: 'GF', etiqueta: 'GF', familia: 'goles', formato: 'entero', columna: 'GF' },
  { clave: 'GC', etiqueta: 'GC', familia: 'goles', formato: 'entero', columna: 'GC' },
  { clave: 'DG', etiqueta: 'Dif. gol', familia: 'goles', formato: 'entero', columna: 'DG' },
];
