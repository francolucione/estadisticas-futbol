import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ContadorDirective } from './contador.directive';
import { SubrayadoDirective } from './subrayado.directive';

/** Fuerza la respuesta de prefers-reduced-motion para la prueba. */
function fingirReducirMovimiento(activo: boolean): void {
  spyOn(window, 'matchMedia').and.returnValue({
    matches: activo,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as MediaQueryList);
}

/**
 * Espera a que el conteo termine.
 *
 * Se usa una espera fija mayor que la duracion de la animacion (520ms) en vez
 * de muestrear hasta que el texto se repita: sobre el final de la curva
 * expo-out dos muestras seguidas redondean al mismo entero y el muestreo
 * cortaria un paso antes del valor real.
 */
async function esperarFin(el: HTMLElement): Promise<string> {
  await new Promise((r) => setTimeout(r, 800));
  return el.textContent ?? '';
}

@Component({
  standalone: true,
  imports: [ContadorDirective],
  template: `
    <span
      id="n"
      [appContador]="valor()"
      [contadorDecimales]="decimales()"
      [contadorFactor]="factor()"
      [contadorSufijo]="sufijo()"
      [contadorPrefijo]="prefijo()"
    ></span>
  `,
})
class AnfitrionContador {
  readonly valor = signal(0);
  readonly decimales = signal(0);
  readonly factor = signal(1);
  readonly sufijo = signal('');
  readonly prefijo = signal('');
}

@Component({
  standalone: true,
  imports: [SubrayadoDirective],
  template: `
    <nav class="segmento" appSubrayado>
      @for (o of opciones; track o) {
        <button [class.activo]="activo() === o" (click)="activo.set(o)">{{ o }}</button>
      }
    </nav>
  `,
  styles: [
    `
      nav {
        display: flex;
        width: 300px;
      }
      button {
        width: 100px;
        border: 0;
        padding: 0;
      }
    `,
  ],
})
class AnfitrionSubrayado {
  readonly opciones = ['uno', 'dos', 'tres'];
  readonly activo = signal('uno');
}

describe('ContadorDirective', () => {
  let fixture: ComponentFixture<AnfitrionContador>;
  let span: HTMLElement;

  function montar(): void {
    fixture = TestBed.createComponent(AnfitrionContador);
    span = fixture.nativeElement.querySelector('#n');
  }

  afterEach(() => TestBed.resetTestingModule());

  it('con menos movimiento salta directo al valor final', () => {
    fingirReducirMovimiento(true);
    montar();
    fixture.componentInstance.valor.set(87);
    fixture.detectChanges();

    // Sin esperar un solo frame ya tiene que estar el numero exacto.
    expect(span.textContent).toBe('87');
  });

  it('anima hasta el valor exacto', async () => {
    fingirReducirMovimiento(false);
    montar();
    fixture.componentInstance.valor.set(120);
    fixture.detectChanges();

    // La curva expo-out nunca llega sola: el ultimo paso fija el valor.
    expect(await esperarFin(span)).toBe('120');
  });

  it('respeta decimales, factor, prefijo y sufijo', () => {
    fingirReducirMovimiento(true);
    montar();
    const c = fixture.componentInstance;
    c.valor.set(0.596);
    c.factor.set(100);
    c.decimales.set(1);
    c.sufijo.set('%');
    fixture.detectChanges();

    expect(span.textContent).toBe('59.6%');

    c.valor.set(39);
    c.factor.set(1);
    c.decimales.set(0);
    c.sufijo.set('');
    c.prefijo.set('+');
    fixture.detectChanges();

    expect(span.textContent).toBe('+39');
  });

  it('llega al valor correcto aunque requestAnimationFrame nunca dispare', async () => {
    fingirReducirMovimiento(false);
    // Simula la pestana en segundo plano o el WebView estrangulando los
    // frames: sin la red de seguridad el numero quedaria congelado en un
    // valor intermedio, que en una app de estadisticas es un dato falso.
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);

    montar();
    fixture.componentInstance.valor.set(857);
    fixture.detectChanges();

    expect(await esperarFin(span)).toBe('857');
  });

  it('vuelve a contar cuando el dato cambia', async () => {
    fingirReducirMovimiento(false);
    montar();
    fixture.componentInstance.valor.set(10);
    fixture.detectChanges();
    expect(await esperarFin(span)).toBe('10');

    // Es el caso de corregir un gol en el admin: el numero se mueve solo.
    fixture.componentInstance.valor.set(25);
    fixture.detectChanges();
    expect(await esperarFin(span)).toBe('25');
  });
});

describe('SubrayadoDirective', () => {
  let fixture: ComponentFixture<AnfitrionSubrayado>;
  let nav: HTMLElement;
  let directiva: SubrayadoDirective;

  beforeEach(() => {
    fixture = TestBed.createComponent(AnfitrionSubrayado);
    fixture.detectChanges();
    nav = fixture.nativeElement.querySelector('nav');
    directiva = fixture.debugElement
      .query(By.directive(SubrayadoDirective))
      .injector.get(SubrayadoDirective);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('mide el boton activo al iniciar', () => {
    const primero = nav.querySelectorAll('button')[0] as HTMLElement;
    expect(nav.style.getPropertyValue('--w')).toBe(`${primero.offsetWidth}px`);
    expect(nav.style.getPropertyValue('--x')).toBe(`${primero.offsetLeft}px`);
  });

  it('sigue al boton activo cuando cambia', () => {
    const tercero = nav.querySelectorAll('button')[2] as HTMLElement;
    fixture.componentInstance.activo.set('tres');
    fixture.detectChanges();

    // Se fuerza la medicion en vez de esperar al MutationObserver, que es
    // asincronico y haria la prueba dependiente del timing.
    directiva.medir();

    expect(nav.style.getPropertyValue('--x')).toBe(`${tercero.offsetLeft}px`);
    expect(nav.style.getPropertyValue('--w')).toBe(`${tercero.offsetWidth}px`);
    expect(tercero.offsetLeft).toBeGreaterThan(0);
  });

  it('esconde el indicador si no hay ninguno activo', () => {
    fixture.componentInstance.activo.set('ninguno');
    fixture.detectChanges();
    directiva.medir();

    expect(nav.style.getPropertyValue('--w')).toBe('0px');
  });
});
