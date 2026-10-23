import {
  Component,
  input,
  output,
  signal,
  computed,
  afterNextRender,
  viewChild,
  ElementRef,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ProgressiveRender } from './progressive-render';
import { AsyncImage } from './async-image';
import { thumbnailUrl } from './thumbnail';
import { PricesService } from './prices.service';
export interface CardChoice {
  name: string;
  number: string;
  edition: string;
  displayName?: string;
  editionName?: string | null;
  imageUrl?: string | null;
  kind?: 'card' | 'product';
  available?: boolean | null;
  url?: string | null;
}
@Component({
  selector: 'app-card-choices',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncImage],
  template: `<section class="choices-panel" aria-labelledby="choices-heading">
    <div class="choices-heading">
      <div>
        <span class="eyebrow">VERSÕES ENCONTRADAS</span>
        <h2 id="choices-heading">Qual item você está procurando?</h2>
        <p>
          {{ allChoices().length }} itens carregados{{ cursor() ? ' · há mais resultados' : '' }}.
          Selecione uma carta para consultar ofertas ou abra um produto na Liga.
        </p>
      </div>
      <span class="count">{{ allChoices().length }}{{ cursor() ? '+' : '' }} itens</span>
    </div>
    <div class="edition-choices">
      @for (card of visibleChoices(); track card.name + ':' + card.number + ':' + card.edition) {
        <button
          [class.unavailable]="card.available === false"
          type="button"
          (click)="selected.emit(card)"
          [attr.aria-label]="
            'Selecionar ' +
            (card.displayName || card.name) +
            ' ' +
            card.number +
            ' edição ' +
            card.edition +
            (card.available === false ? ' — indisponível' : '')
          "
        >
          <span class="choice-image">
            @if (card.imageUrl && !failedImages().has(card.imageUrl!)) {
              <img
                appAsyncImage
                [src]="imageSource(card.imageUrl!)"
                [alt]="(card.displayName || card.name) + ' (' + card.number + ') — ' + card.edition"
                loading="lazy"
                decoding="async"
                width="250"
                height="350"
                (error)="imageFailed(card.imageUrl!)"
              />
            } @else {
              <span>Imagem indisponível</span>
            }
          </span>
          <span class="choice-info"
            ><span class="choice-meta"
              ><b>{{ card.kind === 'product' ? 'Produto' : card.edition }}</b
              ><span>{{ card.number }}</span></span
            ><strong>{{ card.displayName || card.name }}</strong>
            @if (card.displayName && card.displayName !== card.name) {
              <span class="english-name">{{ card.name }}</span>
            }
            <span class="edition-name">{{
              card.editionName || (card.kind === 'product' ? 'Produto / acessório' : card.edition)
            }}</span>
            @if (card.available === false) {
              <span class="availability">Indisponível</span>
            }
            <span class="choose-action"
              >{{ card.kind === 'product' ? 'Ver produto na Liga' : 'Ver ofertas' }}
              <span aria-hidden="true">↗</span></span
            ></span
          >
        </button>
      }
      @if (loadingMore() || loadingPage() || !visibleChoices().length) {
        @for (skeleton of skeletons(); track skeleton) {
          <div class="choice-skeleton" aria-hidden="true">
            <span class="skeleton-image"></span
            ><span class="skeleton-info"
              ><span class="skeleton-line"></span><span class="skeleton-line short"></span
              ><span class="skeleton-line"></span
            ></span>
          </div>
        }
      }
    </div>
    <p class="shown-count" aria-live="polite">
      Exibindo {{ visibleChoices().length }} itens{{ cursor() ? ' · role para carregar mais' : '' }}
    </p>
    @if (hasMore()) {
      <div #loadMoreSentinel class="load-more-sentinel">
        @if (loadingMore() || loadingPage()) {
          <p class="more-status" role="status">
            <span class="spinner"></span>Carregando mais cartas…
          </p>
        }
        @if (pageError()) {
          <p role="alert">{{ pageError() }}</p>
        }
        <button
          class="load-more"
          type="button"
          [disabled]="loadingMore() || loadingPage()"
          (click)="loadMore()"
        >
          Mostrar mais cartas
        </button>
      </div>
    }
  </section>`,
  styleUrl: './card-choices.css',
})
export class CardChoices {
  readonly choices = input.required<CardChoice[]>();
  readonly nextCursor = input<string | null>(null);
  readonly cursor = signal<string | null>(null);
  readonly extraChoices = signal<CardChoice[]>([]);
  readonly allChoices = computed(() => [...this.choices(), ...this.extraChoices()]);
  readonly loadingPage = signal(false);
  readonly pageError = signal('');
  private readonly api = inject(PricesService);
  private readonly destroyRef = inject(DestroyRef);
  readonly hasMore = computed(() => this.limit() < this.allChoices().length || !!this.cursor());
  readonly selected = output<CardChoice>();
  readonly failedImages = signal(new Set<string>());
  readonly failedThumbnails = signal(new Set<string>());
  imageSource(url: string) {
    return this.failedThumbnails().has(url) ? url : thumbnailUrl(url);
  }
  readonly limit = signal(0);
  readonly target = signal(20);
  readonly skeletons = computed(() =>
    Array.from(
      {
        length: this.loadingPage()
          ? 20
          : Math.max(0, Math.min(this.target(), this.allChoices().length) - this.limit()),
      },
      (_, i) => i,
    ),
  );
  readonly loadingMore = signal(false);
  readonly visibleChoices = computed(() => this.allChoices().slice(0, this.limit()));
  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('loadMoreSentinel');
  private observer?: IntersectionObserver;
  private readonly renderer = new ProgressiveRender();
  constructor() {
    afterNextRender(() => {
      this.cursor.set(this.nextCursor());
      this.loadMore();
      const sentinel = this.sentinel()?.nativeElement;
      if (sentinel && typeof IntersectionObserver !== 'undefined') {
        this.observer = new IntersectionObserver(
          (entries) => {
            if (!this.pageError() && entries.some((entry) => entry.isIntersecting)) this.loadMore();
          },
          { rootMargin: '300px' },
        );
        this.observer.observe(sentinel);
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.observer?.disconnect();
      this.renderer.cancel();
    });
  }
  loadMore() {
    if (this.loadingMore() || this.loadingPage()) return;
    if (this.limit() >= this.allChoices().length) {
      const cursor = this.cursor();
      if (!cursor) return;
      this.loadingPage.set(true);
      this.pageError.set('');
      const subscription = this.api.searchPage(cursor).subscribe({
        next: (page) => {
          this.extraChoices.update((items) => [...items, ...page.items]);
          this.cursor.set(page.nextCursor);
          this.loadingPage.set(false);
          this.loadMore();
        },
        error: (error) => {
          this.loadingPage.set(false);
          this.pageError.set(
            error.error?.error === 'PORTAL_RATE_LIMITED'
              ? 'A Liga limitou as consultas. Aguarde antes de tentar novamente.'
              : error.status === 410
                ? 'A busca expirou. Faça a pesquisa novamente.'
                : 'Não foi possível carregar mais itens. Tente novamente.',
          );
        },
      });
      this.destroyRef.onDestroy(() => subscription.unsubscribe());
      return;
    }
    this.loadingMore.set(true);
    this.target.set(Math.min(this.limit() + 20, this.allChoices().length));
    this.renderer.run(
      () => {
        this.limit.update((limit) => Math.min(limit + 2, this.target()));
        return this.limit() < this.target();
      },
      () => {
        this.loadingMore.set(false);
        const sentinel = this.sentinel()?.nativeElement;
        if (sentinel && this.observer) {
          this.observer.unobserve(sentinel);
          this.observer.observe(sentinel);
        }
      },
    );
  }
  imageFailed(url: string) {
    if (!this.failedThumbnails().has(url)) {
      this.failedThumbnails.update((images) => new Set([...images, url]));
      return;
    }
    this.failedImages.update((images) => new Set([...images, url]));
  }
}
