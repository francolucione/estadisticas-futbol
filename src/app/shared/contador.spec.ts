import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContadorDirective } from './contador.directive';
import { ContadorService, curva } from './contador.service';

/**
 * Reloj de mentira: deja mover el avance a mano, sin depender de los frames
 * reales ni de si el navegador de los tests pide movimiento reducido.
 */
class RelojFalso {
  readonly avance = signal(1);
  readonly progreso = this.avance.asReadonly();
  reiniciar(): void {
    this.avance.set(0);
  }
}

@Component({
  standalone: true,
  imports: [ContadorDirective],
  template: `<span
    [appContador]="valor()"
    [decimales]="decimales()"
    [signo]="signo()"
    [sufijo]="sufijo()"
  ></span>`,
})
class HostComponent {
  readonly valor = signal(0);
  readonly decimales = signal(0);
  readonly signo = signal(false);
  readonly sufijo = signal('');
}

describe('curva de la animacion', () => {
  it('empieza en cero y termina en uno exacto', () => {
    expect(curva(0)).toBe(0);
    expect(curva(1)).toBe(1);
    // Por las dudas de un frame que llegue tarde.
    expect(curva(1.4)).toBe(1);
  });

  it('sube siempre, sin retrocesos', () => {
    let anterior = -1;
    for (let t = 0; t <= 1; t += 0.05) {
      const v = curva(t);
      expect(v).toBeGreaterThanOrEqual(anterior);
      anterior = v;
    }
  });

  it('arranca rapido y llega frenando', () => {
    // A un tercio del tiempo ya recorrio mas de dos tercios del camino: eso es
    // el envion inicial. Y lo que queda se estira hasta el final.
    expect(curva(0.33)).toBeGreaterThan(0.66);
    expect(curva(0.8)).toBeLessThan(1);
  });
});

describe('ContadorDirective', () => {
  let reloj: RelojFalso;
  let fixture: ComponentFixture<HostComponent>;

  const texto = () => fixture.nativeElement.querySelector('span').textContent;

  beforeEach(() => {
    reloj = new RelojFalso();
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: ContadorService, useValue: reloj }],
    });
    fixture = TestBed.createComponent(HostComponent);
  });

  it('muestra el valor final cuando la animacion termino', () => {
    fixture.componentInstance.valor.set(103);
    fixture.detectChanges();
    expect(texto()).toBe('103');
  });

  it('arranca en cero al reiniciar', () => {
    fixture.componentInstance.valor.set(103);
    fixture.detectChanges();

    reloj.reiniciar();
    fixture.detectChanges();
    expect(texto()).toBe('0');
  });

  it('pasa por valores intermedios', () => {
    fixture.componentInstance.valor.set(100);
    reloj.avance.set(0.4);
    fixture.detectChanges();
    expect(texto()).toBe('40');
  });

  it('respeta los decimales pedidos', () => {
    fixture.componentInstance.valor.set(2.06);
    fixture.componentInstance.decimales.set(2);
    fixture.detectChanges();
    expect(texto()).toBe('2.06');
  });

  it('pone el mas solo en los positivos', () => {
    fixture.componentInstance.signo.set(true);

    fixture.componentInstance.valor.set(39);
    fixture.detectChanges();
    expect(texto()).toBe('+39');

    fixture.componentInstance.valor.set(-14);
    fixture.detectChanges();
    expect(texto()).toBe('-14');

    fixture.componentInstance.valor.set(0);
    fixture.detectChanges();
    expect(texto()).toBe('0');
  });

  it('no muestra "-0" mientras un negativo esta arrancando', () => {
    fixture.componentInstance.valor.set(-14);
    fixture.componentInstance.signo.set(true);
    // -14 * 0.01 = -0.14, que redondeado daria "-0".
    reloj.avance.set(0.01);
    fixture.detectChanges();
    expect(texto()).toBe('0');
  });

  it('pega el sufijo sin animarlo', () => {
    fixture.componentInstance.valor.set(61);
    fixture.componentInstance.sufijo.set('%');
    reloj.avance.set(0.5);
    fixture.detectChanges();
    expect(texto()).toBe('31%');
  });

  it('sigue al valor si cambia despues de dibujado', () => {
    fixture.componentInstance.valor.set(10);
    fixture.detectChanges();
    expect(texto()).toBe('10');

    fixture.componentInstance.valor.set(25);
    fixture.detectChanges();
    expect(texto()).toBe('25');
  });
});

describe('ContadorService', () => {
  it('arranca en uno, para que una pagina sin animacion muestre los datos', () => {
    const svc = TestBed.inject(ContadorService);
    expect(svc.progreso()).toBe(1);
  });

  it('termina siempre en uno exacto', (done) => {
    const svc = TestBed.inject(ContadorService);
    svc.reiniciar();

    // Con movimiento reducido llega a 1 de una; si no, cuando corre la curva.
    const esperar = () => {
      if (svc.progreso() === 1) {
        done();
        return;
      }
      setTimeout(esperar, 50);
    };
    esperar();
  });
});
