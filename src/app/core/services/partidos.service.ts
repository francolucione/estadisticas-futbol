import { Injectable, computed, signal } from '@angular/core';
import { ArchivoPartidos, Marcador, Partido } from '../models/partido.model';
import datosCrudos from '../data/partidos.json';

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

@Injectable({ providedIn: 'root' })
export class PartidosService {
  private readonly archivo = signal<ArchivoPartidos>(datosCrudos as ArchivoPartidos);

  readonly partidos = computed(() => aplicarAlias(this.archivo()));
  readonly avisos = computed(() => validar(this.partidos()));

  readonly nombres = computed(() => {
    const set = new Set<string>();
    for (const p of this.partidos()) for (const j of p.jugadores) set.add(j.nombre);
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  });

  porId(id: number): Partido | undefined {
    return this.partidos().find((p) => p.id === id);
  }
}
