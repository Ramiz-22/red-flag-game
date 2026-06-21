import type { Card, PublicPlayer } from '../../../shared/types.js';

export class Player {
  socketId: string;
  nickname: string;
  hand: { perks: Card[]; redFlags: Card[] };
  score: number;
  isConnected: boolean;
  isHost: boolean;
  disconnectedAt: number | null;

  constructor(socketId: string, nickname: string, isHost: boolean = false) {
    this.socketId = socketId;
    this.nickname = nickname;
    this.hand = { perks: [], redFlags: [] };
    this.score = 0;
    this.isConnected = true;
    this.isHost = isHost;
    this.disconnectedAt = null;
  }

  addCards(perks: Card[], redFlags: Card[]) {
    this.hand.perks.push(...perks);
    this.hand.redFlags.push(...redFlags);
  }

  removePerks(cardIds: string[]): Card[] {
    const removed: Card[] = [];
    for (const id of cardIds) {
      const idx = this.hand.perks.findIndex((c) => c.id === id);
      if (idx >= 0) removed.push(...this.hand.perks.splice(idx, 1));
    }
    return removed;
  }

  removeRedFlag(cardId: string): Card | null {
    const idx = this.hand.redFlags.findIndex((c) => c.id === cardId);
    if (idx >= 0) return this.hand.redFlags.splice(idx, 1)[0];
    return null;
  }

  toPublic(): PublicPlayer {
    return {
      socketId: this.socketId,
      nickname: this.nickname,
      score: this.score,
      isConnected: this.isConnected,
      isHost: this.isHost,
    };
  }
}
