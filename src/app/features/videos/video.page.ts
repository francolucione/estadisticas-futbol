import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { map, of, switchMap } from 'rxjs';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { EMOJIS_SUGERIDOS } from '../../core/data/categorias';
import { Categoria, Evento, TipoCategoria } from '../../core/models/var.model';
import { Sesion } from '../../core/services/sesion';
import { compararGoles, fraseDe, golesDeEventos, hms, nombreDeVideo } from '../../core/services/var.engine';
import { JugadorElegible, VarService } from '../../core/services/var.service';
import { PartidosService } from '../../core/services/partidos.service';
import { BotonSesionComponent } from './boton-sesion.component';
import { LineaTiempoComponent } from './linea-tiempo.component';
import { FabricaReproductor, Reproductor } from './reproductor';

/** Lo que se esta cargando: el segundo quedo congelado al tocar la tecla. */
interface Captura {
  categoria: Categoria;
  t: number;
  jugador: string | null;
  jugador2: string | null;
  nota: string;
  /** Desde donde sale volando el emoji al anotar. */
  origen: { x: number; y: number };
}

interface NuevaCategoria {
  emoji: string;
  nombre: string;
  frase: string;
  tipo: TipoCategoria;
}

/** "Se ata los cordones" -> "se-ata-los-cordones". */
function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

@Component({
  selector: 'app-video',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    LineaTiempoComponent,
    BotonSesionComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
  ],
  templateUrl: './video.page.html',
})
export class VideoPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly varSvc = inject(VarService);
  private readonly partidosSvc = inject(PartidosService);
  private readonly fabrica = inject(FabricaReproductor);
  readonly sesion = inject(Sesion);

  readonly hms = hms;
  readonly emojis = EMOJIS_SUGERIDOS;

  private readonly marco = viewChild<ElementRef<HTMLElement>>('marco');
  private readonly linea = viewChild(LineaTiempoComponent);

  readonly id = toSignal(this.route.paramMap.pipe(map((p) => p.get('id') ?? '')), { initialValue: '' });
  readonly video = computed(() => this.varSvc.video(this.id()) ?? null);
  readonly titulo = computed(() => {
    const v = this.video();
    return v ? nombreDeVideo(v) : 'Video';
  });

  readonly eventos = toSignal(
    toObservable(this.id).pipe(switchMap((id) => (id ? this.varSvc.eventosDeVideo(id) : of([])))),
    { initialValue: [] as Evento[] }
  );

  readonly categorias = this.varSvc.categorias;
  readonly indiceCategorias = computed(() => new Map(this.categorias().map((c) => [c.id, c])));

  readonly jugadores = computed<JugadorElegible[]>(() => {
    const v = this.video();
    return v ? this.varSvc.jugadoresDe(v) : [];
  });

  readonly partido = computed(() => {
    const id = this.video()?.fechaId;
    return id !== undefined ? (this.partidosSvc.porId(id) ?? null) : null;
  });

  /** Goles marcados en el video contra los del JSON, en vivo. */
  readonly control = computed(() => {
    const p = this.partido();
    if (!p) return null;
    const goles = golesDeEventos(this.eventos());
    const marcados = Object.values(goles).reduce((a, n) => a + n, 0);
    const json = p.jugadores.reduce((a, j) => a + j.goles, 0);
    return { marcados, json, diferencias: compararGoles(p, goles) };
  });

  readonly completo = computed(() => this.varSvc.completo(this.id()) ?? null);

  // --- reproductor ---
  readonly reproductor = signal<Reproductor | null>(null);
  readonly errorVideo = signal<string | null>(null);
  readonly t = computed(() => this.reproductor()?.t() ?? 0);
  readonly duracion = computed(() => this.reproductor()?.duracion() || this.video()?.duracionSeg || 1);

  // --- carga ---
  readonly captura = signal<Captura | null>(null);
  readonly nueva = signal<NuevaCategoria | null>(null);
  readonly otro = signal('');
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  /** El sello del segundo congelado que aparece sobre el video. */
  readonly sello = signal<{ texto: string; clave: number } | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly recien = signal<string | null>(null);

  private temporizadores: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    effect(() => {
      const marco = this.marco()?.nativeElement;
      const v = this.video();
      if (!marco || !v || this.reproductor()) return;
      const destino = document.createElement('div');
      marco.appendChild(destino);
      this.fabrica
        .crear(destino, v.youtubeId, v.duracionSeg)
        .then((r) => this.reproductor.set(r))
        .catch((e: Error) => this.errorVideo.set(e.message));
    });

    // Desde la bitacora o la ficha se llega con ?t=segundo: se salta ahi apenas el
    // reproductor esta listo, una sola vez.
    let saltado = false;
    effect(() => {
      const r = this.reproductor();
      const t = Number(this.route.snapshot.queryParamMap.get('t'));
      if (!r?.listo() || saltado || !(t > 0)) return;
      saltado = true;
      r.irA(t);
    });

    // El recien anotado: cuando aparece en la lista (via snapshot), se lo resalta.
    let anteriores = new Set<string>();
    effect(() => {
      const ids = this.eventos().map((e) => e.id);
      const nuevos = ids.filter((id) => !anteriores.has(id));
      if (anteriores.size && nuevos.length === 1) this.recien.set(nuevos[0]);
      anteriores = new Set(ids);
    });
  }

  ngOnDestroy(): void {
    this.reproductor()?.destruir();
    this.temporizadores.forEach(clearTimeout);
  }

  private despues(ms: number, fn: () => void): void {
    this.temporizadores.push(setTimeout(fn, ms));
  }

  // --------------------------------------------------------------- capturar

  /** El toque congela el segundo YA, no cuando se termina de elegir al jugador. */
  capturar(categoria: Categoria, origen?: HTMLElement): void {
    const t = Math.floor(this.reproductor()?.ahora() ?? 0);
    const r = origen?.getBoundingClientRect();
    this.error.set(null);
    this.otro.set('');
    this.captura.set({
      categoria,
      t,
      jugador: null,
      jugador2: null,
      nota: '',
      origen: r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight - 80 },
    });
    const clave = Date.now();
    this.sello.set({ texto: hms(t), clave });
    // Solo lo apaga si sigue siendo el mismo: dos toques seguidos no se pisan.
    this.despues(1400, () => this.sello()?.clave === clave && this.sello.set(null));
    this.mostrarHoja();
  }

  /**
   * En el telefono el video queda fijo arriba y ocupa media pantalla: la hoja se abre
   * debajo del pliegue y parece que la tecla no hizo nada. Se la trae a la vista.
   */
  private mostrarHoja(): void {
    this.despues(0, () =>
      document.querySelector('.var-hoja')?.scrollIntoView({
        block: 'nearest',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      })
    );
  }

  ajustar(delta: number): void {
    const c = this.captura();
    if (!c) return;
    const t = Math.max(0, c.t + delta);
    this.captura.set({ ...c, t });
    this.reproductor()?.irA(t);
  }

  elegir(nombre: string, segundo = false): void {
    const c = this.captura();
    if (!c) return;
    if (segundo) this.captura.set({ ...c, jugador2: c.jugador2 === nombre ? null : nombre });
    else this.captura.set({ ...c, jugador: nombre, jugador2: c.jugador2 === nombre ? null : c.jugador2 });
  }

  esDeLista(nombre: string): boolean {
    return this.jugadores().some((j) => j.nombre === nombre);
  }

  agregarOtro(): void {
    const nombre = this.otro().trim();
    if (nombre) this.elegir(nombre);
    this.otro.set('');
  }

  cambiarNota(nota: string): void {
    const c = this.captura();
    if (c) this.captura.set({ ...c, nota });
  }

  readonly vistaPrevia = computed(() => {
    const c = this.captura();
    if (!c) return '';
    return fraseDe(c.categoria, { jugador: c.jugador ?? '¿quién?', jugador2: c.jugador2 ?? undefined });
  });

  readonly sePuedeAnotar = computed(() => {
    const c = this.captura();
    if (!c?.jugador || this.guardando()) return false;
    return !c.categoria.segundo?.obligatorio || !!c.jugador2;
  });

  cancelar(): void {
    this.captura.set(null);
    this.nueva.set(null);
  }

  async anotar(): Promise<void> {
    const c = this.captura();
    const v = this.video();
    if (!c || !v || !c.jugador || !this.sePuedeAnotar()) return;
    this.guardando.set(true);
    this.error.set(null);
    // Lo que va a quedar en el contador despues de este: para el aviso, sin esperar el
    // snapshot.
    const antes = this.varSvc.contadores().categorias[c.categoria.id]?.porJugador[c.jugador] ?? 0;
    try {
      await this.varSvc.anotar({
        videoId: v.youtubeId,
        t: c.t,
        categoriaId: c.categoria.id,
        jugador: c.jugador,
        ...(c.jugador2 && { jugador2: c.jugador2 }),
        ...(c.nota.trim() && { nota: c.nota.trim() }),
      });
      this.volar(c);
      this.captura.set(null);
      this.avisar(this.fraseAviso(c, antes + 1));
    } catch (e) {
      this.error.set(this.mensajeError(e));
    } finally {
      this.guardando.set(false);
    }
  }

  /** "👟 Adri R ya se ató los cordones 7 veces", o la primera vez. */
  private fraseAviso(c: Captura, cuantas: number): string {
    const frase = fraseDe(c.categoria, { jugador: c.jugador!, jugador2: c.jugador2 ?? undefined });
    const veces = cuantas === 1 ? 'la primera en la historia' : `van ${cuantas} en la historia`;
    return `${c.categoria.emoji} ${frase}: ${veces}.`;
  }

  private avisar(texto: string): void {
    this.aviso.set(texto);
    this.despues(3800, () => this.aviso() === texto && this.aviso.set(null));
  }

  private mensajeError(e: unknown): string {
    const code = (e as { code?: string })?.code ?? '';
    if (code === 'permission-denied') return 'No se guardó: la base lo rechazó. Volvé a entrar con Google y probá de nuevo.';
    if (code === 'unavailable') return 'No se guardó: no hay conexión. Probá de nuevo cuando vuelva.';
    return e instanceof Error ? e.message : 'No se guardó. Probá de nuevo.';
  }

  /** El emoji vuela desde la tecla hasta su segundo en la linea de tiempo. */
  private volar(c: Captura): void {
    const linea = this.linea();
    if (!linea || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const destino = linea.puntoDe(c.t);
    const el = document.createElement('span');
    el.className = 'emoji-volador';
    el.textContent = c.categoria.emoji;
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    const dx = destino.x - c.origen.x;
    const dy = destino.y - c.origen.y;
    const a = el.animate(
      [
        { transform: `translate(${c.origen.x}px, ${c.origen.y}px) scale(1.8)`, opacity: 1 },
        {
          transform: `translate(${c.origen.x + dx * 0.5}px, ${c.origen.y + dy * 0.5 - 90}px) scale(2.4) rotate(-12deg)`,
          opacity: 1,
          offset: 0.45,
        },
        { transform: `translate(${destino.x}px, ${destino.y}px) scale(1)`, opacity: 0.9 },
      ],
      { duration: 650, easing: 'cubic-bezier(.3,.7,.4,1)' }
    );
    a.onfinish = () => el.remove();
  }

  async borrar(e: Evento): Promise<void> {
    try {
      await this.varSvc.borrar(e);
      this.avisar(`Borrado: ${this.frase(e)} (${hms(e.t)}).`);
    } catch (err) {
      this.avisar(this.mensajeError(err));
    }
  }

  puedeBorrar(e: Evento): boolean {
    return this.varSvc.puedeBorrar(e);
  }

  frase(e: Evento): string {
    return fraseDe(this.indiceCategorias().get(e.categoriaId), e);
  }

  emojiDe(e: Evento): string {
    return this.indiceCategorias().get(e.categoriaId)?.emoji ?? '•';
  }

  ir(t: number): void {
    this.reproductor()?.irA(t);
  }

  async entrar(): Promise<void> {
    try {
      await this.sesion.entrar();
    } catch (e) {
      this.error.set(
        (e as { code?: string })?.code === 'auth/popup-closed-by-user'
          ? 'Se cerró la ventana de Google antes de terminar.'
          : 'No se pudo entrar con Google. Probá de nuevo.'
      );
    }
  }

  // ---------------------------------------------------- categoria nueva

  abrirNueva(): void {
    this.captura.set(null);
    this.error.set(null);
    this.nueva.set({ emoji: EMOJIS_SUGERIDOS[0], nombre: '', frase: '', tipo: 'gesto' });
    this.mostrarHoja();
  }

  editarNueva(cambio: Partial<NuevaCategoria>): void {
    const n = this.nueva();
    if (n) this.nueva.set({ ...n, ...cambio });
  }

  readonly fraseNueva = computed(() => {
    const n = this.nueva();
    if (!n) return '';
    return n.frase.trim() || `{j}: ${n.nombre.trim().toLowerCase() || '...'}`;
  });

  readonly idNueva = computed(() => slug(this.nueva()?.nombre ?? ''));

  readonly nuevaValida = computed(() => {
    const n = this.nueva();
    return !!n && !!n.emoji.trim() && this.idNueva().length >= 2 && !this.indiceCategorias().has(this.idNueva());
  });

  async crearCategoria(): Promise<void> {
    const n = this.nueva();
    if (!n || !this.nuevaValida()) return;
    const frase = this.fraseNueva().includes('{j}') ? this.fraseNueva() : `{j} ${this.fraseNueva()}`;
    const categoria: Categoria = { id: this.idNueva(), emoji: n.emoji.trim(), nombre: n.nombre.trim(), frase, tipo: n.tipo };
    this.guardando.set(true);
    try {
      await this.varSvc.crearCategoria(categoria);
      this.nueva.set(null);
      this.avisar(`${categoria.emoji} ${categoria.nombre}: nueva categoría para todos.`);
    } catch (e) {
      this.error.set(this.mensajeError(e));
    } finally {
      this.guardando.set(false);
    }
  }

  // ---------------------------------------------------- video completo

  async alternarCompleto(): Promise<void> {
    const v = this.video();
    if (!v) return;
    try {
      if (this.completo()) await this.varSvc.desmarcarCompleto(v);
      else await this.varSvc.marcarCompleto(v, this.eventos());
    } catch (e) {
      this.avisar(this.mensajeError(e));
    }
  }

  // ------------------------------------------------------------ teclado

  @HostListener('document:keydown', ['$event'])
  tecla(e: KeyboardEvent): void {
    const destino = e.target as HTMLElement;
    if (destino.closest('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
    const r = this.reproductor();

    if (e.key === 'Escape' && (this.captura() || this.nueva())) {
      this.cancelar();
    } else if (e.key === 'Enter' && this.captura()) {
      e.preventDefault();
      void this.anotar();
    } else if (e.key === ' ' && r) {
      e.preventDefault();
      r.alternar();
    } else if (e.key === 'ArrowLeft' && r) {
      r.correr(-5);
    } else if (e.key === 'ArrowRight' && r) {
      r.correr(5);
    } else if (!this.captura() && !this.nueva()) {
      const c = this.categorias().find((x) => x.tecla === e.key.toLowerCase());
      if (c) this.capturar(c, document.getElementById(`tecla-${c.id}`) ?? undefined);
    }
  }
}
