import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { of } from 'rxjs';
import { CLAVE_PARCHES } from '../core/services/partidos.service';
import { ContadorService } from '../shared/contador.service';
import { TablaPage } from './tabla/tabla.page';
import { FechasPage } from './fechas/fechas.page';
import { FechaDetallePage } from './fechas/fecha-detalle.page';
import { JugadoresPage } from './jugadores/jugadores.page';
import { JugadorPage } from './jugador/jugador.page';
import { CompararPage } from './comparar/comparar.page';
import { DatosPage } from './datos/datos.page';
import { AdminPage } from './admin/admin.page';

/**
 * Estas pruebas montan cada pantalla con los datos reales. No revisan
 * estetica: revisan que las plantillas no revienten al renderizar, que es
 * donde la version anterior fallaba en silencio.
 */
function montar<T>(componente: Type<T>, params: Record<string, string> = {}): ComponentFixture<T> {
  TestBed.configureTestingModule({
    imports: [componente],
    providers: [
      provideIonicAngular(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap(params)) } },
    ],
  });

  const fixture = TestBed.createComponent(componente);
  fixture.detectChanges();
  return fixture;
}

// El servicio lee correcciones de localStorage: cada prueba arranca limpia.
beforeEach(() => localStorage.removeItem(CLAVE_PARCHES));
afterEach(() => {
  localStorage.removeItem(CLAVE_PARCHES);
  TestBed.resetTestingModule();
});

describe('TablaPage', () => {
  it('arranca en la tabla de posiciones, ordenada por puntos', () => {
    const fixture = montar(TablaPage);
    expect(fixture.componentInstance.vista()).toBe('posiciones');

    const posiciones = fixture.componentInstance.posiciones();
    expect(posiciones.length).toBeGreaterThan(0);
    for (let i = 1; i < posiciones.length; i++) {
      expect(posiciones[i - 1].puntos).toBeGreaterThanOrEqual(posiciones[i].puntos);
    }
    // 3 por ganado, 1 por empatado.
    const primero = posiciones[0];
    expect(primero.puntos).toBe(primero.PG * 3 + primero.PE);
  });

  it('el ranking por goles sigue encabezado por el maximo goleador', () => {
    const fixture = montar(TablaPage);
    fixture.componentInstance.cambiarVista('ataque');
    fixture.detectChanges();
    expect(fixture.componentInstance.filas()[0].nombre).toBe('Guido');
  });

  it('el filtro de +10 partidos realmente filtra', () => {
    const fixture = montar(TablaPage);
    fixture.componentInstance.cambiarVista('ataque');
    const conFiltro = fixture.componentInstance.filas().length;

    fixture.componentInstance.soloHabituales.set(false);
    fixture.detectChanges();
    expect(fixture.componentInstance.filas().length).toBeGreaterThan(conFiltro);
  });

  it('ordena GC de menor a mayor, porque conviene tener pocos', () => {
    const fixture = montar(TablaPage);
    fixture.componentInstance.cambiarVista('goles');
    fixture.componentInstance.clave.set('GC');
    fixture.detectChanges();
    const filas = fixture.componentInstance.filas();
    expect(filas[0].GC).toBeLessThanOrEqual(filas[filas.length - 1].GC);
  });

  it('cambiar de metrica re-anima solo su columna', () => {
    const fixture = montar(TablaPage);
    fixture.componentInstance.cambiarVista('ataque');

    const reloj = TestBed.inject(ContadorService);
    const uno = spyOn(reloj, 'reiniciarGrupo');
    const todos = spyOn(reloj, 'reiniciar');

    fixture.componentInstance.elegirMetrica('asistencias');

    expect(uno).toHaveBeenCalledWith('col-asistencias');
    expect(todos).not.toHaveBeenCalled();
  });

  it('re-anima la columna que se resalta, no la clave de la metrica', () => {
    const fixture = montar(TablaPage);
    fixture.componentInstance.cambiarVista('resultados');

    const uno = spyOn(TestBed.inject(ContadorService), 'reiniciarGrupo');
    // PG% resalta la columna PG: si se largara 'col-pgPorcentaje' no se animaria nada.
    fixture.componentInstance.elegirMetrica('pgPorcentaje');

    expect(uno).toHaveBeenCalledWith('col-PG');
  });

  it('los filtros que cambian las filas re-animan toda la tabla', () => {
    const fixture = montar(TablaPage);
    const todos = spyOn(TestBed.inject(ContadorService), 'reiniciar');

    fixture.componentInstance.cambiarSoloHabituales(false);
    expect(todos).toHaveBeenCalled();

    todos.calls.reset();
    fixture.componentInstance.cambiarVista('goles');
    expect(todos).toHaveBeenCalled();
  });
});

describe('FechasPage', () => {
  it('lista las 47 fechas, de la mas nueva a la mas vieja', () => {
    const fixture = montar(FechasPage);
    const fechas = fixture.componentInstance.fechas();
    expect(fechas.length).toBe(47);
    expect(fechas[0].id).toBe(47);
    expect(fechas[fechas.length - 1].id).toBe(1);
  });

  it('marca al ganador de cada fecha', () => {
    const fixture = montar(FechasPage);
    for (const f of fixture.componentInstance.fechas()) {
      const esperado = f.naranja > f.azul ? 'naranja' : f.azul > f.naranja ? 'azul' : null;
      expect(f.ganador).toBe(esperado);
    }
  });
});

describe('FechaDetallePage', () => {
  it('arma las dos formaciones de una fecha', () => {
    const fixture = montar(FechaDetallePage, { id: '12' });
    expect(fixture.componentInstance.formacion('naranja').length).toBe(5);
    expect(fixture.componentInstance.formacion('azul').length).toBe(5);
    expect(fixture.componentInstance.figura()?.nombre).toBe('Lucio');
  });

  it('muestra los goles en contra de la fecha 41', () => {
    const fixture = montar(FechaDetallePage, { id: '41' });
    expect(fixture.componentInstance.golesEnContra()).toEqual([
      { favorA: 'naranja', cantidad: 1 },
    ]);
    expect(fixture.componentInstance.marcador()).toEqual({ naranja: 8, azul: 8 });
  });

  it('no se rompe con una fecha que no existe', () => {
    const fixture = montar(FechaDetallePage, { id: '999' });
    expect(fixture.componentInstance.partido()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No existe');
  });
});

describe('JugadoresPage', () => {
  it('separa habituales de esporadicos', () => {
    const fixture = montar(JugadoresPage);
    expect(fixture.componentInstance.habituales().length).toBeGreaterThan(0);
    expect(fixture.componentInstance.esporadicos().length).toBeGreaterThan(0);
  });

  it('filtra por nombre', () => {
    const fixture = montar(JugadoresPage);
    fixture.componentInstance.busqueda.set('luc');
    fixture.detectChanges();
    const todos = [
      ...fixture.componentInstance.habituales(),
      ...fixture.componentInstance.esporadicos(),
    ];
    expect(todos.length).toBeGreaterThan(0);
    expect(todos.every((j) => j.nombre.toLowerCase().includes('luc'))).toBeTrue();
  });
});

describe('JugadorPage', () => {
  it('arma la ficha completa de un habitual', () => {
    const fixture = montar(JugadorPage, { nombre: 'Lucio' });
    const perfil = fixture.componentInstance.perfil()!;
    expect(perfil.stats.nombre).toBe('Lucio');
    expect(perfil.companeros.length).toBeGreaterThan(0);
    expect(perfil.rivales.length).toBeGreaterThan(0);
    expect(perfil.ultimos5.length).toBe(5);
    expect(fixture.nativeElement.querySelector('app-grafico-evolucion')).toBeTruthy();
  });

  it('no se rompe con un jugador de un solo partido', () => {
    const fixture = montar(JugadorPage, { nombre: 'Invita2 A' });
    expect(fixture.componentInstance.perfil()!.stats.PJ).toBe(1);
    expect(fixture.nativeElement.querySelector('app-grafico-evolucion')).toBeNull();
  });

  it('avisa cuando el nombre no existe', () => {
    const fixture = montar(JugadorPage, { nombre: 'Maradona' });
    expect(fixture.componentInstance.perfil()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No hay ningun jugador');
  });
});

describe('CompararPage', () => {
  it('ofrece candidatos cuando falta el segundo jugador', () => {
    const fixture = montar(CompararPage, { a: 'Lucio' });
    expect(fixture.componentInstance.comparacion()).toBeNull();
    const candidatos = fixture.componentInstance.candidatos();
    expect(candidatos.length).toBeGreaterThan(0);
    expect(candidatos.some((c) => c.nombre === 'Lucio')).toBeFalse();
  });

  it('enfrenta a dos jugadores y reparte las metricas', () => {
    const fixture = montar(CompararPage, { a: 'Lucio', b: 'Guido' });
    const c = fixture.componentInstance.comparacion()!;
    expect(c.a.nombre).toBe('Lucio');
    expect(c.b.nombre).toBe('Guido');
    // Jugaron mucho, asi que tienen historia de los dos lados.
    expect(c.registro.enfrentados.PJ).toBeGreaterThan(0);
    expect(c.registro.juntos.PJ).toBeGreaterThan(0);

    const filas = fixture.componentInstance.filas();
    expect(filas.length).toBe(fixture.componentInstance.metricas.length);
    // Ninguna metrica puede tener dos ganadores.
    expect(filas.every((f) => !(f.ganaA && f.ganaB))).toBeTrue();
  });

  it('la barra de reparto aguanta metricas negativas', () => {
    // Lucio tiene +39 de diferencia de gol y Guido -10: un reparto directo
    // daria 134% y se saldria de la barra.
    const fixture = montar(CompararPage, { a: 'Lucio', b: 'Guido' });
    const filas = fixture.componentInstance.filas();
    for (const f of filas) {
      expect(f.pesoA).withContext(f.etiqueta).toBeGreaterThanOrEqual(0);
      expect(f.pesoA).withContext(f.etiqueta).toBeLessThanOrEqual(100);
    }
    const dg = filas.find((f) => f.etiqueta === 'Diferencia de gol')!;
    expect(dg.pesoA).toBeGreaterThan(50);
    expect(dg.ganaA).toBeTrue();
  });

  it('el registro de enfrentamientos cuadra desde los dos lados', () => {
    const uno = montar(CompararPage, { a: 'Lucio', b: 'Guido' }).componentInstance.comparacion()!;
    TestBed.resetTestingModule();
    const otro = montar(CompararPage, { a: 'Guido', b: 'Lucio' }).componentInstance.comparacion()!;

    expect(otro.registro.enfrentados.PJ).toBe(uno.registro.enfrentados.PJ);
    expect(otro.registro.enfrentados.ganoA).toBe(uno.registro.enfrentados.ganoB);
    expect(otro.registro.enfrentados.ganoB).toBe(uno.registro.enfrentados.ganoA);
    expect(otro.registro.juntos).toEqual(uno.registro.juntos);
  });
});

describe('DatosPage', () => {
  it('muestra el reparto de resultados y las curiosidades', () => {
    const fixture = montar(DatosPage);
    const reparto = fixture.componentInstance.reparto();
    expect(reparto.length).toBe(3);
    expect(reparto.reduce((a, t) => a + t.valor, 0)).toBe(47);
    expect(fixture.componentInstance.curiosidades().length).toBeGreaterThan(5);
  });

  it('filtra curiosidades por categoria', () => {
    const fixture = montar(DatosPage);
    fixture.componentInstance.filtro.set('rachas');
    fixture.detectChanges();
    expect(fixture.componentInstance.curiosidades().every((c) => c.categoria === 'rachas')).toBeTrue();
  });

  it('parte el detalle para poder linkear los nombres', () => {
    const fixture = montar(DatosPage);
    const trozos = fixture.componentInstance.trozos('Lucio le gana a Guido', ['Lucio', 'Guido']);
    expect(trozos.filter((t) => t.jugador).map((t) => t.texto)).toEqual(['Lucio', 'Guido']);
    expect(trozos.map((t) => t.texto).join('')).toBe('Lucio le gana a Guido');
  });

  it('no tiene avisos que mostrar: los datos quedaron limpios', () => {
    // La fecha 9 era el unico aviso y ya esta corregida, asi que la seccion
    // "Avisos sobre los datos" no se renderiza.
    const fixture = montar(DatosPage);
    expect(fixture.componentInstance.avisos()).toEqual([]);
  });
});

describe('AdminPage', () => {
  it('arranca sin correcciones pendientes', () => {
    const fixture = montar(AdminPage);
    expect(fixture.componentInstance.hayCorrecciones()).toBeFalse();
    expect(fixture.componentInstance.fechas().length).toBe(47);
  });

  it('agrega y quita un alias', () => {
    const fixture = montar(AdminPage);
    fixture.componentInstance.aliasDe.set('Martin2');
    fixture.componentInstance.aliasA.set('Martin');
    fixture.componentInstance.agregarAlias();
    fixture.detectChanges();

    expect(fixture.componentInstance.alias()).toEqual([['Martin2', 'Martin']]);
    expect(fixture.componentInstance.hayCorrecciones()).toBeTrue();

    fixture.componentInstance.quitarAlias('Martin2');
    fixture.detectChanges();
    expect(fixture.componentInstance.alias()).toEqual([]);
    expect(fixture.componentInstance.hayCorrecciones()).toBeFalse();
  });
});

describe('contadores al entrar a una pantalla', () => {
  /**
   * Ionic llama ionViewWillEnter por nombre, no por interfaz: si a una pagina
   * se le cae el metodo en un refactor nada explota, simplemente sus numeros
   * dejan de animarse. Por eso se verifica que las siete lo tengan.
   */
  const conNumeros: [string, Type<unknown>, Record<string, string>][] = [
    ['TablaPage', TablaPage, {}],
    ['FechasPage', FechasPage, {}],
    ['FechaDetallePage', FechaDetallePage, { id: '9' }],
    ['JugadoresPage', JugadoresPage, {}],
    ['JugadorPage', JugadorPage, { nombre: 'Lucio' }],
    ['CompararPage', CompararPage, { a: 'Lucio', b: 'Adri R' }],
    ['DatosPage', DatosPage, {}],
  ];

  for (const [nombre, pagina, params] of conNumeros) {
    it(`${nombre} reinicia los contadores al entrar en vista`, () => {
      const fixture = montar(pagina, params);
      const instancia = fixture.componentInstance as { ionViewWillEnter?: () => void };

      expect(typeof instancia.ionViewWillEnter)
        .withContext(`${nombre} no declara ionViewWillEnter`)
        .toBe('function');

      // Es la misma instancia raiz que inyecto la pagina al construirse.
      const espia = spyOn(TestBed.inject(ContadorService), 'reiniciar');
      instancia.ionViewWillEnter!();

      expect(espia).withContext(`${nombre} no larga la animacion`).toHaveBeenCalled();
    });
  }
});
