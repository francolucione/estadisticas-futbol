import { Component, input, numberAttribute } from '@angular/core';

/**
 * El escudo del club: el gallo del canal en un disco blanco con filo hueso. Lo genera
 * `scripts/escudo.py` desde `resources/gallo.jpg`; aca solo se elige el tamano.
 */
@Component({
  selector: 'app-escudo',
  standalone: true,
  template: `<img
    [src]="tam() > 48 ? 'assets/marca/escudo-192.png' : 'assets/marca/escudo-96.png'"
    [width]="tam()"
    [height]="tam()"
    [attr.alt]="decorativo() ? '' : 'Gallo League'"
    decoding="async"
  />`,
  styles: [
    `
      :host {
        display: inline-flex;
        flex: none;
      }
      img {
        display: block;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      }
    `,
  ],
})
export class EscudoComponent {
  readonly tam = input(32, { transform: numberAttribute });
  /** Al lado de un texto que ya dice "Gallo League", el escudo no se lee dos veces. */
  readonly decorativo = input(false);
}
