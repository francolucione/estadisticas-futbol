import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';

/**
 * Desliza el indicador del segmento entre botones en vez de hacerlo saltar.
 *
 * El indicador es el ::after del .segmento (ver global.scss). Esta directiva
 * solo mide el boton activo y escribe --x y --w; el movimiento lo hace CSS,
 * animando transform y width.
 *
 * Se observa el atributo class de los hijos en vez de escuchar clicks porque
 * la clase .activo la pone Angular al recalcular la vista, y hay pantallas
 * donde el segmento cambia sin que nadie lo haya tocado (por ejemplo al
 * elegir una familia de metricas, que ademas cambia la metrica activa).
 */
@Directive({
  selector: '[appSubrayado]',
  standalone: true,
})
export class SubrayadoDirective implements AfterViewInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private observador?: MutationObserver;
  private redimension?: ResizeObserver;

  ngAfterViewInit(): void {
    this.medir();

    this.observador = new MutationObserver(() => this.medir());
    this.observador.observe(this.el.nativeElement, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true,
      childList: true,
    });

    if (typeof ResizeObserver !== 'undefined') {
      this.redimension = new ResizeObserver(() => this.medir());
      this.redimension.observe(this.el.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
    this.redimension?.disconnect();
  }

  /** Publico para poder ejercitarlo desde los tests. */
  medir(): void {
    const nav = this.el.nativeElement;
    const activo = nav.querySelector<HTMLElement>('.activo');

    if (!activo) {
      nav.style.setProperty('--w', '0px');
      return;
    }

    nav.style.setProperty('--x', `${activo.offsetLeft}px`);
    nav.style.setProperty('--w', `${activo.offsetWidth}px`);
  }
}
