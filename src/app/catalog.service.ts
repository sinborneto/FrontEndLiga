import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs';

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
  editions() {
    return this.http.get<{ editions: Edition[] }>('/api/editions').pipe(timeout(90000));
  }
  cards(id: string) {
    return this.http
      .get<EditionCards>(`/api/editions/${encodeURIComponent(id)}/cards`)
      .pipe(timeout(90000));
  }
}
