import { ArchivoPartidos } from '../models/partido.model';
import archivo from '../data/partidos.json';
import { aplicarAlias } from './partidos.service';
import { calcularStats } from './stats.engine';
import { calcularCuriosidades } from './curiosidades.engine';

const partidos = aplicarAlias(archivo as ArchivoPartidos);
const stats = calcularStats(partidos);
const curiosidades = calcularCuriosidades(stats, partidos);

const buscar = (id: string) => curiosidades.find((c) => c.id === id);

describe('curiosidades', () => {
  it('genera tarjetas de todas las categorias', () => {
    const categorias = new Set(curiosidades.map((c) => c.categoria));
    expect(categorias).toEqual(
      new Set(['records', 'rachas', 'quimica', 'rarezas', 'liga'])
    );
  });

  it('no repite ids', () => {
    const ids = curiosidades.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('toda tarjeta tiene titular, valor y detalle', () => {
    for (const c of curiosidades) {
      expect(c.titular.length).withContext(c.id).toBeGreaterThan(0);
      expect(c.valor.length).withContext(c.id).toBeGreaterThan(0);
      expect(c.detalle.length).withContext(c.id).toBeGreaterThan(0);
    }
  });

  it('los jugadores mencionados existen y aparecen en el detalle', () => {
    const nombres = new Set(stats.map((s) => s.nombre));
    for (const c of curiosidades) {
      for (const j of c.jugadores) {
        expect(nombres.has(j)).withContext(`${c.id} menciona a ${j}`).toBeTrue();
        expect(c.detalle).withContext(c.id).toContain(j);
      }
    }
  });

  // --- valores concretos, verificados a mano sobre las 47 fechas ---

  it('encuentra los 9 goles de Juan en la fecha 30', () => {
    const c = buscar('max-goles-partido')!;
    expect(c.valor).toBe('9 goles');
    expect(c.jugadores).toEqual(['Juan']);
    expect(c.detalle).toContain('fecha 30');
  });

  it('encuentra la mejor actuacion, desempatando por goles', () => {
    // Tres actuaciones empatan en 10 influencias: Bruno 8G+2A en la fecha 18,
    // Guido 5G+5A en la 27 y Lucio 4G+6A en la 12. Gana el de mas goles.
    const c = buscar('mejor-actuacion')!;
    expect(c.valor).toBe('10');
    expect(c.jugadores).toEqual(['Bruno']);
    expect(c.detalle).toContain('fecha 18');
  });

  it('el desempate es estable, no depende del orden de entrada', () => {
    const alReves = calcularCuriosidades([...stats].reverse(), [...partidos].reverse());
    const original = buscar('mejor-actuacion')!;
    const invertido = alReves.find((c) => c.id === 'mejor-actuacion')!;
    expect(invertido.jugadores).toEqual(original.jugadores);
    expect(invertido.detalle).toBe(original.detalle);
  });

  it('mide las rachas mas largas', () => {
    expect(buscar('mejor-invicto')!.valor).toBe('7');
    expect(buscar('mejor-invicto')!.jugadores).toEqual(['Lucio']);
    expect(buscar('peor-racha')!.valor).toBe('7');
    expect(buscar('peor-racha')!.jugadores).toEqual(['Bruno']);
  });

  it('separa al mas definidor del mas asistidor', () => {
    expect(buscar('mas-definidor')!.jugadores).toEqual(['Bruno']);
    expect(buscar('mas-definidor')!.valor).toBe('2.06');
    expect(buscar('mas-asistidor')!.jugadores).toEqual(['Gaby']);
  });

  it('encuentra la mejor y la peor dupla', () => {
    // Adri R y Lucio ganaron 11 de los 15 que jugaron juntos (73.3%).
    // Antes de corregir la fecha 9 la mejor era Adri B con Lucio: en esa fecha
    // los dos figuraban de azul, asi que contaba como partido juntos y ganado.
    // Con Adri B pasado a naranja quedaron enfrentados, y la dupla cayo a 8 de
    // 11 (72.7%), apenas por debajo.
    const mejor = buscar('mejor-dupla')!;
    expect(mejor.jugadores.sort()).toEqual(['Adri R', 'Lucio']);
    expect(mejor.valor).toBe('73%');
    expect(mejor.detalle).toContain('11 de los 15');

    const peor = buscar('peor-dupla')!;
    expect(peor.jugadores.sort()).toEqual(['Fer L', 'Hernan']);
  });

  it('identifica la bestia negra y el cliente', () => {
    const bestia = buscar('bestia-negra')!;
    expect(bestia.jugadores).toEqual(['Adri R', 'Lucio']);
    expect(bestia.valor).toBe('-35 pp');

    const cliente = buscar('cliente')!;
    expect(cliente.jugadores).toEqual(['Adri R', 'Hernan']);
    expect(cliente.valor).toBe('+41 pp');
  });

  it('destaca que Lucio jugo las 47 fechas', () => {
    const c = buscar('presentismo')!;
    expect(c.valor).toBe('47 de 47');
    expect(c.jugadores).toEqual(['Lucio']);
    expect(c.detalle).toContain('todas las fechas');
  });

  it('detecta que Martin y Martin2 nunca coincidieron', () => {
    const c = curiosidades.find(
      (x) => x.id.startsWith('nunca-coinciden') && x.jugadores.includes('Martin2')
        && x.jugadores.includes('Martin')
    )!;
    expect(c).toBeDefined();
    expect(c.titular).toBe('Sospechosamente parecidos');
    // La nota tiene que ofrecer la salida, no solo sembrar la duda.
    expect(c.nota).toContain('alias');
  });

  it('mide como bajaron los goles por fecha', () => {
    const c = buscar('evolucion-goles')!;
    expect(c.valor).toBe('19.2 → 17.3');
    expect(c.titular).toBe('Se puso mas trabada');
  });

  it('cuenta los empates de la liga', () => {
    // Cuatro desde que la fecha 9 dejo de ser un 5-13 para ser un 9-9.
    expect(buscar('empates')!.valor).toBe('4');
  });

  it('no explota con pocos datos', () => {
    const chico = [
      {
        id: 1,
        jugadores: [
          { nombre: 'A', goles: 1, asistencias: 0, equipo: 'naranja' as const },
          { nombre: 'B', goles: 0, asistencias: 0, equipo: 'azul' as const },
        ],
      },
    ];
    expect(() => calcularCuriosidades(calcularStats(chico), chico)).not.toThrow();
  });

  it('devuelve vacio sin datos', () => {
    expect(calcularCuriosidades([], [])).toEqual([]);
  });
});
