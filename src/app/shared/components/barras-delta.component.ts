import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatsPar } from '../../core/models/stats.model';
import { formatearDelta } from '../formato';

interface Fila extends StatsPar {
  /** Ancho de la barra en % del semieje. */
  ancho: number;
  positivo: boolean;
}

/**
 * Escala divergente: cuanto le rinde al jugador cada companero o rival,
 * comparado con el resto de sus partidos. El cero es el centro.
 *
 * Cada fila lleva su valor escrito al lado, asi que el color nunca es el
 * unico canal que transmite el signo.
 */
@Component({
  selector: 'app-barras-delta',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (!filas().length) {
      <p class="vacio">
        Nadie llega a {{ minimo() }} partidos compartidos todavia.
      </p>
    } @else {
      <ul class="lista">
        @for (f of filas(); track f.nombre) {
          <li>
            <a class="nombre" [routerLink]="[enlaceBase(), f.nombre]">{{ f.nombre }}</a>
            <div class="pista">
              <span class="cero"></span>
              <span
                class="barra"
                [class.pos]="f.positivo"
                [style.width.%]="f.ancho / 2"
                [style.left.%]="f.positivo ? 50 : 50 - f.ancho / 2"
              ></span>
            </div>
            <span class="delta" [class.pos]="f.positivo">{{ fmt(f.delta) }}</span>
            <span class="detalle">
              {{ (f.winRate * 100).toFixed(0) }}% en {{ f.PJ }} PJ
              <span class="base">(su media: {{ (f.winRateSin * 100).toFixed(0) }}%)</span>
            </span>
          </li>
        }
      </ul>
    }
  `,
  styleUrl: './barras-delta.component.scss',
})
export class BarrasDeltaComponent {
  readonly pares = input.required<StatsPar[]>();
  readonly minimo = input(5);
  /**
   * Prefijo absoluto de los enlaces. Lo pasa la pagina, porque la ficha vive
   * bajo dos tabs distintos y un enlace relativo resolveria mal en uno u otro.
   */
  readonly enlaceBase = input('/tabs/jugadores/jugador');
  /** Cuantas filas mostrar. */
  readonly tope = input(5);
  /** 'mejores' ordena por delta descendente; 'peores', ascendente. */
  readonly orden = input<'mejores' | 'peores'>('mejores');

  readonly filas = computed<Fila[]>(() => {
    const elegibles = this.pares().filter((p) => p.PJ >= this.minimo());
    if (!elegibles.length) return [];

    const ordenados = [...elegibles].sort((a, b) =>
      this.orden() === 'mejores' ? b.delta - a.delta : a.delta - b.delta
    );
    const recorte = ordenados.slice(0, this.tope());

    // La escala se fija con todos los elegibles, no solo con los mostrados,
    // para que "mejores" y "peores" sean comparables entre si.
    const max = Math.max(...elegibles.map((p) => Math.abs(p.delta))) || 1;

    return recorte.map((p) => ({
      ...p,
      ancho: (Math.abs(p.delta) / max) * 100,
      positivo: p.delta >= 0,
    }));
  });

  fmt = formatearDelta;
}
