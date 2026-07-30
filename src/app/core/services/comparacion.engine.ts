import { StatsJugador } from '../models/stats.model';
import { calcularPares } from './stats.engine';

export interface RegistroDirecto {
  /** Partidos que jugaron del mismo lado. */
  juntos: { PJ: number; PG: number; PE: number; PP: number };
  /** Partidos que jugaron en veredas opuestas, contados desde `a`. */
  enfrentados: { PJ: number; ganoA: number; empates: number; ganoB: number };
}

export interface CabezaACabeza {
  a: StatsJugador;
  b: StatsJugador;
  registro: RegistroDirecto;
}

/**
 * Enfrenta a dos jugadores.
 *
 * Como companeros comparten equipo y por lo tanto resultado, asi que el
 * registro "juntos" se lee igual desde cualquiera de los dos. Enfrentados no:
 * la victoria de uno es la derrota del otro, y por eso se cuenta desde `a`.
 */
export function calcularCabezaACabeza(a: StatsJugador, b: StatsJugador): CabezaACabeza {
  const comoCompanero = calcularPares(a, 'companeros').find((p) => p.nombre === b.nombre);
  const comoRival = calcularPares(a, 'rivales').find((p) => p.nombre === b.nombre);

  return {
    a,
    b,
    registro: {
      juntos: comoCompanero
        ? { PJ: comoCompanero.PJ, PG: comoCompanero.PG, PE: comoCompanero.PE, PP: comoCompanero.PP }
        : { PJ: 0, PG: 0, PE: 0, PP: 0 },
      enfrentados: comoRival
        ? {
            PJ: comoRival.PJ,
            ganoA: comoRival.PG,
            empates: comoRival.PE,
            ganoB: comoRival.PP,
          }
        : { PJ: 0, ganoA: 0, empates: 0, ganoB: 0 },
    },
  };
}

/** Metricas que se muestran enfrentadas, y si conviene tenerlas altas. */
export const METRICAS_COMPARACION: {
  clave: keyof StatsJugador;
  etiqueta: string;
  formato: 'entero' | 'decimal' | 'porcentaje';
  mayorEsMejor: boolean;
}[] = [
  { clave: 'PJ', etiqueta: 'Partidos', formato: 'entero', mayorEsMejor: true },
  { clave: 'goles', etiqueta: 'Goles', formato: 'entero', mayorEsMejor: true },
  { clave: 'golesPorPartido', etiqueta: 'Goles por partido', formato: 'decimal', mayorEsMejor: true },
  { clave: 'asistencias', etiqueta: 'Asistencias', formato: 'entero', mayorEsMejor: true },
  { clave: 'asistenciasPorPartido', etiqueta: 'Asist. por partido', formato: 'decimal', mayorEsMejor: true },
  { clave: 'influenciasPorPartido', etiqueta: 'Influencias por partido', formato: 'decimal', mayorEsMejor: true },
  { clave: 'pgPorcentaje', etiqueta: 'Victorias', formato: 'porcentaje', mayorEsMejor: true },
  { clave: 'puntosPorPartido', etiqueta: 'Puntos por partido', formato: 'decimal', mayorEsMejor: true },
  { clave: 'participacionGoles', etiqueta: 'Participacion en goles', formato: 'porcentaje', mayorEsMejor: true },
  { clave: 'DG', etiqueta: 'Diferencia de gol', formato: 'entero', mayorEsMejor: true },
];
