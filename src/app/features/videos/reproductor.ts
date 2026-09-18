import { Injectable, NgZone, inject, signal } from '@angular/core';

/** Lo minimo de la IFrame API de YouTube que se usa. */
interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  seekTo(segundos: number, permitirBuscar: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
}

interface YTNamespace {
  Player: new (
    elemento: HTMLElement,
    opciones: {
      videoId: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
      };
    }
  ) => YTPlayer;
  PlayerState: { PLAYING: number };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Baja el script de YouTube una sola vez por sesion. */
@Injectable({ providedIn: 'root' })
export class CargadorYouTube {
  private promesa?: Promise<YTNamespace>;

  cargar(): Promise<YTNamespace> {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    this.promesa ??= new Promise((resolver, rechazar) => {
      const previo = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previo?.();
        resolver(window.YT!);
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => {
        this.promesa = undefined;
        rechazar(new Error('No se pudo cargar YouTube. Revisá la conexión.'));
      };
      document.head.appendChild(s);
    });
    return this.promesa;
  }
}

/**
 * Un reproductor montado en un elemento. Expone el segundo actual como signal (se
 * actualiza 4 veces por segundo mientras reproduce, que alcanza para la aguja de la
 * linea de tiempo) y las acciones que usa la pantalla del VAR.
 */
export class Reproductor {
  readonly t = signal(0);
  readonly duracion = signal(0);
  readonly reproduciendo = signal(false);
  readonly listo = signal(false);

  private player?: YTPlayer;
  private reloj?: ReturnType<typeof setInterval>;

  constructor(
    private readonly zona: NgZone,
    yt: YTNamespace,
    elemento: HTMLElement,
    videoId: string,
    duracionConocida: number
  ) {
    this.duracion.set(duracionConocida);
    // Fuera de la zona: el reloj de 250 ms no tiene por que disparar deteccion de cambios
    // en toda la app. Las signals ya avisan a quien las lee.
    this.zona.runOutsideAngular(() => {
      this.player = new yt.Player(elemento, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            this.listo.set(true);
            const d = this.player?.getDuration() ?? 0;
            if (d > 0) this.duracion.set(d);
          },
          onStateChange: (e) => {
            const tocando = e.data === yt.PlayerState.PLAYING;
            this.reproduciendo.set(tocando);
            this.leer();
          },
        },
      });
      this.reloj = setInterval(() => this.reproduciendo() && this.leer(), 250);
    });
  }

  private leer(): void {
    const t = this.player?.getCurrentTime?.();
    if (typeof t === 'number') this.t.set(t);
  }

  /** El segundo de este instante, leido del player (no del ultimo tic). */
  ahora(): number {
    this.leer();
    return this.t();
  }

  irA(segundos: number): void {
    const s = Math.max(0, segundos);
    this.player?.seekTo(s, true);
    this.t.set(s);
  }

  correr(delta: number): void {
    this.irA(this.ahora() + delta);
  }

  alternar(): void {
    if (this.reproduciendo()) this.player?.pauseVideo();
    else this.player?.playVideo();
  }

  destruir(): void {
    clearInterval(this.reloj);
    this.player?.destroy();
  }
}

@Injectable({ providedIn: 'root' })
export class FabricaReproductor {
  private readonly zona = inject(NgZone);
  private readonly cargador = inject(CargadorYouTube);

  async crear(elemento: HTMLElement, videoId: string, duracion: number): Promise<Reproductor> {
    const yt = await this.cargador.cargar();
    return new Reproductor(this.zona, yt, elemento, videoId, duracion);
  }
}
