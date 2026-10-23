import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import pt from '@angular/common/locales/pt';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

registerLocaleData(pt);
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(
      [
        { path: '', pathMatch: 'full', loadComponent: () => import('./app').then((m) => m.App) },
        { path: 'edicoes', loadComponent: () => import('./catalog').then((m) => m.Catalog) },
        { path: 'edicoes/:id', loadComponent: () => import('./catalog').then((m) => m.Catalog) },
        { path: '**', redirectTo: '' },
      ],
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
  ],
};
