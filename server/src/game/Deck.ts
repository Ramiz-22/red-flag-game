import type { Card } from '../../../shared/types.js';

export class Deck {
  private drawPile: Card[];
  private discardPile: Card[] = [];

  constructor(cards: Card[]) {
    this.drawPile = [...cards];
    this.shuffle();
  }

  private shuffle() {
    for (let i = this.drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.drawPile[i], this.drawPile[j]] = [this.drawPile[j], this.drawPile[i]];
    }
  }

  draw(count: number): Card[] {
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
      if (this.drawPile.length === 0) {
        if (this.discardPile.length === 0) break;
        this.drawPile = [...this.discardPile];
        this.discardPile = [];
        this.shuffle();
      }
      cards.push(this.drawPile.pop()!);
    }
    return cards;
  }

  discard(cards: Card[]) {
    this.discardPile.push(...cards);
  }

  get remaining(): number {
    return this.drawPile.length;
  }
}
