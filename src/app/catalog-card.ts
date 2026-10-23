import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CatalogCard } from './catalog.service';
import { AsyncImage } from './async-image';
import { thumbnailUrl } from './thumbnail';

@Component({
  selector: 'app-catalog-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, RouterLink, AsyncImage],
  templateUrl: './catalog-card.html',
  styleUrl: './catalog-card.css',
  host: { '[class.list]': 'list()' },
})
export class CatalogCardItem {
  readonly card = input.required<CatalogCard>();
  readonly edition = input.required<string>();
  readonly list = input(false);
  readonly failed = signal(false);
  readonly original = signal(false);
  readonly imageSource = computed(() => {
    const url = this.card().imageUrl;
    return url ? (this.original() ? url : thumbnailUrl(url)) : null;
  });
  readonly offerQuery = computed(() => ({
    card: this.card().nameEn,
    edition: this.edition(),
    number: this.card().number,
  }));
  imageFailed() {
    if (!this.original()) this.original.set(true);
    else this.failed.set(true);
  }
}
