import { Component, computed, inject, signal, ElementRef, viewChild } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, TimeoutError } from 'rxjs';
import { PricesService, SearchQuery, SearchResult } from './prices.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: { '(document:click)': 'closeQualityOutside($event)' },
})
export class App {
  private readonly qualitySelect = viewChild<ElementRef<HTMLDetailsElement>>('qualitySelect');
  closeQualityOutside(event: Event): void {
    const select = this.qualitySelect()?.nativeElement;
    if (select && event.target instanceof Node && !select.contains(event.target))
      select.open = false;
  }
  private readonly prices = inject(PricesService);
  readonly loading = signal(false);
  readonly imageFailed = signal(false);
  readonly failedStoreLogos = signal(new Set<string>());
  storeLogoFailed(url: string): void {
    this.failedStoreLogos.update((failed) => new Set([...failed, url]));
  }
  readonly result = signal<SearchResult | null>(null);
  readonly error = signal('');
  readonly editionChoices = signal<Array<{ name: string; number: string; edition: string }>>([]);
  readonly validation = signal('');
  readonly sort = signal('price_asc');
  readonly page = signal(1);
  readonly pageSize = 20;
  readonly qualities = ['M', 'NM', 'SP', 'MP', 'HP', 'D'];
  toggleQuality(quality: string): void {
    this.query.quality = this.query.quality.includes(quality)
      ? this.query.quality.filter((value) => value !== quality)
      : [...this.query.quality, quality];
  }
  readonly states = [
    'AC',
    'AL',
    'AP',
    'AM',
    'BA',
    'CE',
    'DF',
    'ES',
    'GO',
    'MA',
    'MT',
    'MS',
    'MG',
    'PA',
    'PB',
    'PR',
    'PE',
    'PI',
    'RJ',
    'RN',
    'RS',
    'RO',
    'RR',
    'SC',
    'SP',
    'SE',
    'TO',
  ];
  query: SearchQuery = this.emptyQuery();
  readonly offers = computed(() =>
    [...(this.result()?.offers ?? [])].sort((a, b) => {
      const stock = this.sort() === 'stock_desc';
      const x = stock ? a.stock : a.price;
      const y = stock ? b.stock : b.price;
      if (x === null) return y === null ? 0 : 1;
      if (y === null) return -1;
      return this.sort() === 'price_asc' ? x - y : y - x;
    }),
  );
  readonly visibleOffers = computed(() =>
    this.offers().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize),
  );
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.offers().length / this.pageSize)),
  );
  readonly firstItem = computed(() =>
    this.offers().length ? (this.page() - 1) * this.pageSize + 1 : 0,
  );
  readonly lastItem = computed(() => Math.min(this.page() * this.pageSize, this.offers().length));
  readonly stats = computed(() => {
    const offers = this.offers();
    const prices = offers.flatMap((o) => (o.price === null ? [] : [o.price]));
    return {
      min: prices.length ? Math.min(...prices) : null,
      average: prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : null,
      stores: new Set(offers.flatMap((o) => (o.storeId === null ? [] : [o.storeId]))).size,
      stock: offers.reduce((sum, offer) => sum + (offer.stock ?? 0), 0),
      unknownStock: offers.filter((o) => o.stock === null).length,
    };
  });
  search(): void {
    const select = this.qualitySelect()?.nativeElement;
    if (select) select.open = false;
    if (this.loading()) return;
    this.validation.set('');
    const query = { ...this.query, card: this.query.card.trim() };
    if (!query.card) {
      this.validation.set('Informe o nome da carta para buscar.');
      return;
    }
    if (query.number && !/^\d+(?:\/\d+)?$/.test(query.number.trim())) {
      this.validation.set('Use um número como 132 ou 132/128.');
      return;
    }
    if (
      (query.minPrice != null && query.minPrice < 0) ||
      (query.maxPrice != null && query.maxPrice < 0) ||
      (query.minStock != null && (!Number.isInteger(query.minStock) || query.minStock < 0))
    ) {
      this.validation.set(
        'Preços devem ser positivos e estoque deve ser um inteiro a partir de zero.',
      );
      return;
    }
    if (query.minPrice != null && query.maxPrice != null && query.minPrice > query.maxPrice) {
      this.validation.set('O preço mínimo deve ser menor ou igual ao máximo.');
      return;
    }
    this.loading.set(true);
    this.failedStoreLogos.set(new Set());
    this.editionChoices.set([]);
    this.imageFailed.set(false);
    this.result.set(null);
    this.error.set('');
    this.page.set(1);
    this.prices
      .search(query)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => this.result.set(result),
        error: (error: unknown) => {
          if (error instanceof TimeoutError)
            this.error.set(
              'A consulta demorou mais que o esperado. Tente novamente em alguns instantes.',
            );
          else if (error instanceof HttpErrorResponse) {
            if (error.status === 409 && Array.isArray(error.error?.details)) {
              this.editionChoices.set(
                error.error.details.flatMap((item: unknown) => {
                  if (
                    item &&
                    typeof item === 'object' &&
                    'name' in item &&
                    'number' in item &&
                    'edition' in item &&
                    typeof item.name === 'string' &&
                    typeof item.number === 'string' &&
                    typeof item.edition === 'string'
                  ) {
                    return [{ name: item.name, number: item.number, edition: item.edition }];
                  }
                  return [];
                }),
              );
            }
            const messages: Record<number, string> = {
              0: 'Não foi possível conectar à API. Verifique se o backend está rodando na porta 3000.',
              400: 'Confira o nome da carta e os filtros informados.',
              404: 'Carta não encontrada. Confira o nome e a numeração.',
              409: 'Encontramos mais de uma edição. Informe o nome completo, o número e a edição da carta.',
              429: 'Limite de consultas atingido. Aguarde um minuto antes de tentar novamente.',
              502: 'A consulta à Liga Pokémon falhou. Tente novamente em alguns instantes.',
              503: 'O portal está indisponível para consulta no momento. Tente novamente mais tarde.',
              504: 'O portal demorou para responder. Tente novamente em alguns instantes.',
            };
            this.error.set(
              this.editionChoices().length
                ? 'As variações de numeração encontraram edições diferentes. Escolha a carta desejada abaixo.'
                : (messages[error.status] ?? 'Não foi possível realizar a busca. Tente novamente.'),
            );
          } else this.error.set('A resposta da API não pôde ser processada. Tente novamente.');
        },
      });
  }
  example(card: string, edition: string, number: string): void {
    this.query = { ...this.emptyQuery(), card, edition, number };
    this.search();
  }
  clear(): void {
    this.failedStoreLogos.set(new Set());
    this.editionChoices.set([]);
    this.imageFailed.set(false);
    this.query = this.emptyQuery();
    this.result.set(null);
    this.error.set('');
    this.validation.set('');
    this.page.set(1);
  }
  changeSort(value: string): void {
    this.sort.set(value);
    this.page.set(1);
  }
  chooseEdition(card: { name: string; number: string; edition: string }): void {
    this.query = { ...this.query, card: card.name, number: card.number, edition: card.edition };
    this.search();
  }
  safeUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' &&
        ['www.ligapokemon.com.br', 'ligapokemon.com.br'].includes(parsed.hostname)
        ? parsed.href
        : null;
    } catch {
      return null;
    }
  }
  safeImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' &&
        !parsed.username &&
        !parsed.password &&
        ['repositorio.sbrauble.com', 'www.ligapokemon.com.br', 'ligapokemon.com.br'].includes(
          parsed.hostname,
        )
        ? parsed.href
        : null;
    } catch {
      return null;
    }
  }
  private emptyQuery(): SearchQuery {
    return {
      card: '',
      edition: '',
      number: '',
      quality: [],
      finish: '',
      language: '',
      state: '',
      minPrice: null,
      maxPrice: null,
      minStock: null,
    };
  }
}
