import { afterNextRender, DestroyRef, Directive, ElementRef, inject, signal } from '@angular/core';
@Directive({
  selector: 'img[appAsyncImage]',
  host: {
    '[attr.decoding]': '"async"',
    '[class.async-image-pending]': 'pending()',
    '(load)': 'loaded()',
    '(error)': 'failed()',
  },
})
export class AsyncImage {
  readonly pending = signal(true);
  private readonly element = inject(ElementRef<HTMLImageElement>);
  private parent: HTMLElement | null = null;
  private destroyed = false;
  private decoding = false;
  constructor() {
    afterNextRender(() => {
      this.parent = this.element.nativeElement.parentElement;
      if (this.pending()) this.parent?.classList.add('image-loading');
      if (this.element.nativeElement.complete && this.element.nativeElement.naturalWidth)
        this.loaded();
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.parent?.classList.remove('image-loading');
    });
  }
  async loaded() {
    if (this.decoding || !this.pending()) return;
    this.decoding = true;
    try {
      await this.element.nativeElement.decode?.();
    } catch {
      /* The normal error handler owns missing-image fallbacks. */
    }
    if (!this.destroyed) {
      this.pending.set(false);
      this.parent?.classList.remove('image-loading');
    }
  }
  failed() {
    this.pending.set(false);
    this.parent?.classList.remove('image-loading');
  }
}
