import { Marcador, Partido } from '../models/partido.model';
import { Categoria, Contadores, Evento, Video } from '../models/var.model';
import { marcadorDe } from './partidos.service';

/**
 * Calculos del VAR. Todo puro: sin Firestore ni Angular, para poder probarlo con datos
 * armados a mano.
 */

export function contadoresVacios(): Contadores {
  return { categorias: {}, porVideo: {} };
}

/** 1394 -> "00:23:14". Siempre con horas: los videos pasan de la hora. */
export function hms(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${dos(Math.floor(s / 3600))}:${dos(Math.floor((s % 3600) / 60))}:${dos(s % 60)}`;
}

/**
 * Arma la frase de un evento. Lo que va entre corchetes solo aparece si hay segundo
 * jugador: "{j} roba[ a {j2}]" -> "Guido roba a Dario", o "Guido roba" a secas.
 */
export function fraseDe(categoria: Categoria | undefined, evento: Pick<Evento, 'jugador' | 'jugador2'>): string {
  if (!categoria) return evento.jugador;
  return categoria.frase
    .replace(/\[([^\]]*)\]/g, (_, opcional: string) => (evento.jugador2 ? opcional : ''))
    .replaceAll('{j2}', evento.jugador2 ?? '')
    .replaceAll('{j}', evento.jugador);
}

export interface FilaRanking {
  nombre: string;
  cantidad: number;
}

/** Quien mas veces hizo lo de esta categoria. Empates, alfabetico. */
export function ranking(contadores: Contadores, categoriaId: string): FilaRanking[] {
  const porJugador = contadores.categorias[categoriaId]?.porJugador ?? {};
  return Object.entries(porJugador)
    .filter(([, n]) => n > 0)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'));
}

export function totalDe(contadores: Contadores, categoriaId: string): number {
  return contadores.categorias[categoriaId]?.total ?? 0;
}

export interface ConteoJugador {
  categoria: Categoria;
  cantidad: number;
  /** Puesto en el ranking de esa categoria (1 = el que mas). */
  puesto: number;
  de: number;
}

/** Lo que el VAR dice de un jugador, categoria por categoria. Solo las que tienen algo. */
export function conteosDe(contadores: Contadores, categorias: Categoria[], nombre: string): ConteoJugador[] {
  const out: ConteoJugador[] = [];
  for (const categoria of categorias) {
    const filas = ranking(contadores, categoria.id);
    const i = filas.findIndex((f) => f.nombre === nombre);
    if (i < 0) continue;
    // Puesto de competencia: los empatados comparten el mejor puesto.
    const puesto = filas.findIndex((f) => f.cantidad === filas[i].cantidad) + 1;
    out.push({ categoria, cantidad: filas[i].cantidad, puesto, de: filas.length });
  }
  return out.sort((a, b) => b.cantidad - a.cantidad);
}

/**
 * Reparte los marcadores de la linea de tiempo en carriles para que no se tapen. Dos
 * eventos a menos de `separacion` segundos no pueden compartir carril.
 */
export function carriles<T extends { t: number }>(eventos: T[], separacion: number): { evento: T; carril: number }[] {
  const ultimos: number[] = [];
  return [...eventos]
    .sort((a, b) => a.t - b.t)
    .map((evento) => {
      let carril = ultimos.findIndex((t) => evento.t - t >= separacion);
      if (carril < 0) carril = ultimos.length;
      ultimos[carril] = evento.t;
      return { evento, carril };
    });
}

/** Goles por jugador segun los eventos `gol` de un video. */
export function golesDeEventos(eventos: Evento[]): Record<string, number> {
  const goles: Record<string, number> = {};
  for (const e of eventos) if (e.categoriaId === 'gol') goles[e.jugador] = (goles[e.jugador] ?? 0) + 1;
  return goles;
}

export interface DiferenciaGoles {
  jugador: string;
  json: number;
  video: number;
}

/**
 * Jugador por jugador, los goles del JSON contra los marcados en el video. El JSON
 * manda: esto solo avisa. Los goles en contra no tienen autor y no entran.
 */
export function compararGoles(partido: Partido, golesVideo: Record<string, number>): DiferenciaGoles[] {
  const nombres = new Set([...partido.jugadores.map((j) => j.nombre), ...Object.keys(golesVideo)]);
  const out: DiferenciaGoles[] = [];
  for (const jugador of nombres) {
    const json = partido.jugadores.find((j) => j.nombre === jugador)?.goles ?? 0;
    const video = golesVideo[jugador] ?? 0;
    if (json !== video) out.push({ jugador, json, video });
  }
  return out.sort((a, b) => a.jugador.localeCompare(b.jugador, 'es'));
}

export interface DiferenciaTitulo {
  fechaId: number;
  youtubeId: string;
  json: Marcador;
  titulo: Marcador;
  /** `invertido`: mismo resultado con los colores al reves. */
  tipo: 'invertido' | 'distinto';
}

/** Las fechas cuyo marcador en el titulo del video no es el del JSON. */
export function diferenciasDeTitulos(videos: Video[], partidos: Partido[]): DiferenciaTitulo[] {
  const out: DiferenciaTitulo[] = [];
  for (const v of videos) {
    if (v.fechaId === undefined || !v.marcadorTitulo) continue;
    const partido = partidos.find((p) => p.id === v.fechaId);
    if (!partido) continue;
    const json = marcadorDe(partido);
    const titulo = v.marcadorTitulo;
    if (json.naranja === titulo.naranja && json.azul === titulo.azul) continue;
    const invertido = json.naranja === titulo.azul && json.azul === titulo.naranja;
    out.push({ fechaId: v.fechaId, youtubeId: v.youtubeId, json, titulo, tipo: invertido ? 'invertido' : 'distinto' });
  }
  return out.sort((a, b) => a.fechaId - b.fechaId);
}

/** Nombre corto para la cabecera y la bitacora: "Fecha 42", "Fecha 7 de 2025", o el titulo. */
export function nombreDeVideo(v: Video): string {
  if (v.fechaId !== undefined) return `Fecha ${v.fechaId}`;
  if (v.numero !== undefined) return `Fecha ${v.numero} de 2025`;
  return v.titulo;
}
