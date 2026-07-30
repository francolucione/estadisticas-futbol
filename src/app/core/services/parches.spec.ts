import { TestBed } from '@angular/core/testing';
import { ArchivoPartidos, Partido } from '../models/partido.model';
import { parchesVacios } from '../models/parches.model';
import { CLAVE_PARCHES, PartidosService, aplicarParches } from './partidos.service';
import { StatsService } from './stats.service';

function partido(id: number, goles = 1): Partido {
  return {
    id,
    jugadores: [
      { nombre: 'A', goles, asistencias: 0, equipo: 'naranja' },
      { nombre: 'B', goles: 0, asistencias: 0, equipo: 'azul' },
    ],
  };
}

const BASE: ArchivoPartidos = { alias: {}, partidos: [partido(1), partido(2), partido(3)] };

describe('aplicarParches', () => {
  it('sin parches devuelve el archivo tal cual', () => {
    const r = aplicarParches(BASE, parchesVacios());
    expect(r.partidos.map((p) => p.id)).toEqual([1, 2, 3]);
  });

  it('reemplaza una fecha por su version corregida', () => {
    const r = aplicarParches(BASE, { ...parchesVacios(), partidos: { 2: partido(2, 9) } });
    expect(r.partidos.find((p) => p.id === 2)!.jugadores[0].goles).toBe(9);
    expect(r.partidos.find((p) => p.id === 1)!.jugadores[0].goles).toBe(1);
  });

  it('agrega fechas nuevas y las deja ordenadas', () => {
    const r = aplicarParches(BASE, { ...parchesVacios(), agregados: [partido(4)] });
    expect(r.partidos.map((p) => p.id)).toEqual([1, 2, 3, 4]);
  });

  it('saca las fechas borradas', () => {
    const r = aplicarParches(BASE, { ...parchesVacios(), borrados: [2] });
    expect(r.partidos.map((p) => p.id)).toEqual([1, 3]);
  });

  it('suma los alias a los del archivo base', () => {
    const conAlias: ArchivoPartidos = { ...BASE, alias: { X: 'A' } };
    const r = aplicarParches(conAlias, { ...parchesVacios(), alias: { Y: 'B' } });
    expect(r.alias).toEqual({ X: 'A', Y: 'B' });
  });
});

describe('PartidosService con correcciones', () => {
  let svc: PartidosService;
  let stats: StatsService;

  beforeEach(() => {
    localStorage.removeItem(CLAVE_PARCHES);
    TestBed.configureTestingModule({});
    svc = TestBed.inject(PartidosService);
    stats = TestBed.inject(StatsService);
  });

  afterEach(() => {
    svc.descartarTodo();
    localStorage.removeItem(CLAVE_PARCHES);
    TestBed.resetTestingModule();
  });

  it('arranca limpio sobre los datos del repositorio', () => {
    expect(svc.hayCorrecciones()).toBeFalse();
    expect(svc.partidos().length).toBe(47);
    expect(svc.cantidadCorrecciones()).toBe(0);
  });

  it('corregir un gol mueve la estadistica del jugador', () => {
    const antes = stats.buscar('Lucio')!.goles;
    const fecha = structuredClone(svc.porId(1)!);
    const lucio = fecha.jugadores.find((j) => j.nombre === 'Lucio')!;
    lucio.goles += 5;

    svc.guardarFecha(fecha);

    expect(stats.buscar('Lucio')!.goles).toBe(antes + 5);
    expect(svc.hayCorrecciones()).toBeTrue();
    expect(svc.fueEditada(1)).toBeTrue();
  });

  it('restaurar una fecha deshace la correccion', () => {
    const antes = stats.buscar('Lucio')!.goles;
    const fecha = structuredClone(svc.porId(1)!);
    fecha.jugadores.find((j) => j.nombre === 'Lucio')!.goles += 5;
    svc.guardarFecha(fecha);

    svc.restaurarFecha(1);

    expect(stats.buscar('Lucio')!.goles).toBe(antes);
    expect(svc.fueEditada(1)).toBeFalse();
    expect(svc.hayCorrecciones()).toBeFalse();
  });

  it('borrar una fecha la saca de las estadisticas', () => {
    const antes = stats.buscar('Lucio')!.PJ;
    svc.borrarFecha(1);

    expect(svc.partidos().length).toBe(46);
    expect(stats.buscar('Lucio')!.PJ).toBe(antes - 1);
  });

  it('agrega una fecha nueva con el id siguiente', () => {
    const id = svc.proximoId();
    expect(id).toBe(48);

    svc.guardarFecha({
      id,
      jugadores: [
        { nombre: 'Lucio', goles: 3, asistencias: 0, equipo: 'naranja' },
        { nombre: 'Guido', goles: 1, asistencias: 0, equipo: 'azul' },
      ],
    });

    expect(svc.partidos().length).toBe(48);
    expect(svc.porId(48)).toBeDefined();
  });

  it('borrar una fecha agregada localmente la elimina del todo', () => {
    const id = svc.proximoId();
    svc.guardarFecha({
      id,
      jugadores: [
        { nombre: 'Lucio', goles: 1, asistencias: 0, equipo: 'naranja' },
        { nombre: 'Guido', goles: 0, asistencias: 0, equipo: 'azul' },
      ],
    });
    svc.borrarFecha(id);

    expect(svc.partidos().length).toBe(47);
    // No quedan restos: no tiene sentido "recordar" el borrado de algo que
    // nunca estuvo en el archivo base.
    expect(svc.hayCorrecciones()).toBeFalse();
  });

  it('un alias fusiona dos jugadores en uno', () => {
    const martin = stats.buscar('Martin')!.PJ;
    const martin2 = stats.buscar('Martin2')!.PJ;

    svc.definirAlias({ Martin2: 'Martin' });

    expect(stats.buscar('Martin2')).toBeUndefined();
    expect(stats.buscar('Martin')!.PJ).toBe(martin + martin2);
  });

  it('descartar deja todo como estaba', () => {
    const antes = stats.buscar('Lucio')!.goles;
    const fecha = structuredClone(svc.porId(1)!);
    fecha.jugadores.find((j) => j.nombre === 'Lucio')!.goles += 5;
    svc.guardarFecha(fecha);
    svc.borrarFecha(2);
    svc.definirAlias({ Martin2: 'Martin' });

    svc.descartarTodo();

    expect(svc.hayCorrecciones()).toBeFalse();
    expect(svc.partidos().length).toBe(47);
    expect(stats.buscar('Lucio')!.goles).toBe(antes);
    expect(stats.buscar('Martin2')).toBeDefined();
  });

  it('lo exportado se vuelve a leer igual', () => {
    const fecha = structuredClone(svc.porId(5)!);
    fecha.jugadores[0].goles = 7;
    svc.guardarFecha(fecha);
    svc.definirAlias({ Martin2: 'Martin' });

    const exportado = JSON.parse(svc.exportar()) as ArchivoPartidos;

    expect(exportado.alias).toEqual({ Martin2: 'Martin' });
    expect(exportado.partidos.length).toBe(47);
    expect(exportado.partidos.find((p) => p.id === 5)!.jugadores[0].goles).toBe(7);
    // Reimportarlo sin parches tiene que dar exactamente lo mismo que se ve.
    expect(aplicarParches(exportado, parchesVacios())).toEqual(svc.archivo());
  });

  it('sobrevive a un localStorage corrupto', () => {
    localStorage.setItem(CLAVE_PARCHES, '{no es json');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const otro = TestBed.inject(PartidosService);
    expect(otro.partidos().length).toBe(47);
    expect(otro.hayCorrecciones()).toBeFalse();
  });
});
