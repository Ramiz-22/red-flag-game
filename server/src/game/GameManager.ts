import { Server } from 'socket.io';
import { GameInstance } from './GameInstance.js';
import { CONFIG } from '../config.js';
import type { Card } from '../../../shared/types.js';

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export class GameManager {
  private games: Map<string, GameInstance> = new Map();
  private socketToRoom: Map<string, string> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(
    private io: Server,
    private perkCards: Card[],
    private redFlagCards: Card[]
  ) {
    this.cleanupInterval = setInterval(() => this.cleanupStaleRooms(), CONFIG.CLEANUP_INTERVAL_MS);
  }

  createRoom(hostSocketId: string, nickname: string): GameInstance {
    let code: string;
    do {
      code = generateRoomCode();
    } while (this.games.has(code));

    const game = new GameInstance(code, this.io, this.perkCards, this.redFlagCards);
    game.addPlayer(hostSocketId, nickname, true);
    this.games.set(code, game);
    this.socketToRoom.set(hostSocketId, code);
    return game;
  }

  joinRoom(code: string, socketId: string, nickname: string): GameInstance | null {
    const game = this.games.get(code);
    if (!game) return null;

    game.addPlayer(socketId, nickname);
    this.socketToRoom.set(socketId, code);
    return game;
  }

  getGame(code: string): GameInstance | undefined {
    return this.games.get(code);
  }

  getGameForSocket(socketId: string): GameInstance | undefined {
    const code = this.socketToRoom.get(socketId);
    if (!code) return undefined;
    return this.games.get(code);
  }

  leaveRoom(socketId: string): { game: GameInstance; newHostSocketId?: string } | null {
    const code = this.socketToRoom.get(socketId);
    if (!code) return null;

    const game = this.games.get(code);
    if (!game) return null;

    const newHostSocketId = game.removePlayer(socketId);
    this.socketToRoom.delete(socketId);

    if (game.players.size === 0) {
      game.destroy();
      this.games.delete(code);
      return null;
    }

    return { game, newHostSocketId };
  }

  private cleanupStaleRooms() {
    const now = Date.now();
    for (const [code, game] of this.games) {
      if (now - game.lastActivityAt > CONFIG.STALE_ROOM_MS) {
        game.destroy();
        for (const [sid] of game.players) {
          this.socketToRoom.delete(sid);
        }
        this.games.delete(code);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    for (const game of this.games.values()) {
      game.destroy();
    }
  }
}
