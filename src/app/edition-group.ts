import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  effect,
  untracked,
  inject,
  DestroyRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Edition } from './catalog.service';
import { ProgressiveRender } from './progressive-render';
import { LoadMore } from './load-more';
import { AsyncImage } from './async-image';

export interface EditionGroupData {
  key: string;
  title: string;
  editions: Edition[];
}
@Component({
  selector: 'app-edition-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LoadMore, AsyncImage],
  template: `<section class="year-group">
    <div class="year-heading">
      <h2>{{ group().title }}</h2>
      <span>{{ group().editions.length }} edições</span>
    </div>
    <div class="edition-rows" [attr.aria-busy]="loading()">
      @for (edition of rows(); track edition.id) {
        <a
          class="edition-row"
          [class.subset]="edition.parentId && hierarchical()"
          [routerLink]="['/edicoes', edition.id]"
        >
          <span class="edition-symbol">
            @if (edition.imageUrl && !failedImages().has(edition.id)) {
              <img
                appAsyncImage
                [src]="edition.imageUrl"
                alt=""
                loading="lazy"
                decoding="async"
                width="32"
                height="27"
                (error)="imageFailed(edition.id)"
              />
            } @else {
              ◇
            }
          </span>
          <span class="edition-name"
            >{{ language() === 'en' ? edition.nameEn : edition.name
            }}<small>{{ edition.code }}</small></span
          >
          <span class="edition-arrow" aria-hidden="true">↗</span>
        </a>
      }
      @if (loading()) {
        @for (slot of skeletons(); track slot) {
          <div class="edition-row skeleton" aria-hidden="true"><span></span><span></span></div>
        }
      }
    </div>
    @if (rows().length < group().editions.length) {
      <div appLoadMore [loadMoreRefresh]="loading() ? -1 : limit()" (nearEnd)="loadMore()">
        <button class="show-more" [disabled]="loading()" (click)="loadMore()">
          {{ loading() ? 'Carregando edições…' : 'Mostrar mais edições' }} · {{ rows().length }} /
          {{ group().editions.length }}
        </button>
      </div>
    }
  </section>`,
  styleUrl: './edition-group.css',
})
export class EditionGroup {
  readonly group = input.required<EditionGroupData>();
  readonly language = input('pt');
  readonly hierarchical = input(true);
  readonly limit = signal(0);
  readonly target = signal(20);
  readonly loading = signal(false);
  readonly failedImages = signal(new Set<string>());
  readonly rows = computed(() => this.group().editions.slice(0, this.limit()));
  readonly skeletons = computed(() =>
    Array.from({ length: this.target() - this.limit() }, (_, i) => i),
  );
  private readonly renderer = new ProgressiveRender();
  constructor() {
    effect(() => {
      this.group();
      untracked(() => {
        this.renderer.cancel();
        this.limit.set(0);
        this.loading.set(false);
        this.loadMore();
      });
    });
    inject(DestroyRef).onDestroy(() => this.renderer.cancel());
  }
  loadMore() {
    if (this.loading() || this.limit() >= this.group().editions.length) return;
    this.loading.set(true);
    this.target.set(Math.min(this.limit() + 20, this.group().editions.length));
    this.renderer.run(
      () => {
        this.limit.update((n) => Math.min(n + 2, this.target()));
        return this.limit() < this.target();
      },
      () => this.loading.set(false),
    );
  }
  imageFailed(id: string) {
    this.failedImages.update((ids) => new Set([...ids, id]));
  }
}
