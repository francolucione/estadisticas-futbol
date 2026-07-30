import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { ActuacionJugador, Equipo, Partido } from '../../core/models/partido.model';
import { PartidosService, marcadorDe, validar } from '../../core/services/partidos.service';

function fechaVacia(id: number): Partido {
  const fila = (equipo: Equipo): ActuacionJugador => ({
    nombre: '',
    goles: 0,
    asistencias: 0,
    equipo,
  });
  return {
    id,
    jugadores: [
      ...Array.from({ length: 5 }, () => fila('naranja')),
      ...Array.from({ length: 5 }, () => fila('azul')),
    ],
  };
}

@Component({
  selector: 'app-editar-fecha',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent],
  templateUrl: './editar-fecha.page.html',
  styleUrl: './editar-fecha.page.scss',
})
export class EditarFechaPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly partidosSvc = inject(PartidosService);

  private readonly param = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')), {
    initialValue: '',
  });

  readonly esNueva = computed(() => this.param() === 'nueva');

  readonly borrador = signal<Partido | null>(null);
  readonly nombresConocidos = this.partidosSvc.nombres;

  readonly marcador = computed(() => {
    const b = this.borrador();
    return b ? marcadorDe(b) : { naranja: 0, azul: 0 };
  });

  /** Se valida el borrador en vivo, antes de guardar nada. */
  readonly problemas = computed(() => {
    const b = this.borrador();
    if (!b) return [];
    const avisos = validar([b]);
    const sinNombre = b.jugadores.filter((j) => !j.nombre.trim()).length;
    if (sinNombre) {
      avisos.push(`Hay ${sinNombre} ${sinNombre === 1 ? 'jugador' : 'jugadores'} sin nombre.`);
    }
    const nombres = b.jugadores.map((j) => j.nombre.trim()).filter(Boolean);
    const repetidos = nombres.filter((n, i) => nombres.indexOf(n) !== i);
    for (const r of [...new Set(repetidos)]) {
      avisos.push(`"${r}" esta cargado dos veces en esta fecha.`);
    }
    return avisos;
  });

  readonly puedeGuardar = computed(() => {
    const b = this.borrador();
    if (!b) return false;
    const nombres = b.jugadores.map((j) => j.nombre.trim());
    return nombres.every(Boolean) && new Set(nombres).size === nombres.length;
  });

  readonly fueEditada = computed(() => {
    const b = this.borrador();
    return b ? this.partidosSvc.fueEditada(b.id) : false;
  });

  constructor() {
    effect(() => {
      const p = this.param();
      if (!p) return;
      if (p === 'nueva') {
        this.borrador.set(fechaVacia(this.partidosSvc.proximoId()));
        return;
      }
      const existente = this.partidosSvc.porId(Number(p));
      // Copia profunda: se edita el borrador, no los datos vivos.
      this.borrador.set(existente ? structuredClone(existente) : null);
    });
  }

  jugadoresDe(equipo: Equipo): { j: ActuacionJugador; i: number }[] {
    const b = this.borrador();
    if (!b) return [];
    return b.jugadores.map((j, i) => ({ j, i })).filter((x) => x.j.equipo === equipo);
  }

  private editarJugador(indice: number, cambios: Partial<ActuacionJugador>): void {
    this.borrador.update((b) =>
      b
        ? {
            ...b,
            jugadores: b.jugadores.map((j, i) => (i === indice ? { ...j, ...cambios } : j)),
          }
        : b
    );
  }

  cambiarNombre(i: number, valor: string): void {
    this.editarJugador(i, { nombre: valor });
  }

  cambiarNumero(i: number, campo: 'goles' | 'asistencias', valor: string): void {
    const n = Math.max(0, Math.floor(Number(valor) || 0));
    this.editarJugador(i, { [campo]: n });
  }

  cambiarEquipo(i: number, equipo: Equipo): void {
    this.editarJugador(i, { equipo });
  }

  agregarJugador(equipo: Equipo): void {
    this.borrador.update((b) =>
      b ? { ...b, jugadores: [...b.jugadores, { nombre: '', goles: 0, asistencias: 0, equipo }] } : b
    );
  }

  quitarJugador(indice: number): void {
    this.borrador.update((b) =>
      b ? { ...b, jugadores: b.jugadores.filter((_, i) => i !== indice) } : b
    );
  }

  // --- goles en contra ---

  agregarGolEnContra(): void {
    this.borrador.update((b) =>
      b ? { ...b, golesEnContra: [...(b.golesEnContra ?? []), { favorA: 'naranja', cantidad: 1 }] } : b
    );
  }

  cambiarGolEnContra(i: number, campo: 'favorA' | 'cantidad', valor: string): void {
    this.borrador.update((b) => {
      if (!b?.golesEnContra) return b;
      const golesEnContra = b.golesEnContra.map((g, k) =>
        k === i
          ? campo === 'favorA'
            ? { ...g, favorA: valor as Equipo }
            : { ...g, cantidad: Math.max(0, Math.floor(Number(valor) || 0)) }
          : g
      );
      return { ...b, golesEnContra };
    });
  }

  quitarGolEnContra(i: number): void {
    this.borrador.update((b) => {
      if (!b?.golesEnContra) return b;
      const golesEnContra = b.golesEnContra.filter((_, k) => k !== i);
      return { ...b, golesEnContra: golesEnContra.length ? golesEnContra : undefined };
    });
  }

  // --- acciones ---

  guardar(): void {
    const b = this.borrador();
    if (!b || !this.puedeGuardar()) return;
    const limpio: Partido = {
      ...b,
      jugadores: b.jugadores.map((j) => ({ ...j, nombre: j.nombre.trim() })),
    };
    this.partidosSvc.guardarFecha(limpio);
    this.router.navigate(['/admin']);
  }

  restaurar(): void {
    const b = this.borrador();
    if (!b) return;
    this.partidosSvc.restaurarFecha(b.id);
    const original = this.partidosSvc.porId(b.id);
    this.borrador.set(original ? structuredClone(original) : null);
  }

  cancelar(): void {
    this.router.navigate(['/admin']);
  }
}
