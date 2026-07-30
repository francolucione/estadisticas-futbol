import { Partido } from '../models/partido.model';
import {
  ClaveMetrica,
  METRICAS,
  MvpFecha,
  PartidoDeJugador,
  PerfilJugador,
  Racha,
  Records,
  Resultado,
  StatsJugador,
  StatsLiga,
  StatsPar,
} from '../models/stats.model';
import { marcadorDe } from './partidos.service';

/** Partidos minimos junto a otro jugador para que la relacion se muestre. */
export const MIN_PARTIDOS_PAR = 5;

/** Partidos minimos para entrar en la tabla filtrada, igual que la version original. */
export const MIN_PARTIDOS_RANKING = 10;

const div = (a: number, b: number) => (b > 0 ? a / b : 0);

/**
 * Recorre los partidos una sola vez y arma, por jugador, la lista de sus
 * partidos con companeros y rivales resueltos. Todo lo demas se deriva
 * de aca.
 */
export function calcularHistoriales(partidos: Partido[]): Map<string, PartidoDeJugador[]> {
  const historiales = new Map<string, PartidoDeJugador[]>();
  const ordenados = [...partidos].sort((a, b) => a.id - b.id);

  for (const partido of ordenados) {
    const { naranja, azul } = marcadorDe(partido);
    const porEquipo = {
      naranja: partido.jugadores.filter((j) => j.equipo === 'naranja').map((j) => j.nombre),
      azul: partido.jugadores.filter((j) => j.equipo === 'azul').map((j) => j.nombre),
    };

    for (const j of partido.jugadores) {
      const propio = j.equipo === 'naranja' ? naranja : azul;
      const ajeno = j.equipo === 'naranja' ? azul : naranja;
      const resultado: Resultado = propio > ajeno ? 'V' : propio < ajeno ? 'D' : 'E';

      const entrada: PartidoDeJugador = {
        partidoId: partido.id,
        equipo: j.equipo,
        goles: j.goles,
        asistencias: j.asistencias,
        influencias: j.goles + j.asistencias,
        golesFavor: propio,
        golesContra: ajeno,
        resultado,
        companeros: porEquipo[j.equipo].filter((n) => n !== j.nombre),
        rivales: porEquipo[j.equipo === 'naranja' ? 'azul' : 'naranja'],
      };

      const lista = historiales.get(j.nombre);
      if (lista) lista.push(entrada);
      else historiales.set(j.nombre, [entrada]);
    }
  }

  return historiales;
}

export function calcularStats(partidos: Partido[]): StatsJugador[] {
  const historiales = calcularHistoriales(partidos);
  const salida: StatsJugador[] = [];

  for (const [nombre, historial] of historiales) {
    let goles = 0;
    let asistencias = 0;
    let PG = 0;
    let PE = 0;
    let PP = 0;
    let GF = 0;
    let GC = 0;

    for (const h of historial) {
      goles += h.goles;
      asistencias += h.asistencias;
      GF += h.golesFavor;
      GC += h.golesContra;
      if (h.resultado === 'V') PG++;
      else if (h.resultado === 'E') PE++;
      else PP++;
    }

    const PJ = historial.length;
    const influencias = goles + asistencias;

    salida.push({
      nombre,
      goles,
      asistencias,
      influencias,
      PJ,
      PG,
      PE,
      PP,
      GF,
      GC,
      DG: GF - GC,
      golesPorPartido: div(goles, PJ),
      asistenciasPorPartido: div(asistencias, PJ),
      influenciasPorPartido: div(influencias, PJ),
      pgPorcentaje: div(PG, PJ),
      pePorcentaje: div(PE, PJ),
      ppPorcentaje: div(PP, PJ),
      participacionGoles: div(influencias, GF),
      puntosPorPartido: div(PG * 3 + PE, PJ),
      historial,
    });
  }

  return salida.sort((a, b) => b.goles - a.goles);
}

/**
 * Rendimiento del jugador junto a (o enfrentando a) cada otro jugador.
 *
 * `winRateSin` es su rendimiento en el RESTO de sus partidos, y `delta` la
 * diferencia. Sin esa comparacion un "gana el 70% con Fulano" es ruido:
 * podria ser simplemente que Fulano gana el 70% con cualquiera.
 */
export function calcularPares(stats: StatsJugador, tipo: 'companeros' | 'rivales'): StatsPar[] {
  const agrupado = new Map<string, PartidoDeJugador[]>();
  for (const h of stats.historial) {
    for (const otro of h[tipo]) {
      const lista = agrupado.get(otro);
      if (lista) lista.push(h);
      else agrupado.set(otro, [h]);
    }
  }

  const pares: StatsPar[] = [];
  for (const [nombre, compartidos] of agrupado) {
    let PG = 0;
    let PE = 0;
    let PP = 0;
    let dg = 0;
    for (const h of compartidos) {
      if (h.resultado === 'V') PG++;
      else if (h.resultado === 'E') PE++;
      else PP++;
      dg += h.golesFavor - h.golesContra;
    }

    const PJ = compartidos.length;
    const winRate = div(PG, PJ);
    const restoPJ = stats.PJ - PJ;
    // Si jugo TODOS sus partidos con esta persona no hay con que comparar.
    const winRateSin = restoPJ > 0 ? div(stats.PG - PG, restoPJ) : winRate;

    pares.push({
      nombre,
      PJ,
      PG,
      PE,
      PP,
      winRate,
      winRateSin,
      delta: winRate - winRateSin,
      dgPromedio: div(dg, PJ),
    });
  }

  return pares.sort((a, b) => b.PJ - a.PJ);
}

function calcularRachas(historial: PartidoDeJugador[]): {
  actual: Racha;
  mejorInvicto: number;
  peorRacha: number;
} {
  if (!historial.length) {
    return { actual: { tipo: 'E', cantidad: 0 }, mejorInvicto: 0, peorRacha: 0 };
  }

  const ultimo = historial[historial.length - 1].resultado;
  let actual = 0;
  for (let i = historial.length - 1; i >= 0 && historial[i].resultado === ultimo; i--) actual++;

  let mejorInvicto = 0;
  let invictoCorriente = 0;
  let peorRacha = 0;
  let derrotasCorrientes = 0;

  for (const h of historial) {
    if (h.resultado === 'D') {
      invictoCorriente = 0;
      derrotasCorrientes++;
    } else {
      invictoCorriente++;
      derrotasCorrientes = 0;
    }
    mejorInvicto = Math.max(mejorInvicto, invictoCorriente);
    peorRacha = Math.max(peorRacha, derrotasCorrientes);
  }

  return { actual: { tipo: ultimo, cantidad: actual }, mejorInvicto, peorRacha };
}

function calcularRecords(historial: PartidoDeJugador[]): Records {
  let mejorPartido: PartidoDeJugador | null = null;
  let hatTricks = 0;
  let partidosDe5 = 0;
  let enBlanco = 0;
  let maxGolesEnUnPartido = 0;

  for (const h of historial) {
    if (!mejorPartido || h.influencias > mejorPartido.influencias) mejorPartido = h;
    if (h.goles >= 3) hatTricks++;
    if (h.goles >= 5) partidosDe5++;
    if (h.influencias === 0) enBlanco++;
    maxGolesEnUnPartido = Math.max(maxGolesEnUnPartido, h.goles);
  }

  return { mejorPartido, hatTricks, partidosDe5, enBlanco, maxGolesEnUnPartido };
}

/** Media movil de influencias sobre las ultimas `ventana` apariciones. */
function calcularEvolucion(historial: PartidoDeJugador[], ventana = 5) {
  return historial.map((h, i) => {
    const desde = Math.max(0, i - ventana + 1);
    const trozo = historial.slice(desde, i + 1);
    const suma = trozo.reduce((acc, x) => acc + x.influencias, 0);
    return {
      partidoId: h.partidoId,
      influencias: h.influencias,
      mediaMovil: suma / trozo.length,
    };
  });
}

/**
 * Puesto del jugador en cada metrica, contra los que superan el minimo de
 * partidos. Un jugador que no llega al minimo igual recibe su puesto real
 * dentro de esa poblacion, para no inventar un "1ro" con 2 partidos.
 */
function calcularPosiciones(
  stats: StatsJugador,
  todos: StatsJugador[],
  minimo: number
): Record<string, { puesto: number; total: number }> {
  const elegibles = todos.filter((s) => s.PJ >= minimo);
  const poblacion = elegibles.some((s) => s.nombre === stats.nombre)
    ? elegibles
    : [...elegibles, stats];

  const posiciones: Record<string, { puesto: number; total: number }> = {};
  for (const metrica of METRICAS) {
    const clave = metrica.clave as ClaveMetrica;
    // GC y PP son "mejores" cuanto mas bajos.
    const menorEsMejor = clave === 'GC' || clave === 'PP' || clave === 'ppPorcentaje';
    const ordenados = [...poblacion].sort((a, b) =>
      menorEsMejor
        ? (a[clave] as number) - (b[clave] as number)
        : (b[clave] as number) - (a[clave] as number)
    );
    posiciones[clave] = {
      puesto: ordenados.findIndex((s) => s.nombre === stats.nombre) + 1,
      total: poblacion.length,
    };
  }
  return posiciones;
}

export function calcularPerfil(
  stats: StatsJugador,
  todos: StatsJugador[],
  minimoRanking = MIN_PARTIDOS_RANKING
): PerfilJugador {
  const { actual, mejorInvicto, peorRacha } = calcularRachas(stats.historial);
  const companeros = calcularPares(stats, 'companeros');
  const rivales = calcularPares(stats, 'rivales');

  return {
    stats,
    companeros,
    rivales,
    ultimos5: stats.historial.slice(-5).map((h) => h.resultado),
    rachaActual: actual,
    mejorInvicto,
    peorRacha,
    records: calcularRecords(stats.historial),
    posiciones: calcularPosiciones(stats, todos, minimoRanking),
    // calcularPares ya devuelve ordenado por PJ descendente.
    companeroMasFrecuente: companeros[0] ?? null,
    rivalMasFrecuente: rivales[0] ?? null,
    evolucion: calcularEvolucion(stats.historial),
  };
}

export function calcularLiga(partidos: Partido[]): StatsLiga {
  let victoriasNaranjas = 0;
  let victoriasAzules = 0;
  let empates = 0;
  let golesNaranjas = 0;
  let golesAzules = 0;
  let partidoMasGoleador: StatsLiga['partidoMasGoleador'] = null;
  let goleadaMasGrande: StatsLiga['goleadaMasGrande'] = null;
  const mvpPorFecha: MvpFecha[] = [];

  for (const partido of [...partidos].sort((a, b) => a.id - b.id)) {
    const { naranja, azul } = marcadorDe(partido);

    if (naranja > azul) victoriasNaranjas++;
    else if (azul > naranja) victoriasAzules++;
    else empates++;

    golesNaranjas += naranja;
    golesAzules += azul;

    const total = naranja + azul;
    if (!partidoMasGoleador || total > partidoMasGoleador.total) {
      partidoMasGoleador = { partidoId: partido.id, total };
    }

    const diferencia = Math.abs(naranja - azul);
    if (!goleadaMasGrande || diferencia > goleadaMasGrande.diferencia) {
      goleadaMasGrande = {
        partidoId: partido.id,
        diferencia,
        marcador: `${naranja} - ${azul}`,
      };
    }

    let mvp: MvpFecha | null = null;
    for (const j of partido.jugadores) {
      const influencias = j.goles + j.asistencias;
      if (!mvp || influencias > mvp.influencias) {
        mvp = {
          partidoId: partido.id,
          nombre: j.nombre,
          influencias,
          goles: j.goles,
          asistencias: j.asistencias,
        };
      }
    }
    if (mvp) mvpPorFecha.push(mvp);
  }

  const cantidad = partidos.length;
  const golesTotales = golesNaranjas + golesAzules;

  return {
    partidos: cantidad,
    victoriasNaranjas,
    victoriasAzules,
    empates,
    golesNaranjas,
    golesAzules,
    golesTotales,
    promedioGolesPorPartido: div(golesTotales, cantidad),
    partidoMasGoleador,
    goleadaMasGrande,
    mvpPorFecha,
  };
}
