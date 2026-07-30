import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { PartidosService, marcadorDe } from '../../core/services/partidos.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent],
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.scss',
})
export class AdminPage {
  private readonly partidosSvc = inject(PartidosService);
  private readonly router = inject(Router);

  readonly hayCorrecciones = this.partidosSvc.hayCorrecciones;
  readonly cantidad = this.partidosSvc.cantidadCorrecciones;
  readonly avisos = this.partidosSvc.avisos;

  readonly mensaje = signal<string>('');
  readonly confirmandoDescarte = signal(false);

  readonly fechas = computed(() =>
    [...this.partidosSvc.partidos()]
      .sort((a, b) => b.id - a.id)
      .map((p) => {
        const m = marcadorDe(p);
        return {
          id: p.id,
          marcador: `${m.naranja} - ${m.azul}`,
          jugadores: p.jugadores.length,
          editada: this.partidosSvc.fueEditada(p.id),
        };
      })
  );

  readonly alias = computed(() => Object.entries(this.partidosSvc.alias()));

  readonly nombres = this.partidosSvc.nombres;

  // --- alias ---
  readonly aliasDe = signal('');
  readonly aliasA = signal('');

  agregarAlias(): void {
    const de = this.aliasDe().trim();
    const a = this.aliasA().trim();
    if (!de || !a || de === a) return;
    this.partidosSvc.definirAlias({ ...this.partidosSvc.alias(), [de]: a });
    this.aliasDe.set('');
    this.aliasA.set('');
    this.avisar(`Ahora "${de}" cuenta como "${a}".`);
  }

  quitarAlias(de: string): void {
    const actual = { ...this.partidosSvc.alias() };
    delete actual[de];
    this.partidosSvc.definirAlias(actual);
    this.avisar(`Se deshizo el alias de "${de}".`);
  }

  // --- fechas ---
  nuevaFecha(): void {
    this.router.navigate(['/admin/fecha', 'nueva']);
  }

  borrarFecha(id: number): void {
    this.partidosSvc.borrarFecha(id);
    this.avisar(`Fecha ${id} eliminada.`);
  }

  restaurarFecha(id: number): void {
    this.partidosSvc.restaurarFecha(id);
    this.avisar(`Fecha ${id} restaurada a como venia en el archivo.`);
  }

  // --- exportar ---
  descargar(): void {
    const contenido = this.partidosSvc.exportar();
    const blob = new Blob([contenido], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'partidos.json';
    a.click();
    URL.revokeObjectURL(url);
    this.avisar('Descargado. Pisa con el src/app/core/data/partidos.json del repo.');
  }

  async copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.partidosSvc.exportar());
      this.avisar('Copiado al portapapeles.');
    } catch {
      this.avisar('No se pudo copiar. Proba con Descargar.');
    }
  }

  descartarTodo(): void {
    this.partidosSvc.descartarTodo();
    this.confirmandoDescarte.set(false);
    this.avisar('Se descartaron todas las correcciones locales.');
  }

  private avisar(texto: string): void {
    this.mensaje.set(texto);
    setTimeout(() => this.mensaje.set(''), 4000);
  }
}
