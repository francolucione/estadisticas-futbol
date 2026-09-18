import { Component, inject, signal } from '@angular/core';
import { Sesion } from '../../core/services/sesion';

/** El "Entrar" / avatar de la cabecera. Leer no pide nada; marcar pide Google. */
@Component({
  selector: 'app-boton-sesion',
  standalone: true,
  template: `
    @if (sesion.lista()) {
      @if (sesion.usuario(); as u) {
        <button type="button" class="quien" (click)="abierto.set(!abierto())" [attr.aria-expanded]="abierto()">
          @if (u.foto) {
            <img [src]="u.foto" alt="" referrerpolicy="no-referrer" />
          }
          <span>{{ u.nombre }}</span>
        </button>
        @if (abierto()) {
          <button type="button" class="bt mini" (click)="salir()">Salir</button>
        }
      } @else {
        <button type="button" class="bt mini" (click)="entrar()">Entrar con Google</button>
      }
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: 6px;
        padding-right: 8px;
      }
      .quien {
        display: flex;
        align-items: center;
        gap: 6px;
        background: none;
        border: 0;
        color: var(--tinta);
        font: inherit;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        padding: 4px;
      }
      img {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        box-shadow: 0 0 0 1px var(--metal-filo);
      }
    `,
  ],
})
export class BotonSesionComponent {
  readonly sesion = inject(Sesion);
  readonly abierto = signal(false);

  async entrar(): Promise<void> {
    try {
      await this.sesion.entrar();
    } catch {
      // Cerrar la ventana de Google no es un error que haya que mostrar: se queda como estaba.
    }
  }

  async salir(): Promise<void> {
    this.abierto.set(false);
    await this.sesion.salir();
  }
}
