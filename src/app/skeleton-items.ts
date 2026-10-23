import { Component, computed, input } from '@angular/core';
@Component({
  selector: 'app-skeleton-items',
  host: { 'aria-hidden': 'true' },
  template: `@for (item of items(); track item) {
    <div class="skeleton-item" [class.edition]="mode() === 'editions'">
      @if (mode() === 'cards') {
        <div class="skeleton-image"></div>
      }
      <span class="skeleton-line short"></span><span class="skeleton-line"></span
      ><span class="skeleton-line"></span>
      @if (mode() === 'editions') {
        <span class="skeleton-line"></span><span class="skeleton-line"></span
        ><span class="skeleton-line"></span><span class="skeleton-line"></span>
      }
    </div>
  }`,
  styles: `
    :host {
      display: contents;
    }
    .skeleton-item {
      padding: 18px;
      border: 1px solid #e1e7d9;
      border-radius: 10px;
      background: white;
      min-width: 0;
      animation: pulse 1s ease-in-out infinite alternate;
      contain: layout paint;
    }
    .skeleton-image {
      aspect-ratio: 0.72;
      background: #edf1e8;
      border-radius: 6px;
      margin-bottom: 22px;
    }
    .skeleton-line {
      display: block;
      height: 12px;
      margin: 18px 0;
      background: #edf1e8;
      border-radius: 4px;
    }
    .skeleton-line.short {
      width: 60%;
    }
    .edition {
      padding: 26px;
    }
    .edition .skeleton-line {
      height: 16px;
      margin: 28px 0;
    }
    @keyframes pulse {
      to {
        opacity: 0.55;
      }
    }
  `,
})
export class SkeletonItems {
  readonly count = input(8);
  readonly mode = input<'cards' | 'editions'>('cards');
  readonly items = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
