import { TestBed } from '@angular/core/testing';
import { CardChoices } from './card-choices';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('Paginação das versões encontradas', () => {
  it('pede a próxima página somente ao carregar mais e preserva os cards se ela falhar', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(CardChoices);
    const items = (start: number) =>
      Array.from({ length: 20 }, (_, i) => ({
        name: 'Pikachu',
        number: `${start + i}/100`,
        edition: 'TEST',
      }));
    fixture.componentRef.setInput('choices', items(1));
    fixture.componentRef.setInput('nextCursor', 'page-two');
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    await vi.waitFor(() => expect(component.loadingMore()).toBe(false), { timeout: 5000 });
    http.expectNone((req) => req.url === '/api/cards/search-page');
    component.loadMore();
    component.loadMore();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.choice-skeleton')).toHaveLength(20);
    http
      .expectOne('/api/cards/search-page?cursor=page-two')
      .flush({}, { status: 502, statusText: 'Bad Gateway' });
    expect(component.visibleChoices()).toHaveLength(20);
    expect(component.pageError()).toBeTruthy();
    component.loadMore();
    http
      .expectOne('/api/cards/search-page?cursor=page-two')
      .flush({ items: items(21), nextCursor: null });
    await vi.waitFor(() => expect(component.loadingMore()).toBe(false), { timeout: 5000 });
    expect(component.visibleChoices()).toHaveLength(40);
    expect(component.hasMore()).toBe(false);
    http.verify();
    fixture.destroy();
  });
  it('carrega vinte por vez, mantém skeletons durante a montagem e conclui o último lote', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    const fixture = TestBed.createComponent(CardChoices);
    fixture.componentRef.setInput(
      'choices',
      Array.from({ length: 45 }, (_, i) => ({
        name: 'Pikachu',
        number: `${i + 1}/100`,
        edition: 'TEST',
      })),
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.choice-skeleton')).toHaveLength(20);
    const component = fixture.componentInstance;
    await vi.waitFor(() => expect(component.loadingMore()).toBe(false), { timeout: 5000 });
    fixture.detectChanges();
    expect(component.visibleChoices()).toHaveLength(20);
    component.loadMore();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.choice-skeleton')).toHaveLength(20);
    component.loadMore(); // Repeated intersections cannot start a second page concurrently.
    expect(component.target()).toBe(40);
    await vi.waitFor(() => expect(component.loadingMore()).toBe(false), { timeout: 5000 });
    expect(component.visibleChoices()).toHaveLength(40);
    component.loadMore();
    await vi.waitFor(() => expect(component.loadingMore()).toBe(false), { timeout: 5000 });
    expect(component.visibleChoices()).toHaveLength(45);
    fixture.destroy();
  });
});
