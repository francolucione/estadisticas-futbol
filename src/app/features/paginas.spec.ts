import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { of } from 'rxjs';
import { RankingPage } from './ranking/ranking.page';
import { JugadoresPage } from './jugadores/jugadores.page';
import { JugadorPage } from './jugador/jugador.page';
import { LigaPage } from './liga/liga.page';

/**
 * Estas pruebas montan cada pantalla con los datos reales. No revisan
 * estetica: revisan que las plantillas no revienten al renderizar, que es
 * donde la version anterior fallaba en silencio.
 */
function montar<T>(componente: Type<T>, nombre?: string): ComponentFixture<T> {
  TestBed.configureTestingModule({
    imports: [componente],
    providers: [
      provideIonicAngular(),
      provideRouter([]),
      ...(nombre
        ? [
            {
              provide: ActivatedRoute,
              useValue: { paramMap: of(convertToParamMap({ nombre })) },
            },
          ]
        : []),
    ],
  });

  const fixture = TestBed.createComponent(componente);
  fixture.detectChanges();
  return fixture;
}

afterEach(() => TestBed.resetTestingModule());

describe('RankingPage', () => {
  it('lista a los jugadores habituales ordenados por goles', () => {
    const fixture = montar(RankingPage);
    const filas = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(filas.length).toBeGreaterThan(0);
    expect(fixture.componentInstance.filas()[0].nombre).toBe('Guido');
  });

  it('el filtro de +10 partidos realmente filtra', () => {
    const fixture = montar(RankingPage);
    const conFiltro = fixture.componentInstance.filas().length;

    fixture.componentInstance.soloHabituales.set(false);
    fixture.detectChanges();
    const sinFiltro = fixture.componentInstance.filas().length;

    // El bug original: al alternar el filtro, nunca se aplicaba.
    expect(sinFiltro).toBeGreaterThan(conFiltro);
    expect(fixture.componentInstance.filas().every((j) => j.PJ >= 1)).toBeTrue();
  });

  it('cambiar de familia cambia la metrica activa', () => {
    const fixture = montar(RankingPage);
    fixture.componentInstance.cambiarFamilia('resultados');
    fixture.detectChanges();
    expect(fixture.componentInstance.metrica().familia).toBe('resultados');
  });

  it('ordena GC de menor a mayor, porque conviene tener pocos', () => {
    const fixture = montar(RankingPage);
    fixture.componentInstance.clave.set('GC');
    fixture.detectChanges();
    const filas = fixture.componentInstance.filas();
    expect(filas[0].GC).toBeLessThanOrEqual(filas[filas.length - 1].GC);
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
    const fixture = montar(JugadorPage, 'Lucio');
    const perfil = fixture.componentInstance.perfil()!;
    expect(perfil.stats.nombre).toBe('Lucio');
    expect(perfil.companeros.length).toBeGreaterThan(0);
    expect(perfil.rivales.length).toBeGreaterThan(0);
    expect(perfil.ultimos5.length).toBe(5);
    expect(fixture.nativeElement.querySelector('app-grafico-evolucion')).toBeTruthy();
  });

  it('no se rompe con un jugador de un solo partido', () => {
    const fixture = montar(JugadorPage, 'Invita2 A');
    const perfil = fixture.componentInstance.perfil()!;
    expect(perfil.stats.PJ).toBe(1);
    // Con un unico partido no hay grafico de evolucion que dibujar.
    expect(fixture.nativeElement.querySelector('app-grafico-evolucion')).toBeNull();
  });

  it('avisa cuando el nombre no existe', () => {
    const fixture = montar(JugadorPage, 'Maradona');
    expect(fixture.componentInstance.perfil()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No hay ningun jugador');
  });
});

describe('LigaPage', () => {
  it('muestra el reparto de resultados y los MVP', () => {
    const fixture = montar(LigaPage);
    const reparto = fixture.componentInstance.reparto();
    expect(reparto.length).toBe(3);
    expect(reparto.reduce((a, t) => a + t.valor, 0)).toBe(47);
    expect(fixture.componentInstance.mvpRanking().length).toBeGreaterThan(0);
  });

  it('expone el aviso de la fecha 9', () => {
    const fixture = montar(LigaPage);
    expect(fixture.componentInstance.avisos().length).toBe(1);
  });
});
