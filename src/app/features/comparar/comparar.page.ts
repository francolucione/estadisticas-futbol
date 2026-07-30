import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { StatsJugador } from '../../core/models/stats.model';
import { StatsService } from '../../core/services/stats.service';
import { METRICAS_COMPARACION } from '../../core/services/comparacion.engine';
import { iniciales } from '../../shared/formato';
import { ContadorDirective } from '../../shared/contador.directive';
import { ContadorService } from '../../shared/contador.service';

@Component({
  selector: 'app-comparar',
  standalone: true,
  imports: [
    RouterLink,
    ContadorDirective,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
  ],
  templateUrl: './comparar.page.html',
  styleUrl: './comparar.page.scss',
})
export class CompararPage {
  private readonly route = inject(ActivatedRoute);
  private readonly statsSvc = inject(StatsService);
  private readonly contadores = inject(ContadorService);

  ionViewWillEnter(): void {
    this.contadores.reiniciar();
  }

  readonly metricas = METRICAS_COMPARACION;
  iniciales = iniciales;

  private readonly params = toSignal(
    this.route.paramMap.pipe(map((p) => ({ a: p.get('a') ?? '', b: p.get('b') ?? '' }))),
    { initialValue: { a: '', b: '' } }
  );

  readonly nombreA = computed(() => this.params().a);
  readonly nombreB = computed(() => this.params().b);

  readonly comparacion = computed(() => {
    const { a, b } = this.params();
    return b ? this.statsSvc.comparar(a, b) : null;
  });

  /** Candidatos a comparar: los habituales, menos el ya elegido. */
  readonly candidatos = computed(() =>
    this.statsSvc.habituales().filter((s) => s.nombre !== this.nombreA())
  );

  /**
   * Las filas de la comparacion, con quien gana cada una ya resuelto.
   *
   * Los valores van crudos y con las pistas de formato al lado, no ya
   * convertidos a texto: el contador necesita el numero para poder subirlo.
   */
  readonly filas = computed(() => {
    const c = this.comparacion();
    if (!c) return [];
    return this.metricas.map((m) => {
      const va = c.a[m.clave] as number;
      const vb = c.b[m.clave] as number;
      const iguales = Math.abs(va - vb) < 1e-9;
      const pinta = comoSeMuestra(m.formato);
      return {
        etiqueta: m.etiqueta,
        a: va * pinta.factor,
        b: vb * pinta.factor,
        decimales: pinta.decimales,
        sufijo: pinta.sufijo,
        ganaA: !iguales && (m.mayorEsMejor ? va > vb : va < vb),
        ganaB: !iguales && (m.mayorEsMejor ? vb > va : vb < va),
        pesoA: reparto(va, vb),
      };
    });
  });

  /** Cuantas metricas gana cada uno, para el resumen de arriba. */
  readonly marcadorMetricas = computed(() => {
    const f = this.filas();
    return { a: f.filter((x) => x.ganaA).length, b: f.filter((x) => x.ganaB).length };
  });

  jugadorA(): StatsJugador | undefined {
    return this.statsSvc.buscar(this.nombreA());
  }
}

/**
 * Traduce el formato declarado por la metrica a lo que necesita el contador.
 * Tiene que dar lo mismo que formatearValor(), que es como se venia mostrando.
 */
function comoSeMuestra(formato: (typeof METRICAS_COMPARACION)[number]['formato']): {
  factor: number;
  decimales: number;
  sufijo: string;
} {
  switch (formato) {
    case 'porcentaje':
      return { factor: 100, decimales: 1, sufijo: '%' };
    case 'decimal':
      return { factor: 1, decimales: 2, sufijo: '' };
    default:
      return { factor: 1, decimales: 0, sufijo: '' };
  }
}

/**
 * Que porcentaje de la barra se lleva el primero.
 *
 * La diferencia de gol puede ser negativa, y ahi una proporcion directa se
 * rompe: 39 contra -10 daria 134%. Se corren los dos valores hasta que el
 * menor quede en cero, y recien ahi se reparte.
 */
function reparto(a: number, b: number): number {
  const piso = Math.min(a, b, 0);
  const da = a - piso;
  const db = b - piso;
  const total = da + db;
  if (total <= 0) return 50;
  return Math.min(100, Math.max(0, (da / total) * 100));
}
