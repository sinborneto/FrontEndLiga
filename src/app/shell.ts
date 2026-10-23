import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header>
      <a class="brand" routerLink="/" aria-label="Liga Finder, início"
        ><span class="ball">●</span>Liga<span>Finder</span><small>BETA</small></a
      >
      <nav aria-label="Navegação principal">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"
          >Buscar ofertas</a
        >
        <a routerLink="/edicoes" routerLinkActive="active">Explorar edições</a>
      </nav>
      <a
        class="portal"
        href="https://www.ligapokemon.com.br/"
        target="_blank"
        rel="noopener noreferrer"
        >Liga Pokémon ↗</a
      >
    </header>
    <router-outlet />
    <footer>
      <a class="brand" routerLink="/">Liga<span>Finder</span></a
      ><span>Feito para quem coleciona possibilidades.</span
      ><span>Projeto independente · Dados da Liga Pokémon</span>
    </footer>
  `,
  styleUrl: './shell.css',
})
export class Shell {}
