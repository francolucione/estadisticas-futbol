import { Injectable, Signal, WritableSignal, signal } from '@angular/core';

/** Ruido ilegible antes de que el numero empiece a subir de verdad. */
const REVUELTO = 240;
/** Rampa con freno, desde cero hasta el valor. */
const SUBIDA = 860;
/**
 * Cada cuanto cambian los digitos al azar. Con el parpadeo atado al frame se ve mush;
 * a ~55 ms se alcanza a percibir que son cifras distintas, que es lo que hace la
 * sensacion de caja registradora. De paso, la directiva escribe al DOM cuatro veces en
 * la ventana en vez de quince.
 */
const PARPADEO = 55;

/** Canal por defecto: todos los numeros de la pantalla. */
export const GRUPO_PAGINA = 'pagina';

/**
 * easeOutExpo. Arranca disparado y llega frenando: a un tercio del recorrido el numero
 * ya esta al 90% y los ultimos pasos se estiran, que es el mini slow-motion final.
 */
export function curva(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function prefiereQuieto(): boolean {
  return (
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Lo que publica un canal. La directiva lee las dos senales. */
interface Canal {
  /** 0 a 1 con la curva ya aplicada. Se queda en 0 mientras el numero revuelve. */
  avance: WritableSignal<number>;
  /** 0 = quieto. Mayor que 0 = tick de digitos al azar. */
  sacudida: WritableSignal<number>;
}

/**
 * Un solo reloj para todos los contadores de la app, repartido en canales.
 *
 * La tabla de posiciones sola tiene del orden de 260 celdas subiendo a la vez; con un
 * requestAnimationFrame por numero el telefono se arrastra. Aca hay un unico bucle que
 * publica el avance de cada canal y cada directiva lee del suyo.
 *
 * Los canales existen para poder re-animar una sola columna al cambiar de metrica sin
 * sacudir la pantalla entera. Entrar a una pantalla los reinicia todos.
 */
@Injectable({ providedIn: 'root' })
export class ContadorService {
  private readonly canales = new Map<string, Canal>();
  /** Grupo -> momento en que arranco. Solo estan los que se estan moviendo. */
  private readonly corriendo = new Map<string, number>();
  private frame: number | null = null;

  /** El canal de la pantalla, que es el que usa la mayoria de los numeros. */
  readonly progreso = this.progresoDe(GRUPO_PAGINA);

  /**
   * Avance del canal, de 0 a 1. Arranca en 1 para que una pantalla que nunca llame a
   * reiniciar() muestre los numeros de verdad en vez de ceros.
   */
  progresoDe(grupo: string): Signal<number> {
    return this.canal(grupo).avance.asReadonly();
  }

  /** Tick de digitos al azar del canal. 0 mientras no este revolviendo. */
  sacudidaDe(grupo: string): Signal<number> {
    return this.canal(grupo).sacudida.asReadonly();
  }

  /**
   * Larga todos los canales desde cero. Cada pagina la llama al entrar en vista, y
   * tambien los filtros que cambian el juego de filas entero.
   */
  reiniciar(): void {
    // Los canales de columna se crean recien cuando una directiva los pide, asi que la
    // primera entrada a la pantalla puede encontrar solo el de pagina. Se agrega a mano
    // para que exista aunque nadie lo haya pedido todavia.
    this.canal(GRUPO_PAGINA);
    for (const grupo of [...this.canales.keys()]) this.arrancar(grupo);
  }

  /** Larga un solo canal. Lo usa el cambio de metrica, que toca una columna sola. */
  reiniciarGrupo(grupo: string): void {
    this.canal(grupo);
    this.arrancar(grupo);
  }

  private canal(grupo: string): Canal {
    let canal = this.canales.get(grupo);
    if (!canal) {
      canal = { avance: signal(1), sacudida: signal(0) };
      this.canales.set(grupo, canal);
    }
    return canal;
  }

  private arrancar(grupo: string): void {
    const canal = this.canal(grupo);

    // Sin animacion si el sistema la pide apagada, o si no hay reloj de frames
    // (tests, render en servidor).
    if (prefiereQuieto() || typeof requestAnimationFrame !== 'function') {
      this.corriendo.delete(grupo);
      canal.sacudida.set(0);
      canal.avance.set(1);
      return;
    }

    canal.avance.set(0);
    canal.sacudida.set(1);
    this.corriendo.set(grupo, performance.now());
    this.encender();
  }

  private encender(): void {
    if (this.frame !== null) return;

    const paso = (ahora: number) => {
      for (const [grupo, arranque] of [...this.corriendo]) {
        const canal = this.canal(grupo);
        const ms = ahora - arranque;

        if (ms < REVUELTO) {
          // Todavia es ruido: el avance real no empezo.
          canal.sacudida.set(Math.floor(ms / PARPADEO) + 1);
          continue;
        }

        const t = (ms - REVUELTO) / SUBIDA;
        canal.sacudida.set(0);
        if (t >= 1) {
          // El ultimo frame escribe 1 exacto: si no, un 103 podria quedarse en 102.
          canal.avance.set(1);
          this.corriendo.delete(grupo);
          continue;
        }
        canal.avance.set(curva(t));
      }

      this.frame = this.corriendo.size > 0 ? requestAnimationFrame(paso) : null;
    };

    this.frame = requestAnimationFrame(paso);
  }
}
