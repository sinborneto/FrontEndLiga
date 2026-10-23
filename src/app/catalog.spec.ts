import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { registerLocaleData } from '@angular/common';
import pt from '@angular/common/locales/pt';
import { Catalog } from './catalog';
import { App } from './app';
import { CatalogCard, Edition } from './catalog.service';
registerLocaleData(pt);

const edition: Edition = {
  id: '804',
  code: '30C',
  name: 'Celebração de 30 Anos',
  nameEn: '30th Celebration',
  year: 2026,
  releasedAt: '2026-09-16',
  parentId: null,
  imageUrl: null,
  url: 'https://www.ligapokemon.com.br/?view=cards/search&card=edid=804%20ed=30C',
};
const card = (
  id: string,
  rarity: string,
  energies: string[],
  price: number | null,
): CatalogCard => ({
  id,
  name: id === '2' ? 'Exeggutor de Alola' : 'Pikachu',
  nameEn: id === '2' ? 'Alolan Exeggutor' : 'Pikachu',
  number: `00${id}/128`,
  rarity,
  energies,
  imageUrl: null,
  minPrice: price,
  maxPrice: null,
  url: 'https://www.ligapokemon.com.br/',
});
const cards = [
  card('1', 'Comum', ['Raios'], 2),
  card('2', 'Ilustração Rara', ['Água', 'Planta'], 10),
  card('3', 'Ilustração Rara', ['Água'], null),
  card('4', 'Rara', ['Fogo'], 1),
];
describe('Catálogo de edições', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let catalog: Catalog;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: '', pathMatch: 'full', component: App },
          { path: 'edicoes', component: Catalog },
          { path: 'edicoes/:id', component: Catalog },
        ]),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create('/edicoes');
    catalog = harness.routeDebugElement!.componentInstance;
    http.expectOne('/api/editions').flush({
      editions: [
        edition,
        { ...edition, id: '805', code: '30C-C', name: 'Cartas Clássicas', parentId: '804' },
        {
          ...edition,
          id: '72',
          code: 'BS',
          name: 'Base Set',
          year: 1999,
          releasedAt: '1999-01-09',
        },
      ],
    });
    harness.detectChanges();
  });
  afterEach(() => http.verify());
  async function openCards() {
    catalog = await harness.navigateByUrl('/edicoes/804', Catalog);
    http
      .expectOne('/api/editions/804/cards')
      .flush({ edition, cards, collectedAt: '2026-10-23T12:00:00.000Z' });
    harness.detectChanges();
  }
  it('busca edições por nome sem acentos, sigla e ano, incluindo subconjuntos', () => {
    expect(catalog.editions().length).toBe(3);
    expect(harness.routeNativeElement!.querySelector('a.subset')?.getAttribute('href')).toBe(
      '/edicoes/805',
    );
    catalog.editionSearch.set('celebracao');
    expect(catalog.matchingEditions().map((e) => e.id)).toEqual(['804']);
    catalog.editionSearch.set('30C');
    expect(catalog.matchingEditions().length).toBe(2);
    catalog.year.set('1999');
    expect(catalog.matchingEditions()).toEqual([]);
    catalog.editionSearch.set('');
    expect(catalog.matchingEditions().map((e) => e.code)).toEqual(['BS']);
  });
  it('combina múltiplas raridades e energias sobre a edição completa e preserva as opções sem resultados', async () => {
    await openCards();
    catalog.toggle('rarities', 'Ilustração Rara');
    catalog.toggle('rarities', 'Rara');
    catalog.toggle('energies', 'Água');
    catalog.toggle('energies', 'Raios');
    expect(catalog.filteredCards().map((c) => c.id)).toEqual(['2', '3']);
    catalog.name.set('inexistente');
    expect(catalog.filteredCards()).toEqual([]);
    expect(catalog.facets().energies.find((o) => o.label === 'Água')?.count).toBe(2);
    catalog.clearFilters();
    expect(catalog.filteredCards().length).toBe(4);
  });
  it('ordena preços mantendo desconhecidos ao final e passa nome inglês, edição e número à busca', async () => {
    await openCards();
    catalog.order.set('price');
    expect(catalog.filteredCards().map((c) => c.id)).toEqual(['4', '1', '2', '3']);
    expect(catalog.offerQuery(cards[1])).toEqual({
      card: 'Alolan Exeggutor',
      edition: '30C',
      number: '002/128',
    });
    const link = harness.routeNativeElement!.querySelector(
      'a[aria-label="Ver ofertas de Exeggutor de Alola 002/128"]',
    ) as HTMLAnchorElement;
    const query = new URL(link.href).searchParams;
    expect(query.get('card')).toBe('Alolan Exeggutor');
    expect(query.get('number')).toBe('002/128');
  });
  it('exibe erro recuperável para edição inexistente e permite tentar novamente', async () => {
    catalog = await harness.navigateByUrl('/edicoes/999', Catalog);
    http.expectOne('/api/editions/999/cards').flush({}, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();
    expect(catalog.error()).toContain('não foi encontrada');
    catalog.reload();
    expect(catalog.loading()).toBe(true);
    http
      .expectOne('/api/editions/999/cards')
      .flush({ edition, cards: [], collectedAt: '2026-10-23T12:00:00.000Z' });
    harness.detectChanges();
    expect(catalog.error()).toBe('');
    expect(catalog.data()?.cards).toEqual([]);
  });
  it('abre a busca de ofertas automaticamente a partir de uma carta do catálogo', async () => {
    const app = await harness.navigateByUrl(
      '/?card=Alolan%20Exeggutor&edition=30C&number=002%2F128',
      App,
    );
    const request = http.expectOne((req) => req.url === '/api/cards/prices');
    expect(request.request.params.get('card')).toBe('Alolan Exeggutor');
    expect(request.request.params.get('edition')).toBe('30C');
    expect(request.request.params.get('number')).toBe('002/128');
    request.flush({
      card: { name: 'Alolan Exeggutor', number: '002/128', edition: '30C' },
      source: 'Liga Pokémon',
      totalOffers: 0,
      offers: [],
      collectedAt: '2026-10-23T12:00:00.000Z',
      diagnostics: {
        pricesDecoded: 0,
        pricesPending: 0,
        stocksDecoded: 0,
        stocksPending: 0,
        messages: [],
      },
    });
    harness.detectChanges();
    expect(app.result()?.card.edition).toBe('30C');
    expect(app.loading()).toBe(false);
  });
});
