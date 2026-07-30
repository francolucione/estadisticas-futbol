import { Component, input } from '@angular/core';

/**
 * El logotipo.
 *
 * Mayusculas con tracking cerrado, pintado con la rampa de luz, y un destello
 * que lo barre una vez al cargar. Los dos chevrones a la izquierda son la
 * marca de velocidad; van en cian pleno para que no se pierdan cuando el
 * degradado del texto llega a blanco.
 */
@Component({
  selector: 'app-marca',
  standalone: true,
  template: `
    <span class="marca destello" [class.grande]="grande()">
      <svg class="chevrones" viewBox="0 0 22 16" aria-hidden="true" focusable="false">
        <path d="M2 2 L9 8 L2 14" />
        <path d="M11 2 L18 8 L11 14" />
      </svg>
      <span class="texto luz-texto">Gallo League</span>
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }

      .marca {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        /* El destello necesita una caja propia para barrer solo el logotipo. */
        padding: 2px 4px;
        border-radius: 4px;
        --destello-espera: 320ms;
      }

      .texto {
        font-size: 1.05rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        line-height: 1;
        white-space: nowrap;
      }

      .grande .texto {
        font-size: 1.5rem;
      }

      .chevrones {
        width: 15px;
        height: 11px;
        flex: none;
        fill: none;
        stroke: var(--luz-0);
        stroke-width: 2.6;
        stroke-linecap: round;
        stroke-linejoin: round;
        filter: drop-shadow(0 0 5px rgba(34, 211, 238, 0.55));
      }

      .grande .chevrones {
        width: 20px;
        height: 15px;
      }
    `,
  ],
})
export class MarcaComponent {
  readonly grande = input(false);
}
