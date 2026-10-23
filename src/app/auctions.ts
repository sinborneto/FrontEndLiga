import { Component, input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Auction } from './prices.service';

@Component({
  selector: 'app-auctions',
  imports: [CurrencyPipe, DatePipe],
  template: `
    @if (auctions().length) {
      <section class="auctions-panel" aria-labelledby="auctions-heading">
        <div class="auction-heading">
          <div>
            <span class="eyebrow">OUTRAS FORMAS DE ENCONTRAR SUA CARTA</span>
            <h2 id="auctions-heading">
              Leilões disponíveis <span>{{ auctions().length }}</span>
            </h2>
          </div>
          <p>Lances e preços fixos são valores do anúncio.</p>
        </div>
        @for (auction of auctions(); track auction.auctionId ?? $index) {
          <article class="auction-row">
            <div class="auction-description">
              <h3>
                @if (safeUrl(auction.url); as url) {
                  <a [href]="url" target="_blank" rel="noopener noreferrer"
                    >{{ auction.title || 'Leilão sem título' }} ↗</a
                  >
                } @else {
                  {{ auction.title || 'Leilão sem título' }}
                }
              </h3>
              <div class="auction-tags">
                @if (auction.quality) {
                  <span>{{ auction.quality }}</span>
                }
                @if (auction.finish) {
                  <span>{{ auction.finish }}</span>
                }
                @if (auction.language) {
                  <span>{{ auction.language }}</span>
                }
                @if (auction.state) {
                  <span>{{ auction.state }}</span>
                }
              </div>
              @if (auction.acceptsLigaSegura) {
                <small class="liga-segura">Aceita LigaSegura</small>
              }
            </div>
            <div class="auction-price">
              <small>{{
                auction.bidPrice !== null
                  ? auction.bids === 0
                    ? 'Lance inicial'
                    : 'Lance atual'
                  : 'Preço fixo'
              }}</small>
              <strong>{{
                (auction.bidPrice ?? auction.fixedPrice) === null
                  ? '—'
                  : (auction.bidPrice ?? auction.fixedPrice
                    | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR')
              }}</strong>
              @if (auction.bidPrice !== null && auction.fixedPrice !== null) {
                <small
                  >Preço fixo:
                  {{ auction.fixedPrice | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR' }}</small
                >
              }
              @if (auction.bidPrice !== null) {
                <small>{{
                  auction.bids === null
                    ? 'Lances não informados'
                    : auction.bids + (auction.bids === 1 ? ' lance' : ' lances')
                }}</small>
              }
              @if (auction.bidIncrement !== null) {
                <small
                  >Incremento:
                  {{ auction.bidIncrement | currency: 'BRL' : 'symbol' : '1.2-2' : 'pt-BR' }}</small
                >
              }
            </div>
            <div class="auction-ending">
              <small>Encerramento</small
              ><strong>{{
                auction.endsAt
                  ? (auction.endsAt | date: 'dd/MM/yyyy, HH:mm' : '-0300' : 'pt-BR')
                  : 'Não informado'
              }}</strong
              ><small>Horário de Brasília</small>
            </div>
            <div class="auction-seller">
              <small>Vendedor</small>
              @if (safeUrl(auction.sellerUrl); as url) {
                <a [href]="url" target="_blank" rel="noopener noreferrer">{{
                  auction.seller || 'Não informado'
                }}</a>
              } @else {
                <strong>{{ auction.seller || 'Não informado' }}</strong>
              }
              <small
                >{{
                  auction.referencesCount === null
                    ? 'Referências não informadas'
                    : auction.referencesCount + ' ref.'
                }}{{
                  auction.positivePercent === null
                    ? ''
                    : ' · ' + auction.positivePercent + '% positivas'
                }}</small
              >
              @if (safeUrl(auction.url); as url) {
                <a
                  class="auction-link"
                  [href]="url"
                  target="_blank"
                  rel="noopener noreferrer"
                  [attr.aria-label]="'Ver leilão ' + (auction.title || '')"
                  >Ver leilão ↗</a
                >
              }
            </div>
          </article>
        }
        <p class="auction-note">
          Confira os valores, o prazo e as condições no anúncio antes de participar.
        </p>
      </section>
    }
  `,
  styleUrl: './auctions.css',
})
export class Auctions {
  readonly auctions = input<Auction[]>([]);
  safeUrl(value: string | null): string | null {
    if (!value) return null;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' &&
        ['www.ligapokemon.com.br', 'ligapokemon.com.br'].includes(url.hostname)
        ? url.href
        : null;
    } catch {
      return null;
    }
  }
}
