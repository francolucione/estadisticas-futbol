import { ArchivoPartidos, Partido } from '../models/partido.model';
import archivo from '../data/partidos.json';
import totalesLegacy from '../data/totales-legacy.fixture.json';
import { aplicarAlias, marcadorDe, validar } from './partidos.service';
import {
  calcularLiga,
  calcularPares,
  calcularPerfil,
  calcularStats,
} from './stats.engine';

const partidos = aplicarAlias(archivo as ArchivoPartidos);

/**
 * Los unicos jugadores en los que motor nuevo y viejo NO deben coincidir,
 * porque el rework los corrige a proposito.
 */
const DIFERENCIAS_ESPERADAS = {
  /** Era una fila fantasma: un gol sin dueno contado como jugador. */
  soloEnLegacy: ['Goles en Contra', 'Invita2'],
  /** Dos personas distintas que el motor viejo fusionaba en una. */
  soloEnNuevo: ['Invita2 A', 'Invita2 B'],
};

const CAMPOS = ['goles', 'asistencias', 'influencias', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG'] as const;

describe('paridad con el agregador original', () => {
  const stats = calcularStats(partidos);
  const legacy = totalesLegacy as Record<string, Record<string, number>>;

  it('cubre el mismo padron de jugadores, salvo las correcciones previstas', () => {
    const nuevos = stats.map((s) => s.nombre).sort();
    const viejos = Object.keys(legacy).sort();

    expect(viejos.filter((n) => !nuevos.includes(n)).sort()).toEqual(
      [...DIFERENCIAS_ESPERADAS.soloEnLegacy].sort()
    );
    expect(nuevos.filter((n) => !viejos.includes(n)).sort()).toEqual(
      [...DIFERENCIAS_ESPERADAS.soloEnNuevo].sort()
    );
  });

  it('reproduce exactamente los totales de cada jugador', () => {
    const comparables = stats.filter((s) => !DIFERENCIAS_ESPERADAS.soloEnNuevo.includes(s.nombre));
    expect(comparables.length).toBe(33);

    for (const s of comparables) {
      const esperado = legacy[s.nombre];
      expect(esperado).withContext(`${s.nombre} no existe en el fixture legacy`).toBeDefined();
      for (const campo of CAMPOS) {
        expect(s[campo])
          .withContext(`${s.nombre} -> ${campo}`)
          .toBe(esperado[campo]);
      }
    }
  });

  it('deja de contar el gol en contra como un partido jugado', () => {
    const totalPJ = calcularStats(partidos).reduce((a, s) => a + s.PJ, 0);
    // 47 fechas x 10 jugadores. El motor viejo daba 471 por la fila fantasma.
    expect(totalPJ).toBe(470);
    const legacyPJ = Object.values(legacy).reduce((a, s) => a + s['PJ'], 0);
    expect(legacyPJ).toBe(471);
  });

  it('separa a los dos invitados que compartieron nombre en la fecha 46', () => {
    const a = calcularStats(partidos).find((s) => s.nombre === 'Invita2 A')!;
    const b = calcularStats(partidos).find((s) => s.nombre === 'Invita2 B')!;
    // El motor viejo les daba PJ 2 y, en un mismo partido, una victoria y
    // una derrota simultaneas.
    expect(a.PJ).toBe(1);
    expect(b.PJ).toBe(1);
    expect(legacy['Invita2']['PJ']).toBe(2);
    expect(legacy['Invita2']['PG'] + legacy['Invita2']['PP']).toBe(2);
  });
});

describe('marcador', () => {
  it('suma los goles en contra al equipo beneficiado', () => {
    const fecha41 = partidos.find((p) => p.id === 41)!;
    expect(fecha41.golesEnContra).toEqual([{ favorA: 'naranja', cantidad: 1 }]);
    const { naranja, azul } = marcadorDe(fecha41);
    // Sin el gol en contra seria 7-8 y ganaba azul; con el, es empate.
    expect(naranja).toBe(8);
    expect(azul).toBe(8);
  });
});

describe('validacion de datos', () => {
  it('reporta la fecha 9, que quedo con equipos desparejos', () => {
    const avisos = validar(partidos);
    expect(avisos.length).toBe(1);
    expect(avisos[0]).toContain('Fecha 9');
  });

  it('rechaza un alias que haga coincidir dos jugadores del mismo partido', () => {
    const roto: ArchivoPartidos = {
      alias: { 'Invita2 B': 'Invita2 A' },
      partidos: (archivo as ArchivoPartidos).partidos,
    };
    expect(() => aplicarAlias(roto)).toThrowError(/aparece dos veces/);
  });
});

// --- Fixture chico y controlado a mano, para las metricas nuevas ---

function partido(id: number, naranja: [string, number][], azul: [string, number][]): Partido {
  return {
    id,
    jugadores: [
      ...naranja.map(([nombre, goles]) => ({ nombre, goles, asistencias: 0, equipo: 'naranja' as const })),
      ...azul.map(([nombre, goles]) => ({ nombre, goles, asistencias: 0, equipo: 'azul' as const })),
    ],
  };
}

/**
 * A juega 4 partidos: gana 2, empata 1, pierde 1.
 * Con B como companero juega 3 (1 victoria); el unico partido sin B lo gana.
 */
const FIXTURE: Partido[] = [
  partido(1, [['A', 2], ['B', 0]], [['X', 0], ['Y', 0]]), // 2-0  A y B ganan
  partido(2, [['A', 1], ['X', 0]], [['B', 0], ['Y', 0]]), // 1-0  A gana sin B
  partido(3, [['A', 0], ['B', 0]], [['X', 1], ['Y', 0]]), // 0-1  A y B pierden
  partido(4, [['A', 0], ['B', 0]], [['X', 0], ['Y', 0]]), // 0-0  empate
];

describe('metricas nuevas', () => {
  const stats = calcularStats(FIXTURE);
  const a = stats.find((s) => s.nombre === 'A')!;

  it('acumula los totales del fixture', () => {
    expect(a.PJ).toBe(4);
    expect(a.PG).toBe(2);
    expect(a.PE).toBe(1);
    expect(a.PP).toBe(1);
  });

  it('compara el rendimiento con un companero contra el resto de sus partidos', () => {
    const conB = calcularPares(a, 'companeros').find((p) => p.nombre === 'B')!;
    expect(conB.PJ).toBe(3);
    expect(conB.PG).toBe(1);
    expect(conB.winRate).toBeCloseTo(1 / 3);
    // Su unico partido sin B lo gano.
    expect(conB.winRateSin).toBeCloseTo(1);
    expect(conB.delta).toBeCloseTo(1 / 3 - 1);
  });

  it('hace lo mismo contra los rivales', () => {
    const vsX = calcularPares(a, 'rivales').find((p) => p.nombre === 'X')!;
    // En el partido 2, X fue companero: no cuenta como enfrentamiento.
    expect(vsX.PJ).toBe(3);
    expect(vsX.winRate).toBeCloseTo(1 / 3);
    expect(vsX.winRateSin).toBeCloseTo(1);
  });

  it('no inventa un delta cuando siempre jugaron juntos', () => {
    const soloJuntos: Partido[] = [partido(1, [['A', 1], ['B', 0]], [['X', 0], ['Y', 0]])];
    const uno = calcularStats(soloJuntos).find((s) => s.nombre === 'A')!;
    const conB = calcularPares(uno, 'companeros').find((p) => p.nombre === 'B')!;
    expect(conB.winRateSin).toBe(conB.winRate);
    expect(conB.delta).toBe(0);
  });

  it('calcula rachas sobre el historial cronologico', () => {
    const perfil = calcularPerfil(a, stats, 0);
    expect(perfil.ultimos5).toEqual(['V', 'V', 'D', 'E']);
    expect(perfil.rachaActual).toEqual({ tipo: 'E', cantidad: 1 });
    expect(perfil.mejorInvicto).toBe(2); // partidos 1 y 2
    expect(perfil.peorRacha).toBe(1);
  });

  it('no divide por cero con un jugador sin goles a favor', () => {
    const seco = calcularStats([partido(1, [['A', 0]], [['X', 0]])]).find((s) => s.nombre === 'A')!;
    expect(seco.participacionGoles).toBe(0);
    expect(seco.golesPorPartido).toBe(0);
  });
});

describe('estadisticas de liga', () => {
  const liga = calcularLiga(partidos);

  it('cuenta los 47 partidos y reparte los resultados', () => {
    expect(liga.partidos).toBe(47);
    expect(liga.victoriasNaranjas + liga.victoriasAzules + liga.empates).toBe(47);
  });

  it('elige un MVP por fecha', () => {
    expect(liga.mvpPorFecha.length).toBe(47);
    for (const mvp of liga.mvpPorFecha) {
      expect(mvp.influencias).toBe(mvp.goles + mvp.asistencias);
    }
  });
});
