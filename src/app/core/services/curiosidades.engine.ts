import { Partido } from '../models/partido.model';
import { Curiosidad } from '../models/curiosidad.model';
import { StatsJugador } from '../models/stats.model';
import { calcularPares } from './stats.engine';
import { marcadorDe } from './partidos.service';

/** Partidos minimos para que un jugador entre en las comparaciones. */
export const MIN_PJ = 10;
/** Partidos minimos compartidos para que una dupla o un cruce cuente. */
export const MIN_JUNTOS = 10;
/** Partidos minimos para las metricas de regularidad, que necesitan muestra. */
export const MIN_PJ_REGULARIDAD = 20;

const pct = (x: number) => `${Math.round(x * 100)}%`;
const pp = (x: number) => `${x > 0 ? '+' : ''}${Math.round(x * 100)} pp`;

function habituales(stats: StatsJugador[]): StatsJugador[] {
  return stats.filter((s) => s.PJ >= MIN_PJ);
}

/** Recorre todas las actuaciones individuales de todos los jugadores. */
function* actuaciones(stats: StatsJugador[]) {
  for (const s of stats) for (const h of s.historial) yield { nombre: s.nombre, h };
}

/**
 * El maximo segun `valor`. `desempate` decide entre iguales; sin el, el
 * empate lo gana el primero que aparece, que depende del orden de entrada y
 * por lo tanto no es estable.
 */
function maximoPor<T>(
  items: Iterable<T>,
  valor: (x: T) => number,
  desempate: (x: T) => number = () => 0
): T | null {
  let mejor: T | null = null;
  let max = -Infinity;
  let maxDes = -Infinity;
  for (const x of items) {
    const v = valor(x);
    const d = desempate(x);
    if (v > max || (v === max && d > maxDes)) {
      max = v;
      maxDes = d;
      mejor = x;
    }
  }
  return mejor;
}

// ------------------------------------------------------------------ records

function records(stats: StatsJugador[], partidos: Partido[]): Curiosidad[] {
  const salida: Curiosidad[] = [];

  // Ante igual cantidad de goles, gana el que ademas asistio mas.
  const goleador = maximoPor(
    [...actuaciones(stats)],
    (x) => x.h.goles,
    (x) => x.h.asistencias
  );
  if (goleador) {
    salida.push({
      id: 'max-goles-partido',
      categoria: 'records',
      titular: 'El nueve',
      valor: `${goleador.h.goles} goles`,
      detalle: `${goleador.nombre} en la fecha ${goleador.h.partidoId}, que termino ${goleador.h.golesFavor}-${goleador.h.golesContra}.`,
      jugadores: [goleador.nombre],
    });
  }

  // Ante igual cantidad de influencias, gana el que metio mas goles.
  const actuacion = maximoPor(
    [...actuaciones(stats)],
    (x) => x.h.influencias,
    (x) => x.h.goles
  );
  if (actuacion) {
    salida.push({
      id: 'mejor-actuacion',
      categoria: 'records',
      titular: 'El partido perfecto',
      valor: `${actuacion.h.influencias}`,
      detalle: `${actuacion.nombre} metio ${actuacion.h.goles} y asistio ${actuacion.h.asistencias} en la fecha ${actuacion.h.partidoId}.`,
      jugadores: [actuacion.nombre],
    });
  }

  const hab = habituales(stats);

  const definidor = maximoPor(
    hab.filter((s) => s.PJ >= MIN_PJ_REGULARIDAD && s.asistencias > 0),
    (s) => s.goles / s.asistencias
  );
  if (definidor) {
    salida.push({
      id: 'mas-definidor',
      categoria: 'records',
      titular: 'El egoista',
      valor: (definidor.goles / definidor.asistencias).toFixed(2),
      detalle: `${definidor.nombre} hace ${(definidor.goles / definidor.asistencias).toFixed(2)} goles por cada asistencia: ${definidor.goles} contra ${definidor.asistencias}.`,
      jugadores: [definidor.nombre],
    });
  }

  const asistidor = maximoPor(
    hab.filter((s) => s.PJ >= MIN_PJ_REGULARIDAD && s.goles > 0),
    (s) => s.asistencias / s.goles
  );
  if (asistidor) {
    salida.push({
      id: 'mas-asistidor',
      categoria: 'records',
      titular: 'El generoso',
      valor: (asistidor.asistencias / asistidor.goles).toFixed(2),
      detalle: `${asistidor.nombre} da ${(asistidor.asistencias / asistidor.goles).toFixed(2)} asistencias por cada gol: ${asistidor.asistencias} contra ${asistidor.goles}.`,
      jugadores: [asistidor.nombre],
    });
  }

  const acaparador = maximoPor(hab, (s) => s.participacionGoles);
  if (acaparador) {
    salida.push({
      id: 'acaparador',
      categoria: 'records',
      titular: 'Todo pasa por el',
      valor: pct(acaparador.participacionGoles),
      detalle: `${acaparador.nombre} participa en ${pct(acaparador.participacionGoles)} de los goles de su equipo, entre goles y asistencias.`,
      jugadores: [acaparador.nombre],
    });
  }

  const sinGanar = maximoPor(hab, (s) =>
    s.historial.filter((h) => h.resultado !== 'V').reduce((a, h) => a + h.goles, 0)
  );
  if (sinGanar) {
    const goles = sinGanar.historial
      .filter((h) => h.resultado !== 'V')
      .reduce((a, h) => a + h.goles, 0);
    salida.push({
      id: 'goles-sin-ganar',
      categoria: 'records',
      titular: 'Laburo perdido',
      valor: `${goles} goles`,
      detalle: `${sinGanar.nombre} los hizo en partidos que no gano. Es ${pct(goles / sinGanar.goles)} de su obra.`,
      jugadores: [sinGanar.nombre],
    });
  }

  const equipazo = maximoPor(partidos, (p) => {
    const m = marcadorDe(p);
    return Math.max(m.naranja, m.azul);
  });
  if (equipazo) {
    const m = marcadorDe(equipazo);
    salida.push({
      id: 'max-goles-equipo',
      categoria: 'records',
      titular: 'La maquina',
      valor: `${Math.max(m.naranja, m.azul)}`,
      detalle: `Los ${m.naranja > m.azul ? 'naranjas' : 'azules'} metieron eso solos en la fecha ${equipazo.id} (${m.naranja}-${m.azul}).`,
      jugadores: [],
    });
  }

  return salida;
}

// ------------------------------------------------------------------- rachas

function rachaMasLarga(s: StatsJugador, cuenta: (r: string) => boolean): number {
  let actual = 0;
  let max = 0;
  for (const h of s.historial) {
    actual = cuenta(h.resultado) ? actual + 1 : 0;
    max = Math.max(max, actual);
  }
  return max;
}

function rachas(stats: StatsJugador[]): Curiosidad[] {
  const salida: Curiosidad[] = [];
  const hab = habituales(stats);

  const invicto = maximoPor(hab, (s) => rachaMasLarga(s, (r) => r !== 'D'));
  if (invicto) {
    salida.push({
      id: 'mejor-invicto',
      categoria: 'rachas',
      titular: 'El invicto',
      valor: `${rachaMasLarga(invicto, (r) => r !== 'D')}`,
      detalle: `${invicto.nombre} encadeno esa cantidad de partidos sin perder.`,
      jugadores: [invicto.nombre],
    });
  }

  const perdedor = maximoPor(hab, (s) => rachaMasLarga(s, (r) => r === 'D'));
  if (perdedor) {
    salida.push({
      id: 'peor-racha',
      categoria: 'rachas',
      titular: 'La travesia',
      valor: `${rachaMasLarga(perdedor, (r) => r === 'D')}`,
      detalle: `${perdedor.nombre} perdio esa cantidad de partidos al hilo. Se le hizo largo.`,
      jugadores: [perdedor.nombre],
    });
  }

  const goleador = maximoPor(hab, (s) => {
    let actual = 0;
    let max = 0;
    for (const h of s.historial) {
      actual = h.goles > 0 ? actual + 1 : 0;
      max = Math.max(max, actual);
    }
    return max;
  });
  if (goleador) {
    let actual = 0;
    let max = 0;
    for (const h of goleador.historial) {
      actual = h.goles > 0 ? actual + 1 : 0;
      max = Math.max(max, actual);
    }
    salida.push({
      id: 'racha-goleadora',
      categoria: 'rachas',
      titular: 'No paraba de meterla',
      valor: `${max}`,
      detalle: `${goleador.nombre} marco en esa cantidad de fechas seguidas.`,
      jugadores: [goleador.nombre],
    });
  }

  const presente = maximoPor(stats, (s) => s.PJ);
  if (presente) {
    const total = Math.max(...stats.map((s) => s.historial[s.historial.length - 1]?.partidoId ?? 0));
    salida.push({
      id: 'presentismo',
      categoria: 'rachas',
      titular: 'Nunca falta',
      valor: `${presente.PJ} de ${total}`,
      detalle:
        presente.PJ === total
          ? `${presente.nombre} jugo absolutamente todas las fechas.`
          : `${presente.nombre} es el que mas veces se puso los cortos.`,
      jugadores: [presente.nombre],
    });
  }

  return salida;
}

// ------------------------------------------------------------------ quimica

/**
 * Duplas de companeros. Se deduplica por par ordenado alfabeticamente: como
 * dos companeros comparten equipo, comparten resultado, y da lo mismo desde
 * cual de los dos se lo mire.
 */
function duplas(stats: StatsJugador[]) {
  const vistos = new Map<string, { a: string; b: string; PJ: number; PG: number; winRate: number }>();
  for (const s of habituales(stats)) {
    for (const par of calcularPares(s, 'companeros')) {
      if (par.PJ < MIN_JUNTOS) continue;
      const clave = [s.nombre, par.nombre].sort().join('|');
      if (vistos.has(clave)) continue;
      vistos.set(clave, {
        a: s.nombre,
        b: par.nombre,
        PJ: par.PJ,
        PG: par.PG,
        winRate: par.winRate,
      });
    }
  }
  return [...vistos.values()];
}

function quimica(stats: StatsJugador[]): Curiosidad[] {
  const salida: Curiosidad[] = [];
  const ds = duplas(stats);

  if (ds.length) {
    const mejor = ds.reduce((a, b) => (b.winRate > a.winRate ? b : a));
    salida.push({
      id: 'mejor-dupla',
      categoria: 'quimica',
      titular: 'La sociedad',
      valor: pct(mejor.winRate),
      detalle: `${mejor.a} y ${mejor.b} ganaron ${mejor.PG} de los ${mejor.PJ} partidos que jugaron del mismo lado.`,
      jugadores: [mejor.a, mejor.b],
    });

    const peor = ds.reduce((a, b) => (b.winRate < a.winRate ? b : a));
    salida.push({
      id: 'peor-dupla',
      categoria: 'quimica',
      titular: 'Mejor separados',
      valor: pct(peor.winRate),
      detalle: `${peor.a} y ${peor.b} juntos ganaron ${peor.PG} de ${peor.PJ}. Algo no funciona.`,
      jugadores: [peor.a, peor.b],
    });
  }

  // Cruces: aca si importa desde quien se mira, porque la victoria de uno es
  // la derrota del otro.
  interface Cruce {
    jugador: string;
    rival: string;
    delta: number;
    winRate: number;
    PJ: number;
  }
  let bestia: Cruce | null = null;
  let cliente: Cruce | null = null;

  for (const s of habituales(stats)) {
    for (const par of calcularPares(s, 'rivales')) {
      if (par.PJ < MIN_JUNTOS) continue;
      const dato = {
        jugador: s.nombre,
        rival: par.nombre,
        delta: par.delta,
        winRate: par.winRate,
        PJ: par.PJ,
      };
      if (!bestia || dato.delta < bestia.delta) bestia = dato;
      if (!cliente || dato.delta > cliente.delta) cliente = dato;
    }
  }

  if (bestia) {
    salida.push({
      id: 'bestia-negra',
      categoria: 'quimica',
      titular: 'La bestia negra',
      valor: pp(bestia.delta),
      detalle: `A ${bestia.jugador} le va mucho peor cuando enfrenta a ${bestia.rival}: gana ${pct(bestia.winRate)} en los ${bestia.PJ} cruces, contra su promedio habitual.`,
      jugadores: [bestia.jugador, bestia.rival],
    });
  }

  if (cliente) {
    salida.push({
      id: 'cliente',
      categoria: 'quimica',
      titular: 'Le tiene la ficha',
      valor: pp(cliente.delta),
      detalle: `${cliente.jugador} rinde mucho mejor cuando del otro lado esta ${cliente.rival}: ${pct(cliente.winRate)} en ${cliente.PJ} cruces.`,
      jugadores: [cliente.jugador, cliente.rival],
    });
  }

  return salida;
}

// ------------------------------------------------------------------ rarezas

function desvio(s: StatsJugador): number {
  const media = s.influencias / s.PJ;
  const suma = s.historial.reduce((a, h) => a + (h.influencias - media) ** 2, 0);
  return Math.sqrt(suma / s.PJ);
}

function rarezas(stats: StatsJugador[]): Curiosidad[] {
  const salida: Curiosidad[] = [];
  const conMuestra = stats.filter((s) => s.PJ >= MIN_PJ_REGULARIDAD);

  if (conMuestra.length) {
    const regular = conMuestra.reduce((a, b) => (desvio(b) < desvio(a) ? b : a));
    salida.push({
      id: 'mas-regular',
      categoria: 'rarezas',
      titular: 'El reloj',
      valor: desvio(regular).toFixed(2),
      detalle: `${regular.nombre} es el mas parejo de todos: rinde casi lo mismo todas las fechas (promedio de ${regular.influenciasPorPartido.toFixed(1)} influencias).`,
      jugadores: [regular.nombre],
      nota: 'Cuanto mas bajo el numero, menos varia entre un partido y otro.',
    });

    const irregular = conMuestra.reduce((a, b) => (desvio(b) > desvio(a) ? b : a));
    salida.push({
      id: 'mas-irregular',
      categoria: 'rarezas',
      titular: 'De un extremo al otro',
      valor: desvio(irregular).toFixed(2),
      detalle: `${irregular.nombre} tiene partidos enormes y partidos en blanco, con poco termino medio.`,
      jugadores: [irregular.nombre],
    });
  }

  // Pares de habituales que jamas estuvieron en la misma fecha. Cuando dos
  // nombres nunca coinciden y ademas sus periodos no se solapan, suele ser
  // la misma persona cargada dos veces.
  const hab = habituales(stats);
  const fechasDe = new Map(hab.map((s) => [s.nombre, new Set(s.historial.map((h) => h.partidoId))]));

  for (let i = 0; i < hab.length; i++) {
    for (let j = i + 1; j < hab.length; j++) {
      const a = hab[i];
      const b = hab[j];
      const fa = fechasDe.get(a.nombre)!;
      const fb = fechasDe.get(b.nombre)!;
      if ([...fa].some((x) => fb.has(x))) continue;

      const rangoA = [a.historial[0].partidoId, a.historial[a.historial.length - 1].partidoId];
      const rangoB = [b.historial[0].partidoId, b.historial[b.historial.length - 1].partidoId];
      const separados = rangoA[1] < rangoB[0] || rangoB[1] < rangoA[0];

      salida.push({
        id: `nunca-coinciden-${a.nombre}-${b.nombre}`,
        categoria: 'rarezas',
        titular: separados ? 'Sospechosamente parecidos' : 'Nunca se cruzaron',
        valor: '0',
        detalle: separados
          ? `${a.nombre} juega de la fecha ${rangoA[0]} a la ${rangoA[1]}; ${b.nombre}, de la ${rangoB[0]} a la ${rangoB[1]}. Cero superposicion.`
          : `${a.nombre} y ${b.nombre} nunca estuvieron en la misma fecha, ni como companeros ni como rivales.`,
        jugadores: [a.nombre, b.nombre],
        nota: separados
          ? 'Cuando dos nombres no se pisan nunca y ademas juegan en epocas distintas, puede tratarse de la misma persona. Se resuelve con un alias desde el panel admin.'
          : undefined,
      });
    }
  }

  return salida;
}

// --------------------------------------------------------------------- liga

function liga(partidos: Partido[]): Curiosidad[] {
  const salida: Curiosidad[] = [];
  if (partidos.length < 4) return salida;

  const ordenados = [...partidos].sort((a, b) => a.id - b.id);
  const golesDe = (p: Partido) => {
    const m = marcadorDe(p);
    return m.naranja + m.azul;
  };

  const mitad = Math.floor(ordenados.length / 2);
  const promedio = (ps: Partido[]) => ps.reduce((a, p) => a + golesDe(p), 0) / ps.length;
  const primera = promedio(ordenados.slice(0, mitad));
  const segunda = promedio(ordenados.slice(mitad));

  salida.push({
    id: 'evolucion-goles',
    categoria: 'liga',
    titular: segunda < primera ? 'Se puso mas trabada' : 'Cada vez mas goles',
    valor: `${primera.toFixed(1)} → ${segunda.toFixed(1)}`,
    detalle: `Los goles por fecha pasaron de ${primera.toFixed(1)} en la primera mitad del historial a ${segunda.toFixed(1)} en la segunda.`,
    jugadores: [],
  });

  const parejos = ordenados.filter((p) => {
    const m = marcadorDe(p);
    return m.naranja === m.azul;
  });
  if (parejos.length) {
    salida.push({
      id: 'empates',
      categoria: 'liga',
      titular: 'Nadie se saco ventaja',
      valor: `${parejos.length}`,
      detalle: `Fechas que terminaron empatadas, de ${ordenados.length} jugadas: la ${parejos.map((p) => p.id).join(', la ')}.`,
      jugadores: [],
    });
  }

  const goleada = maximoPor(ordenados, (p) => {
    const m = marcadorDe(p);
    return Math.abs(m.naranja - m.azul);
  });
  if (goleada) {
    const m = marcadorDe(goleada);
    salida.push({
      id: 'goleada',
      categoria: 'liga',
      titular: 'La paliza',
      valor: `${Math.abs(m.naranja - m.azul)}`,
      detalle: `La fecha ${goleada.id} termino ${m.naranja}-${m.azul}. La diferencia mas grande del historial.`,
      jugadores: [],
    });
  }

  return salida;
}

// ----------------------------------------------------------------- fachada

export function calcularCuriosidades(stats: StatsJugador[], partidos: Partido[]): Curiosidad[] {
  if (!stats.length || !partidos.length) return [];
  return [
    ...records(stats, partidos),
    ...rachas(stats),
    ...quimica(stats),
    ...rarezas(stats),
    ...liga(partidos),
  ];
}
