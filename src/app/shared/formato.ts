import { Equipo } from '../core/models/partido.model';
import { Metrica, StatsJugador } from '../core/models/stats.model';

/** Formatea un valor segun como lo declara su metrica. */
export function formatearValor(valor: number, formato: Metrica['formato']): string {
  switch (formato) {
    case 'porcentaje':
      return `${(valor * 100).toFixed(1)}%`;
    case 'decimal':
      return valor.toFixed(2);
    default:
      return String(valor);
  }
}

export function valorDe(stats: StatsJugador, metrica: Metrica): string {
  return formatearValor(stats[metrica.clave], metrica.formato);
}

/** Iniciales para el avatar del jugador. */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

/**
 * El color con el que mas jugo, para el aro del avatar. Con empate no hay color: el aro
 * queda hueso. Es un dato de apoyo (el nombre y las cifras estan al lado), no el unico.
 */
export function equipoHabitual(stats: StatsJugador): Equipo | null {
  let naranja = 0;
  for (const p of stats.historial) if (p.equipo === 'naranja') naranja++;
  const azul = stats.historial.length - naranja;
  if (naranja === azul) return null;
  return naranja > azul ? 'naranja' : 'azul';
}
