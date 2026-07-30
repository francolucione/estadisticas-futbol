import { Partido } from './partido.model';

/**
 * Correcciones locales sobre el partidos.json empaquetado.
 *
 * El JSON viaja dentro del build, asi que el navegador no puede reescribirlo.
 * Las ediciones del panel admin se guardan aca, en localStorage, y se aplican
 * encima del archivo base al leerlo.
 *
 * Se guardan fechas COMPLETAS y no diferencias campo por campo: es mas simple,
 * no acumula estado raro, y exportar es armar el archivo final de una.
 */
export interface Parches {
  version: 1;
  /** Fechas que reemplazan a la del archivo base, indexadas por id. */
  partidos: Record<string, Partido>;
  /** Fechas nuevas, que no existen en el archivo base. */
  agregados: Partido[];
  /** Ids de fechas eliminadas. */
  borrados: number[];
  /** Alias que se suman a los del archivo base. */
  alias: Record<string, string>;
}

export function parchesVacios(): Parches {
  return { version: 1, partidos: {}, agregados: [], borrados: [], alias: {} };
}

export function hayParches(p: Parches): boolean {
  return (
    Object.keys(p.partidos).length > 0 ||
    p.agregados.length > 0 ||
    p.borrados.length > 0 ||
    Object.keys(p.alias).length > 0
  );
}

/** Cuantas correcciones sin exportar hay, para el cartel de aviso. */
export function contarParches(p: Parches): number {
  return (
    Object.keys(p.partidos).length +
    p.agregados.length +
    p.borrados.length +
    Object.keys(p.alias).length
  );
}
