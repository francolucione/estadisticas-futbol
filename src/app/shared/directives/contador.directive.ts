import { DestroyRef, Directive, ElementRef, effect, inject, input } from '@angular/core';

/** Duracion del conteo. La misma escala que --dur-lenta, un toque mas larga. */
const DURACION = 520;

/** true si el sistema pidio menos movimiento. */
export function prefiereMenosMovimiento(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

/**
 * Anima un numero desde su valor anterior hasta el nuevo.
 *
 * Se usa en los numeros protagonistas: puntos de la tabla, tiles del resumen
 * y el valor de cada curiosidad. Cuando el dato cambia (por ejemplo al
 * corregir un gol en el admin) vuelve a contar desde lo que estaba mostrando,
 * asi el cambio se ve.
 *
 * Con prefers-reduced-motion salta directo al valor final: un !important de
 * CSS no puede frenar una animacion hecha en TypeScript.
 */
@Directive({
  selector: '[appContador]',
  standalone: true,
})
export class ContadorDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly valor = input.required<number>({ alias: 'appContador' });
  readonly decimales = input(0, { alias: 'contadorDecimales' });
  readonly sufijo = input('', { alias: 'contadorSufijo' });
  readonly prefijo = input('', { alias: 'contadorPrefijo' });
  /** Multiplica antes de mostrar. Sirve para porcentajes guardados como 0..1. */
  readonly factor = input(1, { alias: 'contadorFactor' });

  /** Lo ultimo que se termino de mostrar, para arrancar el proximo conteo. */
  private mostrado = 0;
  private frame = 0;
  private red?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.frenar());

    effect(() => {
      const destino = this.valor() * this.factor();
      // Leidos aca para que el effect se re-dispare si cambia el formato.
      this.decimales();
      this.prefijo();
      this.sufijo();
      this.animar(destino);
    });
  }

  private pintar(v: number): void {
    this.el.nativeElement.textContent =
      `${this.prefijo()}${v.toFixed(this.decimales())}${this.sufijo()}`;
  }

  private frenar(): void {
    cancelAnimationFrame(this.frame);
    clearTimeout(this.red);
  }

  /** Deja el numero exacto y corta cualquier animacion en curso. */
  private aterrizar(destino: number): void {
    this.frenar();
    this.mostrado = destino;
    this.pintar(destino);
  }

  private animar(destino: number): void {
    this.frenar();

    if (prefiereMenosMovimiento()) {
      this.aterrizar(destino);
      return;
    }

    const inicio = this.mostrado;
    if (inicio === destino) {
      this.pintar(destino);
      return;
    }

    /*
     * Red de seguridad. requestAnimationFrame no corre si la pestana pasa a
     * segundo plano o si el WebView lo estrangula, y ahi el conteo quedaria
     * congelado a mitad de camino mostrando un numero que no es el dato. En
     * una app de estadisticas eso es peor que no animar: este temporizador
     * garantiza el valor correcto pase lo que pase.
     */
    this.red = setTimeout(() => this.aterrizar(destino), DURACION + 80);

    const t0 = performance.now();
    const paso = (ahora: number) => {
      const p = Math.min(1, (ahora - t0) / DURACION);
      // expo-out: la misma sensacion que --ease-salida en CSS.
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      this.pintar(inicio + (destino - inicio) * e);

      if (p < 1) this.frame = requestAnimationFrame(paso);
      // La curva nunca llega a 1 por si sola: el valor exacto lo fija
      // aterrizar(), sea por este camino o por la red de seguridad.
      else this.aterrizar(destino);
    };

    this.frame = requestAnimationFrame(paso);
  }
}
