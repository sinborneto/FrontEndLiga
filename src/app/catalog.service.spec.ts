import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogService } from './catalog.service';

describe('Cache do catálogo durante a navegação', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('compartilha a chamada em andamento e não chama novamente após carregar', () => {
    const service = TestBed.inject(CatalogService);
    const http = TestBed.inject(HttpTestingController);
    const first = vi.fn(),
      second = vi.fn(),
      back = vi.fn();
    const subscription = service.editions().subscribe(first);
    service.editions().subscribe(second);
    subscription.unsubscribe(); // Leaving the page must not restart the in-flight request.
    const value = { editions: [] };
    http.expectOne('/api/editions').flush(value);
    expect(second).toHaveBeenCalledWith(value);
    service.editions().subscribe(back);
    expect(back).toHaveBeenCalledWith(value);
    http.expectNone('/api/editions');
  });
  it('mantém as cartas por edição e permite tentar novamente depois de falha', () => {
    const service = TestBed.inject(CatalogService);
    const http = TestBed.inject(HttpTestingController);
    service.cards('804').subscribe({ error: () => {} });
    http.expectOne('/api/editions/804/cards').flush({}, { status: 502, statusText: 'Bad Gateway' });
    service.cards('804').subscribe();
    const value = { edition: {}, cards: [], collectedAt: '2026-10-23T12:00:00.000Z' };
    http.expectOne('/api/editions/804/cards').flush(value);
    const back = vi.fn();
    service.cards('804').subscribe(back);
    expect(back).toHaveBeenCalledWith(value);
    http.expectNone('/api/editions/804/cards');
  });
});
