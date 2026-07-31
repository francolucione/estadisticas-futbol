import {
  Directive,
  ElementRef,
  booleanAttribute,
  effect,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import { ContadorService, GRUPO_PAGINA } from './contador.service';

/** Cambia cada digito por otro al azar y deja quieto todo lo demas. */
export function revolver(texto: string): string {
  // Solo los digitos. El punto decimal, el signo y el sufijo se quedan donde estan,
  // asi el texto conserva el largo exacto que va a tener al final y la celda no salta.
  return texto.replace(/[0-9]/g, () => String(Math.floor(Math.random() * 10)));
}

/**
 * Un numero que sube desde cero hasta su valor cada vez que se entra a la pantalla.
 *
 * Arranca revolviendo digitos al azar —ilegible a proposito, es el efecto de caja
 * registradora— y recien despues sube frenando hasta el valor real. El valor de verdad
 * nunca cambia: esto es puro dibujo.
 *
 * Se adueña del contenido del elemento, asi que va sobre un nodo propio y vacio. Si la
 * celda lleva algo mas al lado —un parentesis, una unidad— eso queda en un hermano.
 */
@Directive({
  selector: '[appContador]',
  standalone: true,
  host: { class: 'contador' },
})
export class ContadorDirective {
  readonly contador = input.required<number>({ alias: 'appContador' });
  readonly decimales = input(0, { transform: numberAttribute });
  /** Antepone "+" a los positivos, como en la diferencia de gol. */
  readonly signo = input(false, { transform: booleanAttribute });
  /** Se pega al final sin animarse, para el "%" o el ".º". */
  readonly sufijo = input('');
  /**
   * Canal del reloj. Por defecto el de la pantalla, que se reinicia al entrar. Las
   * columnas de la tabla de rankings usan el suyo para poder re-animarse solas cuando
   * cambia la metrica, sin sacudir el resto.
   */
  readonly grupo = input(GRUPO_PAGINA);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly reloj = inject(ContadorService);

  private ultimo: string | null = null;

  constructor() {
    effect(() => {
      // El grupo se lee adentro del efecto: si cambiara, Angular vuelve a engancharse
      // a las senales del canal nuevo en la proxima corrida.
      const grupo = this.grupo();
      const sacudida = this.reloj.sacudidaDe(grupo)();
      const avance = this.reloj.progresoDe(grupo)();

      const texto =
        sacudida > 0
          ? // El valor final da el molde: mismo largo, mismo signo, mismo punto.
            revolver(this.formatear(this.contador()))
          : this.formatear(this.contador() * avance);

      // Solo se toca el DOM si el texto cambio. Como los valores son chicos, la mayoria
      // de las celdas terminan escribiendo unas pocas veces en vez de sesenta por
      // segundo; mientras revuelve, una vez por parpadeo.
      if (texto !== this.ultimo) {
        this.ultimo = texto;
        this.host.nativeElement.textContent = texto;
      }
    });
  }

  private formatear(valor: number): string {
    const crudo = valor.toFixed(this.decimales());
    // Al arrancar, un -14 pasa por -0.14 y toFixed lo deja en "-0". Feo, y ademas hace
    // bailar el ancho de la celda.
    const cifra = Number(crudo) === 0 ? (0).toFixed(this.decimales()) : crudo;
    const mas = this.signo() && Number(cifra) > 0 ? '+' : '';
    return `${mas}${cifra}${this.sufijo()}`;
  }
}
