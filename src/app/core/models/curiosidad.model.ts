export type CategoriaCuriosidad = 'records' | 'rachas' | 'quimica' | 'rarezas' | 'liga';

/** Una tarjeta del muro de curiosidades. */
export interface Curiosidad {
  id: string;
  categoria: CategoriaCuriosidad;
  /** El titulo corto, tipo apodo: "El nueve", "La bestia negra". */
  titular: string;
  /** El numero que se muestra grande. */
  valor: string;
  /** La frase que lo explica. */
  detalle: string;
  /** Nombres mencionados, para poder linkearlos a su ficha. */
  jugadores: string[];
  /** Advertencia o aclaracion, cuando el dato la necesita. */
  nota?: string;
}

export const CATEGORIAS: { clave: CategoriaCuriosidad; etiqueta: string }[] = [
  { clave: 'records', etiqueta: 'Records' },
  { clave: 'rachas', etiqueta: 'Rachas' },
  { clave: 'quimica', etiqueta: 'Quimica' },
  { clave: 'rarezas', etiqueta: 'Rarezas' },
  { clave: 'liga', etiqueta: 'La liga' },
];
