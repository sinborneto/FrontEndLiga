import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
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

export const catalogText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
@Component({
  selector: 'app-catalog',
  imports: [FormsModule, RouterLink, CurrencyPipe, DatePipe],
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
  readonly expandedYears = signal(new Set<string>());
  readonly allYears = signal(false);
  readonly name = signal('');
  readonly rarities = signal<string[]>([]);
  readonly energies = signal<string[]>([]);
  readonly order = signal('name');
  readonly view = signal('grid');
  readonly limit = signal(24);
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
  readonly groups = computed(() => {
    const rows = this.matchingEditions();
    if (this.editionOrder() === 'name')
      return [
        {
          key: 'all',
          title: 'Todas as edições',
          editions: [...rows].sort((a, b) =>
            this.editionName(a).localeCompare(this.editionName(b), 'pt-BR'),
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
        const seen = new Set<string>();
        const ordered: Edition[] = [];
        const append = (entry: Edition) => {
          if (seen.has(entry.id)) return;
          seen.add(entry.id);
          ordered.push(entry);
          entries.filter((e) => e.parentId === entry.id).forEach(append);
        };
        entries.filter((e) => !e.parentId || !ids.has(e.parentId)).forEach(append);
        entries.forEach(append);
        return { key: String(year), title: String(year || 'Sem data'), editions: ordered };
      });
    return this.allYears() || this.editionSearch() || this.year() ? groups : groups.slice(0, 6);
  });
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
          ? a.number.localeCompare(b.number, 'pt-BR', { numeric: true })
          : this.order() === 'price'
            ? (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity) ||
              a.name.localeCompare(b.name, 'pt-BR')
            : a.name.localeCompare(b.name, 'pt-BR') ||
              a.number.localeCompare(b.number, 'pt-BR', { numeric: true }),
      );
  });
  readonly visibleCards = computed(() => this.filteredCards().slice(0, this.limit()));
  readonly activeFilters = computed(
    () => this.rarities().length + this.energies().length + (this.name() ? 1 : 0),
  );
  readonly addPage = (value: number) => value + 24;
  routeLabel() {
    return this.route.snapshot.paramMap.has('id') ? 'cartas da edição' : 'edições';
  }
  constructor() {
    combineLatest([this.route.paramMap, this.retry.pipe(startWith(undefined))])
      .pipe(
        switchMap(([params]) => {
          this.loading.set(true);
          this.error.set('');
          this.data.set(null);
          this.editions.set([]);
          this.clearFilters();
          this.failedImages.set(new Set());
          const id = params.get('id');
          const request = id
            ? this.api.cards(id).pipe(
                tap((data) => this.data.set(data)),
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
  groupRows(group: { key: string; editions: Edition[] }) {
    return this.expandedYears().has(group.key) || !!this.editionSearch()
      ? group.editions
      : group.editions.slice(0, 12);
  }
  expandYear(key: string) {
    this.expandedYears.update((values) => new Set([...values, key]));
  }
  toggle(field: 'rarities' | 'energies', value: string) {
    this[field].update((selected) =>
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    );
    this.limit.set(24);
  }
  clearFilters() {
    this.name.set('');
    this.rarities.set([]);
    this.energies.set([]);
    this.limit.set(24);
  }
  imageFailed(id: string) {
    this.failedImages.update((values) => new Set([...values, id]));
  }
  offerQuery(card: CatalogCard) {
    return { card: card.nameEn, edition: this.data()!.edition.code, number: card.number };
  }
}
