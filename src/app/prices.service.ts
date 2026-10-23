import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { timeout } from 'rxjs';

export interface SearchQuery {
  card: string;
  edition: string;
  number: string;
  quality: string;
  finish: string;
  language: string;
  state: string;
  minPrice: number | null;
  maxPrice: number | null;
  minStock: number | null;
}
export interface Offer {
  offerId: number | null;
  storeId: number | null;
  store: string | null;
  city: string | null;
  state: string | null;
  price: number | null;
  originalPrice: number | null;
  stock: number | null;
  quality: string | null;
  finish: string | null;
  language: string | null;
  url: string | null;
}
export interface SearchResult {
  card: {
    name: string;
    number: string | null;
    edition: string | null;
    imageUrl?: string | null;
    url?: string | null;
  };
  source: string;
  totalOffers: number;
  collectedAt: string;
  offers: Offer[];
  diagnostics: {
    pricesDecoded: number;
    pricesPending: number;
    stocksDecoded: number;
    stocksPending: number;
    messages: string[];
  };
}
@Injectable({ providedIn: 'root' })
export class PricesService {
  private readonly http = inject(HttpClient);
  search(query: SearchQuery) {
    let params = new HttpParams().set('sort', 'price_asc');
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || String(value).trim() === '') continue;
      params = params.set(key, String(value).trim());
    }
    return this.http.get<SearchResult>('/api/cards/prices', { params }).pipe(timeout(150_000));
  }
}
