import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, shareReplay, throwError, timeout } from 'rxjs';

export interface Edition {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  year: number;
  releasedAt: string | null;
  parentId: string | null;
  imageUrl: string | null;
  url: string;
}
export interface CatalogCard {
  id: string;
  name: string;
  nameEn: string;
  number: string;
  rarity: string | null;
  energies: string[];
  imageUrl: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  url: string;
}
export interface EditionCards {
  edition: Edition;
  cards: CatalogCard[];
  collectedAt: string;
}
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private editionRequest?: Observable<{ editions: Edition[] }>;
  private readonly cardRequests = new Map<string, Observable<EditionCards>>();
  editions() {
    return (this.editionRequest ??= this.http.get<{ editions: Edition[] }>('/api/editions').pipe(
      timeout(90000),
      catchError((error) => {
        this.editionRequest = undefined;
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    ));
  }
  cards(id: string) {
    const cached = this.cardRequests.get(id);
    if (cached) return cached;
    const request = this.http
      .get<EditionCards>(`/api/editions/${encodeURIComponent(id)}/cards`)
      .pipe(
        timeout(90000),
        catchError((error) => {
          this.cardRequests.delete(id);
          return throwError(() => error);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.cardRequests.set(id, request);
    return request;
  }
}
