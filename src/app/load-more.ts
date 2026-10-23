import {
  afterNextRender,
  afterRenderEffect,
  input,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  output,
} from '@angular/core';
@Directive({ selector: '[appLoadMore]' })
export class LoadMore {
  readonly nearEnd = output<void>();
  readonly refresh = input(0, { alias: 'loadMoreRefresh' });
  constructor() {
    const element = inject(ElementRef<HTMLElement>);
    let observer: IntersectionObserver | undefined;
    afterRenderEffect(() => {
      this.refresh();
      if (observer) {
        observer.unobserve(element.nativeElement);
        observer.observe(element.nativeElement);
      }
    });
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') return;
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) this.nearEnd.emit();
        },
        { rootMargin: '300px' },
      );
      observer.observe(element.nativeElement);
    });
    inject(DestroyRef).onDestroy(() => observer?.disconnect());
  }
}
