import {
  Directive,
  ElementRef,
  booleanAttribute,
  effect,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import { ContadorService } from './contador.service';

/**
 * Un numero que sube desde cero hasta su valor cada vez que se entra a la
 * pantalla.
 *
 * Se adueña del contenido del elemento, asi que va sobre un nodo propio y
 * vacio. Si la celda lleva algo mas al lado —un promedio entre parentesis,
 * por ejemplo— eso queda en un hermano y no se anima.
 */
@Directive({
  selector: '[appContador]',
  standalone: true,
})
export class ContadorDirective {
  readonly contador = input.required<number>({ alias: 'appContador' });
  readonly decimales = input(0, { transform: numberAttribute });
  /** Antepone "+" a los positivos, como en la diferencia de gol. */
  readonly signo = input(false, { transform: booleanAttribute });
  /** Se pega al final sin animarse, para el "%". */
  readonly sufijo = input('');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly reloj = inject(ContadorService);

  private ultimo: string | null = null;

  constructor() {
    effect(() => {
      const texto = this.formatear(this.contador() * this.reloj.progreso());
      // Solo se toca el DOM si el texto cambio. Como los valores son chicos,
      // la mayoria de las celdas terminan escribiendo unas pocas veces en vez
      // de sesenta por segundo.
      if (texto !== this.ultimo) {
        this.ultimo = texto;
        this.host.nativeElement.textContent = texto;
      }
    });
  }

  private formatear(valor: number): string {
    const crudo = valor.toFixed(this.decimales());
    // Al arrancar, un -14 pasa por -0.14 y toFixed lo deja en "-0". Feo, y
    // ademas hace bailar el ancho de la celda.
    const cifra = Number(crudo) === 0 ? (0).toFixed(this.decimales()) : crudo;
    const mas = this.signo() && Number(cifra) > 0 ? '+' : '';
    return `${mas}${cifra}${this.sufijo()}`;
  }
}
