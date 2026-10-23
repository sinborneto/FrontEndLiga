import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { registerLocaleData } from '@angular/common';
import pt from '@angular/common/locales/pt';
import { App } from './app';
import { Offer, SearchResult, Auction } from './prices.service';

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

  it('mostra leilões abaixo das lojas sem incluí-los nos resumos de preços e estoque', () => {
    const auction: Auction = {
      auctionId: 1,
      title: 'Pikachu promocional',
      bidPrice: 1000,
      fixedPrice: 1200,
      bidIncrement: 50,
      bids: 0,
      endsAt: '2026-10-23T14:06:02.000Z',
      seller: 'Vini94',
      sellerUrl: 'https://www.ligapokemon.com.br/?view=user&nick=Vini94',
      state: 'RJ',
      referencesCount: 0,
      positivePercent: null,
      acceptsLigaSegura: true,
      quality: 'NM',
      finish: 'Foil Promo',
      language: 'Japonês',
      url: 'https://www.ligapokemon.com.br/?view=leilao/view&id=1',
    };
    app.result.set({
      ...result([]),
      auctions: [auction, { ...auction, auctionId: 2, bidPrice: null, fixedPrice: 330 }],
      totalAuctions: 2,
    });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Nenhuma oferta de loja encontrada');
    expect(fixture.nativeElement.querySelectorAll('.auction-row')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('tbody tr')).toBeNull();
    expect(text).toContain('Lance inicial');
    expect(text).toContain('1.000,00');
    expect(text).toContain('330,00');
    expect(text).toContain('23/10/2026, 11:06');
    expect(app.stats()).toMatchObject({ min: null, average: null, stock: 0, stores: 0 });
    expect(app.filterOptions().language).toEqual(['Japonês']);
    app.result.set(result([offer(10)]));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.auctions-panel')).toBeNull();
  });

  it('monta as opções da busca completa e preserva opções após filtrar e zerar resultados', () => {
    const allOffers = [
      { ...offer(10), state: 'PR', quality: 'NM', finish: 'Foil', language: 'Português' },
      { ...offer(20), state: 'SP', quality: 'HP', finish: 'Normal', language: 'Inglês' },
      { ...offer(30), state: null, quality: null, finish: null, language: null },
      { ...offer(10), state: 'PR', quality: 'NM', finish: 'Foil', language: 'Português' },
    ];
    app.query.card = 'Articuno';
    app.search(true);
    http.expectOne((r) => r.url === '/api/cards/prices').flush(result(allOffers));
    expect(app.filterOptions()).toEqual({
      state: ['PR', 'SP'],
      quality: ['NM', 'HP'],
      finish: ['Foil', 'Normal'],
      language: ['Inglês', 'Português'],
    });
    app.query.state = ['PR', 'SP'];
    app.query.quality = ['NM', 'HP'];
    app.query.finish = ['Foil', 'Normal'];
    app.query.language = ['Português', 'Inglês'];
    app.search();
    const filtered = http.expectOne((r) => r.url === '/api/cards/prices');
    expect(filtered.request.params.get('finish')).toBe('Foil,Normal');
    expect(filtered.request.params.get('language')).toBe('Português,Inglês');
    expect(filtered.request.params.get('state')).toBe('PR,SP');
    filtered.flush(result([allOffers[0]]));
    expect(app.filterOptions().quality).toEqual(['NM', 'HP']);
    expect(app.filterOptions().state).toEqual(['PR', 'SP']);
    app.search();
    http.expectOne((r) => r.url === '/api/cards/prices').flush(result([]));
    expect(app.filterOptions().finish).toEqual(['Foil', 'Normal']);
    app.query.card = 'Outra carta';
    app.search(true);
    const next = http.expectOne((r) => r.url === '/api/cards/prices');
    for (const key of ['quality', 'finish', 'language', 'state'])
      expect(next.request.params.has(key)).toBe(false);
    next.flush(
      result([{ ...offer(10), state: 'RJ', quality: 'M', finish: 'Normal', language: 'Japonês' }]),
    );
    expect(app.filterOptions()).toEqual({
      state: ['RJ'],
      quality: ['M'],
      finish: ['Normal'],
      language: ['Japonês'],
    });
  });

  it('mantém o link da Liga e acrescenta o link para a loja em outra aba', () => {
    app.result.set(result([{ ...offer(10), storeUrl: 'https://www.ligapokemon.com.br/b/?p=e1' }]));
    fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll(
      'tbody .offer-link',
    ) as NodeListOf<HTMLAnchorElement>;
    expect(links).toHaveLength(2);
    expect(links[0].href).toContain('view=mp/showcase/home');
    expect(links[1].href).toBe('https://www.ligapokemon.com.br/b/?p=e1');
    expect(links[1].textContent).toContain('Ir à loja');
    expect(links[1].target).toBe('_blank');
    expect(links[1].rel).toContain('noopener');
  });

  it('exibe o logo da loja e usa iniciais se o arquivo falhar', () => {
    const withLogo = {
      ...offer(10),
      storeLogoUrl: 'https://repositorio.sbrauble.com/arquivos/up/ecom/comparador/loja.jpg',
    };
    app.result.set(result([withLogo, { ...offer(20), storeLogoUrl: null }]));
    fixture.detectChanges();
    const image = fixture.nativeElement.querySelector('.store-logo') as HTMLImageElement;
    expect(image.src).toBe(withLogo.storeLogoUrl);
    expect(image.alt).toContain('Loja teste');
    expect(fixture.nativeElement.querySelectorAll('.store-avatar')).toHaveLength(1);
    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.store-logo')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.store-avatar')).toHaveLength(2);
    app.clear();
    expect(app.failedStoreLogos().size).toBe(0);
  });

  it('permite escolher entre edições encontradas com zeros à esquerda', () => {
    app.query.card = 'Pikachu';
    app.query.number = '1/9';
    app.query.quality = ['NM'];
    app.search();
    http
      .expectOne((r) => r.url === '/api/cards/prices')
      .flush(
        {
          error: 'AMBIGUOUS_CARD',
          details: [
            { name: 'Pikachu', number: '1/9', edition: 'WC' },
            { name: 'Pikachu', number: '001/009', edition: 'PWCP' },
            { unexpected: true },
          ],
        },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();
    expect(app.editionChoices()).toHaveLength(2);
    const buttons = fixture.nativeElement.querySelectorAll('.edition-choices button');
    expect(buttons[1].textContent).toContain('PWCP');
    buttons[1].click();
    const selected = http.expectOne((r) => r.url === '/api/cards/prices');
    expect(selected.request.params.get('number')).toBe('001/009');
    expect(selected.request.params.get('edition')).toBe('PWCP');
    expect(selected.request.params.get('quality')).toBe('NM');
    selected.flush(result([]));
    expect(app.editionChoices()).toEqual([]);
  });

  it('fecha as condições ao clicar fora ou pressionar Esc e preserva a seleção', () => {
    app.result.set(
      result(['M', 'NM', 'SP', 'MP', 'HP', 'D'].map((quality) => ({ ...offer(10), quality }))),
    );
    fixture.detectChanges();
    const details = fixture.nativeElement.querySelector('.quality-select') as HTMLDetailsElement;
    details.open = true;
    const checkbox = details.querySelectorAll('input')[1];
    checkbox.click();
    expect(details.open).toBe(true);
    expect(app.query.quality).toEqual(['NM']);
    document.body.click();
    expect(details.open).toBe(false);
    expect(app.query.quality).toEqual(['NM']);
    details.open = true;
    details.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(details.open).toBe(false);
    expect(app.query.quality).toEqual(['NM']);
    expect(document.activeElement).toBe(details.querySelector('summary'));
  });

  it('permite selecionar várias condições, envia a união e limpa a seleção', () => {
    app.result.set(
      result(['M', 'NM', 'SP', 'MP', 'HP', 'D'].map((quality) => ({ ...offer(10), quality }))),
    );
    fixture.detectChanges();
    const inputs = fixture.nativeElement.querySelectorAll(
      '.quality-options input',
    ) as NodeListOf<HTMLInputElement>;
    expect(inputs).toHaveLength(6);
    inputs[1].click();
    fixture.detectChanges();
    inputs[4].click();
    fixture.detectChanges();
    expect(app.query.quality).toEqual(['NM', 'HP']);
    expect(fixture.nativeElement.querySelector('.quality-select summary').textContent).toContain(
      'NM, HP',
    );
    app.query.card = 'Pikachu';
    app.search();
    const request = http.expectOne((r) => r.url === '/api/cards/prices');
    expect(request.request.params.get('quality')).toBe('NM,HP');
    request.flush(result([offer(10)]));
    app.clear();
    expect(app.query.quality).toEqual([]);
    app.query.card = 'Pikachu';
    app.search();
    const allConditions = http.expectOne((r) => r.url === '/api/cards/prices');
    expect(allConditions.request.params.has('quality')).toBe(false);
    allConditions.flush(result([]));
  });

  it('exibe a imagem da edição e o link direto da carta', () => {
    const response = result([offer(39.9)]);
    response.card.imageUrl = 'https://repositorio.sbrauble.com/cartas/articuno.jpg';
    response.card.url = 'https://www.ligapokemon.com.br/?view=cards%2Fsearch&card=Articuno';
    app.result.set(response);
    fixture.detectChanges();
    const image = fixture.nativeElement.querySelector('.card-image') as HTMLImageElement;
    expect(image.src).toBe(response.card.imageUrl);
    expect(image.alt).toContain('132/128');
    expect(image.alt).toContain('30C');
    const link = fixture.nativeElement.querySelector('.card-page-link') as HTMLAnchorElement;
    expect(link.href).toBe(response.card.url);
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
    image.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Imagem indisponível');
    expect(fixture.nativeElement.querySelector('.card-page-link')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('aceita respostas anteriores sem mídia e rejeita origens inválidas de imagem', () => {
    app.result.set(result([]));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Imagem indisponível');
    expect(fixture.nativeElement.querySelector('.card-page-link')).toBeNull();
    expect(app.safeImageUrl('https://repositorio.sbrauble.com.evil.example/image.jpg')).toBeNull();
    expect(app.safeImageUrl('http://repositorio.sbrauble.com/image.jpg')).toBeNull();
    expect(app.safeImageUrl('data:image/svg+xml,test')).toBeNull();
    app.imageFailed.set(true);
    app.clear();
    expect(app.imageFailed()).toBe(false);
  });

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
    Object.assign(app.query, { card: ' Articuno ', minPrice: 0, minStock: 0, state: ['PR'] });
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
