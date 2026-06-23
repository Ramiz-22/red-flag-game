import type { Socket } from 'socket.io';
import type { GameManager } from '../../game/GameManager.js';
import { CONFIG } from '../../config.js';

export function registerGameHandlers(socket: Socket, gm: GameManager) {
  socket.on('game:start', () => {
    const game = gm.getGameForSocket(socket.id!);
    if (!game) return;

    const player = game.players.get(socket.id!);
    if (!player?.isHost) {
      socket.emit('room:error', { message: 'Not the host', code: 'NOT_HOST' });
      return;
    }

    if (game.players.size < CONFIG.MIN_PLAYERS) {
      socket.emit('room:error', { message: `Need at least ${CONFIG.MIN_PLAYERS} players`, code: 'MIN_PLAYERS' });
      return;
    }

    game.startGame();
  });

  socket.on('game:select-perks', ({ cardIds }: { cardIds: string[] }) => {
    if (!Array.isArray(cardIds) || !cardIds.every(id => typeof id === 'string')) {
      socket.emit('room:error', { message: 'Invalid input', code: 'INVALID_CARDS' });
      return;
    }
    const game = gm.getGameForSocket(socket.id!);
    if (!game) return;

    const success = game.handlePerkSelection(socket.id!, cardIds);
    if (!success) {
      socket.emit('room:error', { message: 'Invalid perk selection', code: 'INVALID_CARDS' });
    }
  });

  socket.on('game:play-redflag', ({ cardId, targetSocketId }: { cardId: string; targetSocketId: string }) => {
    if (typeof cardId !== 'string' || typeof targetSocketId !== 'string') {
      socket.emit('room:error', { message: 'Invalid input', code: 'INVALID_CARDS' });
      return;
    }
    const game = gm.getGameForSocket(socket.id!);
    if (!game) return;

    const success = game.handleRedFlagPlay(socket.id!, cardId, targetSocketId);
    if (!success) {
      socket.emit('room:error', { message: 'Invalid red flag play', code: 'INVALID_CARDS' });
    }
  });

  socket.on('game:judge-pick', ({ winnerSocketId }: { winnerSocketId: string }) => {
    if (typeof winnerSocketId !== 'string') {
      socket.emit('room:error', { message: 'Invalid input', code: 'NOT_YOUR_TURN' });
      return;
    }
    const game = gm.getGameForSocket(socket.id!);
    if (!game) return;

    const success = game.handleJudgePick(socket.id!, winnerSocketId);
    if (!success) {
      socket.emit('room:error', { message: 'Invalid judge pick', code: 'NOT_YOUR_TURN' });
    }
  });
}
