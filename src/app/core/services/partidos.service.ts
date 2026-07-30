import { Injectable, computed, effect, signal } from '@angular/core';
import { ArchivoPartidos, Marcador, Partido } from '../models/partido.model';
import { Parches, contarParches, hayParches, parchesVacios } from '../models/parches.model';
import datosCrudos from '../data/partidos.json';

export const CLAVE_PARCHES = 'gallo.parches.v1';

/** Calcula el marcador de un partido, incluyendo los goles en contra. */
export function marcadorDe(partido: Partido): Marcador {
  let naranja = 0;
  let azul = 0;
  for (const j of partido.jugadores) {
    if (j.equipo === 'naranja') naranja += j.goles;
    else azul += j.goles;
  }
  for (const g of partido.golesEnContra ?? []) {
    if (g.favorA === 'naranja') naranja += g.cantidad;
    else azul += g.cantidad;
  }
  return { naranja, azul };
}

/**
 * Aplica el mapa de alias a los nombres. Si dos entradas de un mismo
 * partido colapsan en el mismo nombre se lanza: serian una persona jugando
 * contra si misma, que es exactamente el bug que tenia la version anterior.
 */
export function aplicarAlias(archivo: ArchivoPartidos): Partido[] {
  const alias = archivo.alias ?? {};
  return archivo.partidos.map((p) => {
    const jugadores = p.jugadores.map((j) => ({ ...j, nombre: alias[j.nombre] ?? j.nombre }));
    const vistos = new Set<string>();
    for (const j of jugadores) {
      if (vistos.has(j.nombre)) {
        throw new Error(
          `partido ${p.id}: "${j.nombre}" aparece dos veces despues de aplicar alias. ` +
            `Revisa el mapa "alias" en partidos.json.`
        );
      }
      vistos.add(j.nombre);
    }
    return { ...p, jugadores };
  });
}

/** Chequeos de forma sobre los datos. No tira: devuelve avisos. */
export function validar(partidos: Partido[]): string[] {
  const avisos: string[] = [];
  for (const p of partidos) {
    const naranja = p.jugadores.filter((j) => j.equipo === 'naranja').length;
    const azul = p.jugadores.filter((j) => j.equipo === 'azul').length;
    if (naranja !== azul) {
      avisos.push(`Fecha ${p.id}: equipos desparejos (${naranja} naranja vs ${azul} azul).`);
    }
    for (const j of p.jugadores) {
      if (j.goles < 0 || j.asistencias < 0) {
        avisos.push(`Fecha ${p.id}: ${j.nombre} tiene valores negativos.`);
      }
    }
  }
  return avisos;
}

/** Superpone las correcciones locales sobre el archivo empaquetado. */
export function aplicarParches(base: ArchivoPartidos, parches: Parches): ArchivoPartidos {
  const borrados = new Set(parches.borrados);
  const partidos = [
    ...base.partidos.filter((p) => !borrados.has(p.id)).map((p) => parches.partidos[p.id] ?? p),
    ...parches.agregados.filter((p) => !borrados.has(p.id)),
  ].sort((a, b) => a.id - b.id);

  return { alias: { ...base.alias, ...parches.alias }, partidos };
}

function leerParches(): Parches {
  try {
    const crudo = localStorage.getItem(CLAVE_PARCHES);
    if (!crudo) return parchesVacios();
    const leido = JSON.parse(crudo) as Parches;
    if (leido.version !== 1) return parchesVacios();
    return { ...parchesVacios(), ...leido };
  } catch {
    // Un localStorage corrupto no puede tumbar la app: se arranca limpio.
    return parchesVacios();
  }
}

@Injectable({ providedIn: 'root' })
export class PartidosService {
  private readonly base = datosCrudos as ArchivoPartidos;
  private readonly parches = signal<Parches>(leerParches());

  /** El archivo tal como quedaria si lo exportaras ahora. */
  readonly archivo = computed(() => aplicarParches(this.base, this.parches()));

  readonly partidos = computed(() => aplicarAlias(this.archivo()));
  readonly avisos = computed(() => validar(this.partidos()));
  readonly alias = computed(() => this.archivo().alias);

  readonly hayCorrecciones = computed(() => hayParches(this.parches()));
  readonly cantidadCorrecciones = computed(() => contarParches(this.parches()));

  readonly nombres = computed(() => {
    const set = new Set<string>();
    for (const p of this.partidos()) for (const j of p.jugadores) set.add(j.nombre);
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  });

  constructor() {
    effect(() => {
      const p = this.parches();
      try {
        if (hayParches(p)) localStorage.setItem(CLAVE_PARCHES, JSON.stringify(p));
        else localStorage.removeItem(CLAVE_PARCHES);
      } catch {
        // Sin localStorage (modo privado, cuota llena) la app sigue andando;
        // las correcciones simplemente no sobreviven al refresco.
      }
    });
  }

  porId(id: number): Partido | undefined {
    return this.partidos().find((p) => p.id === id);
  }

  /** Id libre para una fecha nueva. */
  proximoId(): number {
    return this.archivo().partidos.reduce((max, p) => Math.max(max, p.id), 0) + 1;
  }

  private esDelBase(id: number): boolean {
    return this.base.partidos.some((p) => p.id === id);
  }

  /** Guarda una fecha, sea una correccion del base o una fecha nueva. */
  guardarFecha(partido: Partido): void {
    this.parches.update((p) => {
      if (this.esDelBase(partido.id)) {
        return {
          ...p,
          partidos: { ...p.partidos, [partido.id]: partido },
          borrados: p.borrados.filter((id) => id !== partido.id),
        };
      }
      const agregados = p.agregados.some((x) => x.id === partido.id)
        ? p.agregados.map((x) => (x.id === partido.id ? partido : x))
        : [...p.agregados, partido];
      return { ...p, agregados, borrados: p.borrados.filter((id) => id !== partido.id) };
    });
  }

  borrarFecha(id: number): void {
    this.parches.update((p) => ({
      ...p,
      // Si era una fecha agregada localmente, se va del todo. Si venia del
      // archivo base hay que recordar que fue borrada.
      agregados: p.agregados.filter((x) => x.id !== id),
      borrados: this.esDelBase(id) ? [...new Set([...p.borrados, id])] : p.borrados,
      partidos: Object.fromEntries(
        Object.entries(p.partidos).filter(([k]) => Number(k) !== id)
      ),
    }));
  }

  /** Deja una fecha como venia en el archivo base. */
  restaurarFecha(id: number): void {
    this.parches.update((p) => ({
      ...p,
      partidos: Object.fromEntries(
        Object.entries(p.partidos).filter(([k]) => Number(k) !== id)
      ),
      borrados: p.borrados.filter((x) => x !== id),
    }));
  }

  fueEditada(id: number): boolean {
    const p = this.parches();
    return p.partidos[id] !== undefined || p.agregados.some((x) => x.id === id);
  }

  definirAlias(alias: Record<string, string>): void {
    this.parches.update((p) => ({ ...p, alias }));
  }

  descartarTodo(): void {
    this.parches.set(parchesVacios());
  }

  /** El partidos.json final, listo para pisar el del repositorio. */
  exportar(): string {
    return JSON.stringify(this.archivo(), null, 2) + '\n';
  }
}
