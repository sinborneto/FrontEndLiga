import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { registerLocaleData } from '@angular/common';
import pt from '@angular/common/locales/pt';
import { App } from './app';
import { Offer, SearchResult } from './prices.service';

registerLocaleData(pt);
const offer = (price: number | null, stock: number | null = 1): Offer => ({
  offerId: 1,
  storeId: 2,
  store: 'Loja teste',
  city: 'Curitiba',
  state: 'PR',
  price,
  originalPrice: null,
  stock,
  quality: 'NM',
  finish: 'Foil',
  language: 'Português',
  url: 'https://www.ligapokemon.com.br/?view=mp/showcase/home&id=2',
});
const result = (offers: Offer[]): SearchResult => ({
  card: { name: 'Articuno', number: '132/128', edition: '30C' },
  source: 'Liga Pokémon',
  totalOffers: offers.length,
  collectedAt: '2026-10-23T12:00:00.000Z',
  offers,
  diagnostics: {
    pricesDecoded: offers.length,
    pricesPending: 0,
    stocksDecoded: offers.length,
    stocksPending: 0,
    messages: [],
  },
});

describe('Busca de ofertas', () => {
  let fixture: ComponentFixture<App>;
  let app: App;
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  it('não consulta com nome vazio ou intervalo inválido', () => {
    app.search();
    expect(app.validation()).toContain('nome');
    app.query.card = 'Articuno';
    app.query.minPrice = 20;
    app.query.maxPrice = 10;
    app.search();
    expect(app.validation()).toContain('mínimo');
    http.expectNone((r) => r.url === '/api/cards/prices');
  });
  it('valida numeração e estoque inteiro', () => {
    app.query.card = 'Articuno';
    app.query.number = 'abc';
    app.search();
    expect(app.validation()).toContain('132/128');
    app.query.number = '';
    app.query.minStock = 1.5;
    app.search();
    expect(app.validation()).toContain('inteiro');
    http.expectNone((r) => r.url === '/api/cards/prices');
  });
  it('envia filtros, preserva zero, bloqueia duplicatas e renderiza preços em reais', async () => {
    Object.assign(app.query, { card: ' Articuno ', minPrice: 0, minStock: 0, state: 'PR' });
    app.search();
    app.search();
    expect(app.loading()).toBe(true);
    const req = http.expectOne((r) => r.url === '/api/cards/prices');
    expect(req.request.params.get('card')).toBe('Articuno');
    expect(req.request.params.get('minPrice')).toBe('0');
    expect(req.request.params.get('minStock')).toBe('0');
    expect(req.request.params.get('state')).toBe('PR');
    expect(req.request.params.has('edition')).toBe(false);
    req.flush(result([offer(39.9)]));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(app.loading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('39,90');
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(1);
  });
  it('mantém valores desconhecidos por último em todas as ordenações', () => {
    app.result.set(result([offer(null, null), offer(40, 1), offer(10, 5)]));
    expect(app.offers().map((o) => o.price)).toEqual([10, 40, null]);
    app.changeSort('price_desc');
    expect(app.offers().map((o) => o.price)).toEqual([40, 10, null]);
    app.changeSort('stock_desc');
    expect(app.offers().map((o) => o.stock)).toEqual([5, 1, null]);
    expect(app.stats()).toMatchObject({
      min: 10,
      average: 25,
      stores: 1,
      stock: 6,
      unknownStock: 1,
    });
  });
  it('não transforma preço e estoque desconhecidos em zero na tabela', () => {
    app.result.set(result([offer(null, null)]));
    fixture.detectChanges();
    const cells = fixture.nativeElement.querySelectorAll('tbody td');
    expect(cells[1].textContent.trim()).toBe('—');
    expect(cells[2].textContent.trim()).toBe('—');
    expect(app.stats().min).toBeNull();
    expect(app.stats().average).toBeNull();
  });
  it('pagina ofertas e volta à primeira página ao ordenar', () => {
    app.result.set(result(Array.from({ length: 23 }, (_, i) => offer(i))));
    expect(app.visibleOffers()).toHaveLength(20);
    app.page.set(2);
    expect(app.visibleOffers()).toHaveLength(3);
    expect(app.firstItem()).toBe(21);
    expect(app.lastItem()).toBe(23);
    app.changeSort('price_desc');
    expect(app.page()).toBe(1);
  });
  it('mostra mensagem específica para edição ambígua e permite tentar novamente', () => {
    app.query.card = 'Articuno';
    app.search();
    http
      .expectOne((r) => r.url === '/api/cards/prices')
      .flush({ error: 'AMBIGUOUS' }, { status: 409, statusText: 'Conflict' });
    expect(app.error()).toContain('edição');
    expect(app.loading()).toBe(false);
    app.search();
    http.expectOne((r) => r.url === '/api/cards/prices').flush(result([]));
    expect(app.error()).toBe('');
    expect(app.result()?.offers).toEqual([]);
  });
  it('mostra orientação quando não há conexão com o backend', () => {
    app.query.card = 'Articuno';
    app.search();
    http.expectOne((r) => r.url === '/api/cards/prices').error(new ProgressEvent('error'));
    expect(app.error()).toContain('porta 3000');
    expect(app.loading()).toBe(false);
  });
  it('informa quando nenhum resultado corresponde aos filtros', () => {
    app.result.set(result([]));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma oferta com esses filtros');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });
  it('abre somente links HTTPS do portal e limpa a busca', () => {
    expect(app.safeUrl('javascript:alert(1)')).toBeNull();
    expect(app.safeUrl('https://ligapokemon.com.br.evil.example/')).toBeNull();
    expect(app.safeUrl('https://www.ligapokemon.com.br/?id=1')).toContain('ligapokemon.com.br');
    app.result.set(result([offer(10)]));
    app.query.card = 'Articuno';
    app.clear();
    expect(app.query.card).toBe('');
    expect(app.result()).toBeNull();
  });
});
