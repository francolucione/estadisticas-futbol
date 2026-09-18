import { Component, ElementRef, computed, inject, input, output } from '@angular/core';
import { Categoria, Evento } from '../../core/models/var.model';
import { carriles, fraseDe, hms } from '../../core/services/var.engine';

/**
 * La tira debajo del video: un marcador emoji por evento, en su segundo, y la aguja
 * que sigue a la reproduccion. Tocar un marcador (o la tira) lleva el video ahi.
 */
@Component({
  selector: 'app-linea-tiempo',
  standalone: true,
  template: `
    <div
      class="pista"
      [style.height.px]="alto()"
      (click)="tocarPista($event)"
      role="slider"
      tabindex="-1"
      aria-label="Línea de tiempo del video"
      [attr.aria-valuemin]="0"
      [attr.aria-valuemax]="duracion()"
      [attr.aria-valuenow]="t()"
      [attr.aria-valuetext]="hms(t())"
    >
      @for (m of minutos(); track m) {
        <span class="marca-min" [style.left.%]="(m * 60 * 100) / duracion()">
          <span class="rotulo-min">{{ m }}'</span>
        </span>
      }
      <span class="avance" [style.width.%]="porcentaje(t())"></span>
      @for (m of marcadores(); track m.evento.id) {
        <button
          type="button"
          class="marcador"
          [class.recien]="m.evento.id === resaltado()"
          [style.left.%]="porcentaje(m.evento.t)"
          [style.bottom.px]="6 + m.carril * 22"
          [attr.aria-label]="hms(m.evento.t) + ' ' + frase(m.evento)"
          [title]="hms(m.evento.t) + ' · ' + frase(m.evento)"
          (click)="$event.stopPropagation(); ir.emit(m.evento.t)"
        >
          {{ categoria(m.evento)?.emoji ?? '•' }}
        </button>
      }
      <span class="aguja" [style.left.%]="porcentaje(t())"></span>
    </div>
  `,
  styleUrl: './linea-tiempo.component.scss',
})
export class LineaTiempoComponent {
  readonly eventos = input.required<Evento[]>();
  readonly categorias = input.required<Map<string, Categoria>>();
  readonly duracion = input.required<number>();
  readonly t = input(0);
  /** El ultimo anotado, que late un momento para que se vea donde cayo. */
  readonly resaltado = input<string | null>(null);
  readonly ir = output<number>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly hms = hms;

  /**
   * Dos marcadores a menos de ~2% del video se apilan: en un video de una hora son 70
   * segundos, que en un telefono es el ancho de un emoji.
   */
  readonly marcadores = computed(() => carriles(this.eventos(), Math.max(20, this.duracion() * 0.02)));

  readonly alto = computed(() => {
    const max = this.marcadores().reduce((m, x) => Math.max(m, x.carril), 0);
    return 44 + Math.min(max, 5) * 22;
  });

  /** Una marca cada 10 minutos. */
  readonly minutos = computed(() => {
    const out: number[] = [];
    for (let m = 10; m * 60 < this.duracion(); m += 10) out.push(m);
    return out;
  });

  porcentaje(t: number): number {
    const d = this.duracion();
    return d > 0 ? Math.min(100, Math.max(0, (t / d) * 100)) : 0;
  }

  categoria(e: Evento): Categoria | undefined {
    return this.categorias().get(e.categoriaId);
  }

  frase(e: Evento): string {
    return fraseDe(this.categoria(e), e);
  }

  /** Posicion en pantalla del segundo `t`, para que el emoji vuele hasta ahi. */
  puntoDe(t: number): { x: number; y: number } {
    const r = this.host.nativeElement.getBoundingClientRect();
    return { x: r.left + (r.width * this.porcentaje(t)) / 100, y: r.bottom - 16 };
  }

  tocarPista(e: MouseEvent): void {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.ir.emit(((e.clientX - r.left) / r.width) * this.duracion());
  }
}
