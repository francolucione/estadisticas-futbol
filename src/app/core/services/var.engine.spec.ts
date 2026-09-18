import datosCrudos from '../data/partidos.json';
import { CATEGORIAS_BASE } from '../data/categorias';
import { ArchivoPartidos, Partido } from '../models/partido.model';
import { Contadores, Evento } from '../models/var.model';
import { aplicarAlias } from './partidos.service';
import {
  carriles,
  compararGoles,
  conteosDe,
  diferenciasDeTitulos,
  fraseDe,
  golesDeEventos,
  hms,
  ranking,
} from './var.engine';
import { VIDEOS } from './var.service';
import { MemoriaVarFuente } from './var.fuente';
import { firstValueFrom } from 'rxjs';

const cat = (id: string) => CATEGORIAS_BASE.find((c) => c.id === id)!;

function ev(parcial: Partial<Evento>): Evento {
  return {
    id: 'x',
    videoId: 'v',
    t: 0,
    categoriaId: 'gol',
    jugador: 'Lucio',
    autorUid: 'u',
    autorNombre: 'U',
    creado: 0,
    ...parcial,
  };
}

describe('var.engine', () => {
  it('hms siempre con horas', () => {
    expect(hms(0)).toBe('00:00:00');
    expect(hms(1394)).toBe('00:23:14');
    expect(hms(4040.9)).toBe('01:07:20');
  });

  describe('fraseDe', () => {
    it('con segundo jugador usa la parte opcional', () => {
      expect(fraseDe(cat('robo'), { jugador: 'Guido', jugador2: 'Dario' })).toBe('Guido roba a Dario');
      expect(fraseDe(cat('gol'), { jugador: 'Lucio', jugador2: 'Adri R' })).toBe(
        'Gol de Lucio, asistencia de Adri R'
      );
    });

    it('sin segundo jugador la saca entera', () => {
      expect(fraseDe(cat('robo'), { jugador: 'Guido' })).toBe('Guido roba');
      expect(fraseDe(cat('gol'), { jugador: 'Lucio' })).toBe('Gol de Lucio');
      expect(fraseDe(cat('cordones'), { jugador: 'Adri R' })).toBe('Adri R se ata los cordones');
    });
  });

  describe('ranking y conteos', () => {
    const c: Contadores = {
      categorias: {
        cordones: { total: 9, porJugador: { 'Adri R': 5, Lucio: 2, Guido: 2, Dario: 0 } },
        grita: { total: 3, porJugador: { Lucio: 3 } },
      },
      porVideo: {},
    };

    it('ordena por cantidad y desempata alfabetico; los ceros no entran', () => {
      expect(ranking(c, 'cordones')).toEqual([
        { nombre: 'Adri R', cantidad: 5 },
        { nombre: 'Guido', cantidad: 2 },
        { nombre: 'Lucio', cantidad: 2 },
      ]);
    });

    it('los empatados comparten puesto', () => {
      const lucio = conteosDe(c, CATEGORIAS_BASE, 'Lucio');
      expect(lucio.map((x) => [x.categoria.id, x.cantidad, x.puesto, x.de])).toEqual([
        ['grita', 3, 1, 1],
        ['cordones', 2, 2, 3],
      ]);
    });
  });

  it('carriles: dos eventos cercanos no comparten carril', () => {
    const r = carriles([{ t: 100 }, { t: 105 }, { t: 300 }, { t: 102 }], 20);
    expect(r.map((x) => [x.evento.t, x.carril])).toEqual([
      [100, 0],
      [102, 1],
      [105, 2],
      [300, 0],
    ]);
  });

  it('compararGoles avisa solo las diferencias', () => {
    const partido: Partido = {
      id: 1,
      jugadores: [
        { nombre: 'Lucio', goles: 2, asistencias: 0, equipo: 'naranja' },
        { nombre: 'Guido', goles: 1, asistencias: 0, equipo: 'azul' },
      ],
    };
    const goles = golesDeEventos([ev({ jugador: 'Lucio' }), ev({ jugador: 'Lucio' }), ev({ jugador: 'Dario' })]);
    expect(compararGoles(partido, goles)).toEqual([
      { jugador: 'Dario', json: 0, video: 1 },
      { jugador: 'Guido', json: 1, video: 0 },
    ]);
  });
});

describe('videos del canal', () => {
  const partidos = aplicarAlias(datosCrudos as ArchivoPartidos);

  it('estan las 47 fechas, una vez cada una', () => {
    const ids = VIDEOS.filter((v) => v.fechaId !== undefined).map((v) => v.fechaId!);
    expect(ids.length).toBe(47);
    expect(new Set(ids).size).toBe(47);
  });

  it('todos tienen duracion', () => {
    expect(VIDEOS.filter((v) => !v.duracionSeg).map((v) => v.titulo)).toEqual([]);
  });

  /**
   * Las fechas donde el titulo del video y el JSON no dan el mismo marcador, al
   * 18-sep-2026. No se corrigen solas: no se sabe cual de los dos tiene razon. Si alguien
   * corrige el JSON (o aparece una diferencia nueva), este test avisa para actualizar la
   * lista a sabiendas.
   */
  it('las diferencias titulo vs JSON son las conocidas', () => {
    const d = diferenciasDeTitulos(VIDEOS, partidos);
    expect(d.map((x) => x.fechaId)).toEqual([1, 3, 10, 11, 13, 20, 29, 32, 33, 43]);
    expect(d.filter((x) => x.tipo === 'invertido').map((x) => x.fechaId)).toEqual([11, 33]);
  });
});

describe('MemoriaVarFuente', () => {
  it('alta y baja mueven los contadores', async () => {
    const f = new MemoriaVarFuente();
    const autor = { uid: 'u', nombre: 'U' };
    await f.anotar({ videoId: 'v', t: 10, categoriaId: 'cordones', jugador: 'Adri R' }, autor);
    await f.anotar({ videoId: 'v', t: 20, categoriaId: 'cordones', jugador: 'Adri R' }, autor);

    let c = await firstValueFrom(f.contadores());
    expect(c.categorias['cordones'].porJugador['Adri R']).toBe(2);
    expect(c.porVideo['v']).toBe(2);

    const [primero] = await firstValueFrom(f.eventosDeVideo('v'));
    await f.borrar(primero);
    c = await firstValueFrom(f.contadores());
    expect(c.categorias['cordones'].total).toBe(1);
    expect(c.porVideo['v']).toBe(1);
  });
});
