import { Server } from 'socket.io';
import { Deck } from './Deck.js';
import { Player } from './Player.js';
import { CONFIG } from '../config.js';
import type { Card, GamePhase, DateProfile } from '../../../shared/types.js';

export class GameInstance {
  code: string;
  players: Map<string, Player> = new Map();
  playerOrder: string[] = [];
  judgeIndex: number = 0;
  roundNumber: number = 0;
  phase: GamePhase = 'LOBBY' as GamePhase;

  perkDeck: Deck | null = null;
  redFlagDeck: Deck | null = null;

  perkSelections: Map<string, string[]> = new Map();
  redFlagIntents: Map<string, { card: Card; targetSocketId: string }> = new Map();
  redFlagAssignments: Map<string, Card> = new Map(); // targetSocketId -> Card (resolved)
  redFlagPlayedBy: Set<string> = new Set();
  judgeChoice: string | null = null;

  private phaseTimer: ReturnType<typeof setTimeout> | null = null;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private timerSeconds: number = 0;

  createdAt: number = Date.now();
  lastActivityAt: number = Date.now();

  constructor(
    code: string,
    private io: Server,
    private perkCards: Card[],
    private redFlagCards: Card[]
  ) {
    this.code = code;
  }

  private get room() {
    return this.code;
  }

  get judgeSocketId(): string {
    return this.playerOrder[this.judgeIndex] || '';
  }

  get judgeNickname(): string {
    return this.players.get(this.judgeSocketId)?.nickname || '';
  }

  get matchmakers(): Player[] {
    return this.playerOrder
      .filter((sid) => sid !== this.judgeSocketId)
      .map((sid) => this.players.get(sid)!)
      .filter(Boolean);
  }

  addPlayer(socketId: string, nickname: string, isHost: boolean = false): Player {
    const player = new Player(socketId, nickname, isHost);
    this.players.set(socketId, player);
    this.lastActivityAt = Date.now();
    return player;
  }

  removePlayer(socketId: string): string | undefined {
    this.players.delete(socketId);
    this.playerOrder = this.playerOrder.filter((s) => s !== socketId);

    if (this.players.size > 0) {
      const first = this.players.values().next().value!;
      if (![...this.players.values()].some((p) => p.isHost)) {
        first.isHost = true;
        return first.socketId;
      }
    }
    return undefined;
  }

  startGame() {
    this.playerOrder = [...this.players.keys()].sort(() => Math.random() - 0.5);
    this.judgeIndex = 0;
    this.roundNumber = 0;
    this.perkDeck = new Deck(this.perkCards);
    this.redFlagDeck = new Deck(this.redFlagCards);

    for (const player of this.players.values()) {
      player.score = 0;
      player.hand = { perks: [], redFlags: [] };
    }

    this.io.to(this.room).emit('game:started', {
      playerOrder: this.playerOrder,
      judgeSocketId: this.judgeSocketId,
      judgeNickname: this.judgeNickname,
    });

    this.startRound();
  }

  private startRound() {
    this.roundNumber++;
    this.perkSelections.clear();
    this.redFlagIntents.clear();
    this.redFlagAssignments.clear();
    this.redFlagPlayedBy.clear();
    this.judgeChoice = null;

    this.dealCards();
    this.setPhase('PERK_SELECTION' as GamePhase, CONFIG.PERK_TIMER);
  }

  private dealCards() {
    for (const player of this.players.values()) {
      const perksNeeded = CONFIG.HAND_SIZE_PERKS - player.hand.perks.length;
      const redFlagsNeeded = CONFIG.HAND_SIZE_REDFLAGS - player.hand.redFlags.length;

      const newPerks = perksNeeded > 0 ? this.perkDeck!.draw(perksNeeded) : [];
      const newRedFlags = redFlagsNeeded > 0 ? this.redFlagDeck!.draw(redFlagsNeeded) : [];

      player.addCards(newPerks, newRedFlags);

      this.io.to(player.socketId).emit('game:hand-dealt', {
        perks: player.hand.perks,
        redFlags: player.hand.redFlags,
      });
    }
  }

  private setPhase(phase: GamePhase, timerSeconds: number | null) {
    this.clearTimers();
    this.phase = phase;
    this.timerSeconds = timerSeconds ?? 0;
    this.lastActivityAt = Date.now();

    this.io.to(this.room).emit('game:phase-changed', {
      phase,
      timer: timerSeconds,
      roundNumber: this.roundNumber,
      judgeSocketId: this.judgeSocketId,
      judgeNickname: this.judgeNickname,
    });

    if (timerSeconds && timerSeconds > 0) {
      this.tickInterval = setInterval(() => {
        this.timerSeconds--;
        if (this.timerSeconds >= 0) {
          this.io.to(this.room).emit('game:timer-tick', { secondsRemaining: this.timerSeconds });
        }
      }, 1000);

      this.phaseTimer = setTimeout(() => {
        this.onTimerExpired(phase);
      }, timerSeconds * 1000);
    }
  }

  private clearTimers() {
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.phaseTimer = null;
    this.tickInterval = null;
  }

  private onTimerExpired(phase: GamePhase) {
    switch (phase) {
      case 'PERK_SELECTION' as GamePhase:
        this.autoSelectPerks();
        this.advanceToRedFlag();
        break;
      case 'RED_FLAG_PLAY' as GamePhase:
        this.autoPlayRedFlags();
        this.advanceToReveal();
        break;
      case 'JUDGING' as GamePhase:
        this.autoJudge();
        break;
    }
  }

  handlePerkSelection(socketId: string, cardIds: string[]): boolean {
    if (this.phase !== ('PERK_SELECTION' as GamePhase)) return false;
    if (socketId === this.judgeSocketId) return false;
    if (this.perkSelections.has(socketId)) return false;
    if (cardIds.length !== 2) return false;

    const player = this.players.get(socketId);
    if (!player) return false;

    const hasCards = cardIds.every((id) => player.hand.perks.some((c) => c.id === id));
    if (!hasCards) return false;

    this.perkSelections.set(socketId, cardIds);
    this.lastActivityAt = Date.now();

    this.io.to(this.room).emit('game:perk-selection-update', {
      playersReady: [...this.perkSelections.keys()],
    });

    if (this.perkSelections.size >= this.matchmakers.length) {
      this.advanceToRedFlag();
    }
    return true;
  }

  private autoSelectPerks() {
    for (const mm of this.matchmakers) {
      if (!this.perkSelections.has(mm.socketId)) {
        const randomPerks = mm.hand.perks.slice(0, 2).map((c) => c.id);
        this.perkSelections.set(mm.socketId, randomPerks);
      }
    }
  }

  private advanceToRedFlag() {
    this.clearTimers();

    for (const [sid, cardIds] of this.perkSelections) {
      const player = this.players.get(sid);
      if (player) player.removePerks(cardIds);
    }

    const perksReveal = this.buildDates();
    this.io.to(this.room).emit('game:dates-revealed', { dates: perksReveal });

    this.broadcastAvailableTargets();
    this.setPhase('RED_FLAG_PLAY' as GamePhase, CONFIG.RED_FLAG_TIMER);
  }

  private broadcastAvailableTargets() {
    const targets = this.matchmakers
      .map((mm) => ({ socketId: mm.socketId, nickname: mm.nickname }));

    this.io.to(this.room).emit('game:redflag-targets', {
      availableTargets: targets,
      playedBy: [...this.redFlagPlayedBy],
    });
  }

  handleRedFlagPlay(socketId: string, cardId: string, targetSocketId: string): boolean {
    if (this.phase !== ('RED_FLAG_PLAY' as GamePhase)) return false;
    if (socketId === this.judgeSocketId) return false;
    if (this.redFlagPlayedBy.has(socketId)) return false;
    if (targetSocketId === socketId) return false;
    if (!this.matchmakers.some((mm) => mm.socketId === targetSocketId)) return false;

    const player = this.players.get(socketId);
    if (!player) return false;

    const card = player.removeRedFlag(cardId);
    if (!card) return false;

    this.redFlagIntents.set(socketId, { card, targetSocketId });
    this.redFlagPlayedBy.add(socketId);
    this.lastActivityAt = Date.now();

    this.io.to(this.room).emit('game:perk-selection-update', {
      playersReady: [...this.redFlagPlayedBy],
    });

    this.broadcastAvailableTargets();

    const allPlayed = this.matchmakers.every((mm) =>
      this.redFlagPlayedBy.has(mm.socketId)
    );
    if (allPlayed) {
      this.resolveRedFlags();
      this.advanceToReveal();
    }
    return true;
  }

  private resolveRedFlags() {
    this.redFlagAssignments.clear();
    const unassigned: { card: Card }[] = [];

    for (const [, intent] of this.redFlagIntents) {
      if (!this.redFlagAssignments.has(intent.targetSocketId)) {
        this.redFlagAssignments.set(intent.targetSocketId, intent.card);
      } else {
        unassigned.push({ card: intent.card });
      }
    }

    const coveredTargets = new Set(this.redFlagAssignments.keys());
    const uncovered = this.matchmakers
      .filter((mm) => !coveredTargets.has(mm.socketId))
      .map((mm) => mm.socketId);

    for (let i = 0; i < unassigned.length && i < uncovered.length; i++) {
      this.redFlagAssignments.set(uncovered[i], unassigned[i].card);
    }
  }

  private autoPlayRedFlags() {
    for (const mm of this.matchmakers) {
      if (this.redFlagPlayedBy.has(mm.socketId)) continue;
      const availableTargets = this.matchmakers.filter(
        (t) => t.socketId !== mm.socketId
      );
      if (availableTargets.length === 0) continue;
      const target = availableTargets[Math.floor(Math.random() * availableTargets.length)];
      const randomCard = mm.hand.redFlags[0];
      if (randomCard) {
        mm.removeRedFlag(randomCard.id);
        this.redFlagIntents.set(mm.socketId, { card: randomCard, targetSocketId: target.socketId });
        this.redFlagPlayedBy.add(mm.socketId);
      }
    }
  }

  private advanceToReveal() {
    this.clearTimers();

    const dates = this.buildDates();
    this.io.to(this.room).emit('game:dates-revealed', { dates });

    this.setPhase('JUDGING' as GamePhase, CONFIG.JUDGING_TIMER);
  }

  private buildDates(): DateProfile[] {
    return this.matchmakers.map((mm) => {
      const perkIds = this.perkSelections.get(mm.socketId) || [];
      const actualPerks: Card[] = perkIds.map((id) => {
        return this.perkCards.find((c) => c.id === id)!;
      }).filter(Boolean);

      return {
        matchmakerSocketId: mm.socketId,
        matchmakerNickname: mm.nickname,
        perks: actualPerks,
        redFlag: this.redFlagAssignments.get(mm.socketId) || null,
      };
    });
  }

  handleJudgePick(socketId: string, winnerSocketId: string): boolean {
    if (this.phase !== ('JUDGING' as GamePhase)) return false;
    if (socketId !== this.judgeSocketId) return false;
    if (!this.matchmakers.some((mm) => mm.socketId === winnerSocketId)) return false;

    this.judgeChoice = winnerSocketId;
    this.lastActivityAt = Date.now();

    const winner = this.players.get(winnerSocketId);
    if (winner) winner.score++;

    const scores: Record<string, number> = {};
    for (const [sid, p] of this.players) {
      scores[sid] = p.score;
    }

    this.clearTimers();

    this.io.to(this.room).emit('game:round-result', {
      winnerSocketId,
      winnerNickname: winner?.nickname || '',
      scores,
    });

    this.setPhase('ROUND_RESULT' as GamePhase, CONFIG.ROUND_RESULT_TIMER);

    setTimeout(() => {
      if (this.phase === ('ROUND_RESULT' as GamePhase)) {
        this.checkGameEnd();
      }
    }, CONFIG.ROUND_RESULT_TIMER * 1000);

    return true;
  }

  private autoJudge() {
    const randomMM = this.matchmakers[Math.floor(Math.random() * this.matchmakers.length)];
    if (randomMM) {
      this.handleJudgePick(this.judgeSocketId, randomMM.socketId);
    }
  }

  private checkGameEnd() {
    const winner = [...this.players.values()].find((p) => p.score >= CONFIG.WIN_SCORE);
    if (winner) {
      const finalScores: Record<string, number> = {};
      for (const [sid, p] of this.players) {
        finalScores[sid] = p.score;
      }

      this.clearTimers();
      this.phase = 'GAME_OVER' as GamePhase;

      this.io.to(this.room).emit('game:over', {
        winnerSocketId: winner.socketId,
        winnerNickname: winner.nickname,
        finalScores,
      });
    } else {
      this.discardPlayedCards();
      this.judgeIndex = (this.judgeIndex + 1) % this.playerOrder.length;
      this.startRound();
    }
  }

  private discardPlayedCards() {
    for (const [, cardIds] of this.perkSelections) {
      const cards = cardIds.map((id) => this.perkCards.find((c) => c.id === id)!).filter(Boolean);
      this.perkDeck?.discard(cards);
    }
    for (const [, card] of this.redFlagAssignments) {
      this.redFlagDeck?.discard([card]);
    }
  }

  destroy() {
    this.clearTimers();
  }
}
