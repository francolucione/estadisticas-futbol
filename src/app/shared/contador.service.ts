import { Injectable, signal } from '@angular/core';

/** Lo que tarda un numero en llegar a su valor. */
const DURACION = 900;

/**
 * easeOutExpo. Arranca disparado y llega frenando: a los 400 ms el numero ya
 * esta practicamente en su valor y los ultimos pasos se demoran, que es el
 * envion y el freno final que se busca.
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

/**
 * Un solo reloj para todos los contadores de la app.
 *
 * La tabla de posiciones sola tiene del orden de 260 celdas subiendo a la vez;
 * con un requestAnimationFrame por numero el telefono se arrastra. Aca hay un
 * unico bucle que publica el avance y cada directiva lee de ahi, asi todos los
 * numeros de la pantalla se mueven en bloque.
 */
@Injectable({ providedIn: 'root' })
export class ContadorService {
  private readonly avance = signal(1);

  /**
   * Avance de 0 a 1, con la curva ya aplicada. Arranca en 1 para que una
   * pagina que nunca llame a reiniciar() muestre los numeros de verdad en vez
   * de ceros.
   */
  readonly progreso = this.avance.asReadonly();

  private frame: number | null = null;

  /** Larga la animacion desde cero. Cada pagina la llama al entrar en vista. */
  reiniciar(): void {
    this.cancelar();

    // Sin animacion si el sistema la pide apagada, o si no hay reloj de frames
    // (tests, render en servidor).
    if (prefiereQuieto() || typeof requestAnimationFrame !== 'function') {
      this.avance.set(1);
      return;
    }

    const arranque = performance.now();
    this.avance.set(0);

    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - arranque) / DURACION);
      if (t >= 1) {
        // El ultimo frame escribe 1 exacto: si no, un 103 podria quedarse en 102.
        this.avance.set(1);
        this.frame = null;
        return;
      }
      this.avance.set(curva(t));
      this.frame = requestAnimationFrame(paso);
    };

    this.frame = requestAnimationFrame(paso);
  }

  private cancelar(): void {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }
}
