import { Component, computed, input } from '@angular/core';
@Component({
  selector: 'app-skeleton-items',
  host: { 'aria-hidden': 'true', '[class.list]': 'list()' },
  template: `@for (item of items(); track item) {
    <div class="skeleton-item" [class.edition]="mode() === 'editions'">
      @if (mode() === 'cards') {
        <div class="skeleton-image"></div>
      }
      <div class="skeleton-info">
        <span class="skeleton-line short"></span><span class="skeleton-line"></span
        ><span class="skeleton-line"></span>
        @if (mode() === 'editions') {
          <span class="skeleton-line"></span><span class="skeleton-line"></span
          ><span class="skeleton-line"></span><span class="skeleton-line"></span>
        }
      </div>
    </div>
  }`,
  styles: `
    :host {
      display: contents;
    }
    .skeleton-item {
      overflow: hidden;
      border: 1px solid #e1e7d9;
      border-radius: 10px;
      background: white;
      min-width: 0;
      contain: layout paint;
    }
    .skeleton-image {
      aspect-ratio: 0.77;
      background: #edf1e8;
    }
    .skeleton-info {
      height: 188px;
      padding: 14px;
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
    .edition .skeleton-info {
      height: auto;
    }
    :host(.list) .skeleton-item {
      display: flex;
    }
    :host(.list) .skeleton-image {
      width: 110px;
      flex-shrink: 0;
      aspect-ratio: 0.72;
    }
    :host(.list) .skeleton-info {
      flex: 1;
      height: auto;
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
  readonly list = input(false);
  readonly items = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
