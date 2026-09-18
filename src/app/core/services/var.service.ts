import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, retry } from 'rxjs';
import { CATEGORIAS_BASE } from '../data/categorias';
import videosCrudos from '../data/videos.json';
import { Equipo } from '../models/partido.model';
import { Categoria, Evento, EventoNuevo, Video } from '../models/var.model';
import { PartidosService } from './partidos.service';
import { Sesion } from './sesion';
import { StatsService } from './stats.service';
import {
  compararGoles,
  contadoresVacios,
  diferenciasDeTitulos,
  golesDeEventos,
  ranking,
} from './var.engine';
import { VarFuente } from './var.fuente';

export const VIDEOS = videosCrudos as Video[];

/**
 * Si Firestore falla (sin red, cuota), se reintenta cada 10 s en vez de caer a un valor
 * vacio. Un `catchError` con `of([])` dejaria la pantalla vacia toda la sesion: ya paso
 * en el Turnero y costo encontrarlo.
 */
const reintentar = <T>(o: Observable<T>) => o.pipe(retry({ delay: 10_000 }));

export interface JugadorElegible {
  nombre: string;
  equipo?: Equipo;
}

@Injectable({ providedIn: 'root' })
export class VarService {
  private readonly fuente = inject(VarFuente);
  private readonly sesion = inject(Sesion);
  private readonly partidosSvc = inject(PartidosService);
  private readonly statsSvc = inject(StatsService);

  readonly videos = VIDEOS;
  private readonly porId = new Map(VIDEOS.map((v) => [v.youtubeId, v]));

  readonly contadores = toSignal(reintentar(this.fuente.contadores()), { initialValue: contadoresVacios() });
  private readonly categoriasGrupo = toSignal(reintentar(this.fuente.categorias()), { initialValue: [] });
  readonly completos = toSignal(reintentar(this.fuente.completos()), { initialValue: [] });

  /** Las de fabrica primero, en su orden; despues las del grupo, alfabeticas. */
  readonly categorias = computed<Categoria[]>(() => {
    const base = new Set(CATEGORIAS_BASE.map((c) => c.id));
    const grupo = this.categoriasGrupo()
      .filter((c) => !base.has(c.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return [...CATEGORIAS_BASE, ...grupo];
  });

  private readonly indiceCategorias = computed(() => new Map(this.categorias().map((c) => [c.id, c])));

  /** Las que tienen al menos un evento, para no llenar la tabla de rankings vacios. */
  readonly categoriasConDatos = computed(() =>
    this.categorias().filter((c) => (this.contadores().categorias[c.id]?.total ?? 0) > 0)
  );

  readonly totalEventos = computed(() =>
    Object.values(this.contadores().porVideo).reduce((a, n) => a + Math.max(0, n), 0)
  );

  /** Titulos del canal cuyo marcador no coincide con el JSON. Se calcula, no se corrige. */
  readonly diferenciasTitulos = computed(() => diferenciasDeTitulos(VIDEOS, this.partidosSvc.partidos()));

  /** Videos marcados completos cuyos goles por jugador no son los del JSON. */
  readonly diferenciasGoles = computed(() =>
    this.completos()
      .filter((c) => c.fechaId !== undefined)
      .map((c) => {
        const partido = this.partidosSvc.porId(c.fechaId!);
        return { completo: c, diferencias: partido ? compararGoles(partido, c.goles) : [] };
      })
      .filter((x) => x.diferencias.length)
  );

  categoria(id: string): Categoria | undefined {
    return this.indiceCategorias().get(id);
  }

  video(youtubeId: string): Video | undefined {
    return this.porId.get(youtubeId);
  }

  videoDeFecha(fechaId: number): Video | undefined {
    return VIDEOS.find((v) => v.fechaId === fechaId);
  }

  completo(youtubeId: string) {
    return this.completos().find((c) => c.youtubeId === youtubeId);
  }

  eventosDeVideo(youtubeId: string): Observable<Evento[]> {
    return reintentar(this.fuente.eventosDeVideo(youtubeId));
  }

  eventosDeJugador(nombre: string, cuantos = 20): Observable<Evento[]> {
    return reintentar(this.fuente.eventosDeJugador(nombre, cuantos));
  }

  bitacora(cuantos: number): Observable<Evento[]> {
    return reintentar(this.fuente.bitacora(cuantos));
  }

  ranking(categoriaId: string) {
    return ranking(this.contadores(), categoriaId);
  }

  /**
   * A quien se le puede marcar algo en este video. Con fecha del JSON, los diez que
   * jugaron, por equipo. Sin fecha (2025, especiales), los habituales y cualquiera que ya
   * tenga algo marcado; el resto se escribe a mano.
   */
  jugadoresDe(video: Video): JugadorElegible[] {
    if (video.fechaId !== undefined) {
      const p = this.partidosSvc.porId(video.fechaId);
      if (p) {
        return [...p.jugadores]
          .sort((a, b) => (a.equipo === b.equipo ? a.nombre.localeCompare(b.nombre, 'es') : a.equipo === 'naranja' ? -1 : 1))
          .map((j) => ({ nombre: j.nombre, equipo: j.equipo }));
      }
    }
    const nombres = new Set(this.statsSvc.habituales().map((s) => s.nombre));
    for (const c of Object.values(this.contadores().categorias)) {
      for (const [n, k] of Object.entries(c.porJugador)) if (k > 0) nombres.add(n);
    }
    return [...nombres].sort((a, b) => a.localeCompare(b, 'es')).map((nombre) => ({ nombre }));
  }

  private autor() {
    const u = this.sesion.usuario();
    if (!u) throw new Error('Hay que entrar con Google para marcar.');
    return u;
  }

  anotar(evento: EventoNuevo): Promise<void> {
    return this.fuente.anotar(evento, this.autor());
  }

  borrar(evento: Evento): Promise<void> {
    this.autor();
    return this.fuente.borrar(evento);
  }

  puedeBorrar(evento: Evento): boolean {
    const u = this.sesion.usuario();
    return !!u && (u.esAdmin || u.uid === evento.autorUid);
  }

  crearCategoria(categoria: Categoria): Promise<void> {
    return this.fuente.crearCategoria(categoria, this.autor());
  }

  /** Congela los goles marcados en este momento para controlarlos contra el JSON. */
  marcarCompleto(video: Video, eventos: Evento[]): Promise<void> {
    return this.fuente.marcarCompleto({
      youtubeId: video.youtubeId,
      ...(video.fechaId !== undefined && { fechaId: video.fechaId }),
      goles: golesDeEventos(eventos),
      por: this.autor().nombre,
    });
  }

  desmarcarCompleto(video: Video): Promise<void> {
    this.autor();
    return this.fuente.desmarcarCompleto(video.youtubeId);
  }
}
