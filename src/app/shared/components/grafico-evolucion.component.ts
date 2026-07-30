import { Component, computed, input, signal } from '@angular/core';
import { PartidoDeJugador } from '../../core/models/stats.model';

interface Punto {
  i: number;
  partidoId: number;
  influencias: number;
  mediaMovil: number;
  goles: number;
  asistencias: number;
  resultado: string;
  x: number;
  ancho: number;
  y: number;
  alto: number;
  yMedia: number;
}

const W = 360;
const H = 150;
const M = { arriba: 12, abajo: 22, izq: 24, der: 10 };

/**
 * Influencias por fecha, con la media movil encima.
 *
 * Una sola serie de barras (el sujeto del titulo) mas una linea de tinta
 * rotulada directamente: no hace falta leyenda ni distinguir por color.
 */
@Component({
  selector: 'app-grafico-evolucion',
  standalone: true,
  template: `
    <figure class="grafico">
      <figcaption>
        Influencias por fecha
        <span class="pista">media de 5</span>
      </figcaption>

      <svg
        [attr.viewBox]="'0 0 ' + W + ' ' + H"
        role="img"
        [attr.aria-label]="resumenAccesible()"
        (pointerleave)="activo.set(null)"
      >
        <!-- grilla -->
        @for (t of ticks(); track t.valor) {
          <line class="grid" [attr.x1]="M.izq" [attr.x2]="W - M.der" [attr.y1]="t.y" [attr.y2]="t.y" />
          <text class="tick" [attr.x]="M.izq - 6" [attr.y]="t.y + 3">{{ t.valor }}</text>
        }

        <!-- barras -->
        @for (p of puntos(); track p.partidoId) {
          <rect
            class="barra"
            [class.activa]="activo() === p.i"
            [attr.x]="p.x"
            [attr.y]="p.y"
            [attr.width]="p.ancho"
            [attr.height]="p.alto"
            [attr.rx]="radio(p.ancho)"
            (pointerenter)="activo.set(p.i)"
            (click)="activo.set(p.i)"
          />
        }

        <!-- media movil -->
        <path class="media" [attr.d]="lineaMedia()" vector-effect="non-scaling-stroke" />

        <!-- eje -->
        <line class="eje" [attr.x1]="M.izq" [attr.x2]="W - M.der" [attr.y1]="H - M.abajo" [attr.y2]="H - M.abajo" />
        @if (extremos(); as e) {
          <text class="tick" [attr.x]="M.izq" [attr.y]="H - 8">F{{ e.primero }}</text>
          <text class="tick fin" [attr.x]="W - M.der" [attr.y]="H - 8">F{{ e.ultimo }}</text>
        }
      </svg>

      @if (seleccionado(); as p) {
        <p class="tooltip">
          <strong>Fecha {{ p.partidoId }}</strong>
          &middot; {{ p.goles }} G &middot; {{ p.asistencias }} A
          &middot; {{ p.influencias }} influencias &middot; {{ p.resultado }}
        </p>
      } @else {
        <p class="tooltip vacio">Toca una barra para ver el detalle</p>
      }
    </figure>
  `,
  styleUrl: './grafico-evolucion.component.scss',
})
export class GraficoEvolucionComponent {
  readonly historial = input.required<PartidoDeJugador[]>();
  readonly medias = input.required<number[]>();

  readonly W = W;
  readonly H = H;
  readonly M = M;

  readonly activo = signal<number | null>(null);

  private readonly maximo = computed(() =>
    Math.max(1, ...this.historial().map((h) => h.influencias))
  );

  private readonly escalaY = computed(() => {
    const util = H - M.arriba - M.abajo;
    return (valor: number) => H - M.abajo - (valor / this.maximo()) * util;
  });

  readonly puntos = computed<Punto[]>(() => {
    const hist = this.historial();
    const medias = this.medias();
    const util = W - M.izq - M.der;
    const paso = util / Math.max(1, hist.length);
    const y = this.escalaY();

    return hist.map((h, i) => {
      const alto = H - M.abajo - y(h.influencias);
      return {
        i,
        partidoId: h.partidoId,
        influencias: h.influencias,
        mediaMovil: medias[i] ?? 0,
        goles: h.goles,
        asistencias: h.asistencias,
        resultado: h.resultado === 'V' ? 'Ganado' : h.resultado === 'E' ? 'Empatado' : 'Perdido',
        // 2px de aire entre barras, como pide la guia de marcas.
        x: M.izq + i * paso + 1,
        ancho: Math.max(1, paso - 2),
        y: y(h.influencias),
        alto: Math.max(alto, h.influencias > 0 ? 2 : 0),
        yMedia: y(medias[i] ?? 0),
      };
    });
  });

  readonly lineaMedia = computed(() => {
    const ps = this.puntos();
    if (!ps.length) return '';
    return ps
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${(p.x + p.ancho / 2).toFixed(1)},${p.yMedia.toFixed(1)}`)
      .join(' ');
  });

  readonly ticks = computed(() => {
    const max = this.maximo();
    const y = this.escalaY();
    const paso = max <= 4 ? 1 : Math.ceil(max / 4);
    const salida: { valor: number; y: number }[] = [];
    for (let v = 0; v <= max; v += paso) salida.push({ valor: v, y: y(v) });
    return salida;
  });

  readonly extremos = computed(() => {
    const ps = this.puntos();
    return ps.length ? { primero: ps[0].partidoId, ultimo: ps[ps.length - 1].partidoId } : null;
  });

  readonly seleccionado = computed(() => {
    const i = this.activo();
    return i === null ? null : this.puntos()[i] ?? null;
  });

  readonly resumenAccesible = computed(() => {
    const ps = this.puntos();
    const total = ps.reduce((a, p) => a + p.influencias, 0);
    return `Influencias por fecha en ${ps.length} partidos, ${total} en total, maximo ${this.maximo()}.`;
  });

  radio(ancho: number): number {
    return Math.min(4, ancho / 2);
  }
}
