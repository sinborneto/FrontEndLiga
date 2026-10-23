import {
  Component,
  computed,
  inject,
  signal,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  catchError,
  combineLatest,
  EMPTY,
  finalize,
  startWith,
  Subject,
  switchMap,
  tap,
  map,
} from 'rxjs';
import { CatalogCard, CatalogService, Edition, EditionCards } from './catalog.service';
import { LoadMore } from './load-more';
import { SkeletonItems } from './skeleton-items';
import { ProgressiveRender } from './progressive-render';
import { CatalogCardItem } from './catalog-card';
import { EditionGroup } from './edition-group';

const names = new Intl.Collator('pt-BR');
const numbers = new Intl.Collator('pt-BR', { numeric: true });

export const catalogText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
@Component({
  selector: 'app-catalog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    DatePipe,
    LoadMore,
    SkeletonItems,
    CatalogCardItem,
    EditionGroup,
  ],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
})
export class Catalog {
  private readonly api = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly retry = new Subject<void>();
  readonly loading = signal(false);
  readonly error = signal('');
  readonly editions = signal<Edition[]>([]);
  readonly data = signal<EditionCards | null>(null);
  readonly editionSearch = signal('');
  readonly year = signal('');
  readonly language = signal('pt');
  readonly editionOrder = signal('year');
  readonly yearLimit = signal(2);
  readonly loadingCards = signal(false);
  readonly loadingYears = signal(false);
  private readonly cardRenderer = new ProgressiveRender();
  private readonly yearRenderer = new ProgressiveRender();
  readonly cardTarget = signal(20);
  readonly name = signal('');
  readonly rarities = signal<string[]>([]);
  readonly energies = signal<string[]>([]);
  readonly order = signal('name');
  readonly view = signal('grid');
  readonly limit = signal(0);
  readonly failedImages = signal(new Set<string>());
  readonly years = computed(() =>
    [...new Set(this.editions().map((e) => e.year))].sort((a, b) => b - a),
  );
  readonly matchingEditions = computed(() => {
    const search = catalogText(this.editionSearch());
    return this.editions().filter(
      (e) =>
        (!this.year() || String(e.year) === this.year()) &&
        (!search || catalogText(`${e.name} ${e.nameEn} ${e.code}`).includes(search)),
    );
  });
  readonly totalYearGroups = computed(
    () => new Set(this.matchingEditions().map((e) => e.year)).size,
  );
  readonly allGroups = computed(() => {
    const rows = this.matchingEditions();
    if (this.editionOrder() === 'name')
      return [
        {
          key: 'all',
          title: 'Todas as edições',
          editions: [...rows].sort((a, b) =>
            names.compare(this.editionName(a), this.editionName(b)),
          ),
        },
      ];
    const groups = [...new Set(rows.map((e) => e.year))]
      .sort((a, b) => b - a)
      .map((year) => {
        const entries = rows
          .filter((e) => e.year === year)
          .sort((a, b) => (b.releasedAt ?? '').localeCompare(a.releasedAt ?? ''));
        const ids = new Set(entries.map((e) => e.id));
        const children = new Map<string, Edition[]>();
        for (const entry of entries) {
          if (!entry.parentId) continue;
          const siblings = children.get(entry.parentId) ?? [];
          siblings.push(entry);
          children.set(entry.parentId, siblings);
        }
        const seen = new Set<string>();
        const ordered: Edition[] = [];
        const append = (entry: Edition) => {
          if (seen.has(entry.id)) return;
          seen.add(entry.id);
          ordered.push(entry);
          children.get(entry.id)?.forEach(append);
        };
        entries.filter((e) => !e.parentId || !ids.has(e.parentId)).forEach(append);
        entries.forEach(append);
        return { key: String(year), title: String(year || 'Sem data'), editions: ordered };
      });
    return groups;
  });
  readonly groups = computed(() => this.allGroups().slice(0, this.yearLimit()));
  readonly facets = computed(() => {
    const cards = this.data()?.cards ?? [];
    const count = (values: string[]) =>
      [...new Set(values)]
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .map((label) => ({ label, count: values.filter((v) => v === label).length }));
    return {
      rarities: count(cards.flatMap((c) => (c.rarity ? [c.rarity] : []))),
      energies: count(cards.flatMap((c) => c.energies)),
    };
  });
  readonly filteredCards = computed(() => {
    const text = catalogText(this.name());
    return [...(this.data()?.cards ?? [])]
      .filter(
        (c) =>
          (!text || catalogText(`${c.name} ${c.nameEn} ${c.number}`).includes(text)) &&
          (!this.rarities().length || (!!c.rarity && this.rarities().includes(c.rarity))) &&
          (!this.energies().length || c.energies.some((e) => this.energies().includes(e))),
      )
      .sort((a, b) =>
        this.order() === 'number'
          ? numbers.compare(a.number, b.number)
          : this.order() === 'price'
            ? (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity) || names.compare(a.name, b.name)
            : names.compare(a.name, b.name) || numbers.compare(a.number, b.number),
      );
  });
  readonly visibleCards = computed(() => this.filteredCards().slice(0, this.limit()));
  readonly activeFilters = computed(
    () => this.rarities().length + this.energies().length + (this.name() ? 1 : 0),
  );
  routeLabel() {
    return this.route.snapshot.paramMap.has('id') ? 'cartas da edição' : 'edições';
  }
  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelRenders());
    combineLatest([this.route.paramMap, this.retry.pipe(startWith(undefined))])
      .pipe(
        switchMap(([params]) => {
          this.cancelRenders();
          this.loading.set(true);
          this.error.set('');
          this.data.set(null);
          this.editions.set([]);
          this.yearLimit.set(2);
          this.clearFilters();
          this.failedImages.set(new Set());
          const id = params.get('id');
          const request = id
            ? this.api.cards(id).pipe(
                tap((data) => {
                  this.data.set(data);
                  this.loadCards();
                }),
                map(() => undefined),
              )
            : this.api.editions().pipe(
                tap((data) => this.editions.set(data.editions)),
                map(() => undefined),
              );
          return request.pipe(
            catchError((error) => {
              this.error.set(
                error.status === 404
                  ? 'Esta edição não foi encontrada.'
                  : 'Não foi possível carregar o catálogo da Liga. Tente novamente.',
              );
              return EMPTY;
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }
  reload() {
    this.retry.next();
  }
  editionName(edition: Edition) {
    return this.language() === 'en' ? edition.nameEn : edition.name;
  }
  loadCards() {
    if (this.loadingCards() || this.visibleCards().length >= this.filteredCards().length) return;
    this.loadingCards.set(true);
    this.cardTarget.set(Math.min(this.limit() + 20, this.filteredCards().length));
    this.cardRenderer.run(
      () => {
        this.limit.update((limit) => Math.min(limit + 2, this.cardTarget()));
        return this.limit() < this.cardTarget();
      },
      () => this.loadingCards.set(false),
    );
  }
  loadYears() {
    if (this.loadingYears() || this.yearLimit() >= this.totalYearGroups()) return;
    this.loadingYears.set(true);
    const target = Math.min(this.yearLimit() + 2, this.totalYearGroups());
    this.yearRenderer.run(
      () => {
        this.yearLimit.update((limit) => Math.min(limit + 1, target));
        return this.yearLimit() < target;
      },
      () => this.loadingYears.set(false),
    );
  }
  private cancelRenders() {
    this.cardRenderer.cancel();
    this.yearRenderer.cancel();
    this.loadingCards.set(false);
    this.loadingYears.set(false);
  }
  toggle(field: 'rarities' | 'energies', value: string) {
    this[field].update((selected) =>
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    );
    this.refreshCards();
  }
  clearFilters() {
    this.name.set('');
    this.rarities.set([]);
    this.energies.set([]);
    this.refreshCards();
  }
  imageFailed(id: string) {
    this.failedImages.update((values) => new Set([...values, id]));
  }
  refreshCards() {
    this.cardRenderer.cancel();
    this.loadingCards.set(false);
    this.limit.set(0);
    this.loadCards();
  }
  offerQuery(card: CatalogCard) {
    return { card: card.nameEn, edition: this.data()!.edition.code, number: card.number };
  }
}
