import type { Socket } from 'socket.io';
import type { GameManager } from '../../game/GameManager.js';
import { CONFIG } from '../../config.js';

export function registerRoomHandlers(socket: Socket, gm: GameManager) {
  socket.on('room:create', ({ nickname }: { nickname: string }) => {
    if (!nickname || nickname.trim().length < 2 || nickname.trim().length > 15) {
      socket.emit('room:error', { message: 'Invalid nickname', code: 'INVALID_NICKNAME' });
      return;
    }

    const game = gm.createRoom(socket.id!, nickname.trim());
    socket.join(game.code);

    socket.emit('room:created', {
      roomCode: game.code,
      players: [...game.players.values()].map((p) => p.toPublic()),
      settings: {
        maxPlayers: CONFIG.MAX_PLAYERS,
        winScore: CONFIG.WIN_SCORE,
        perkTimer: CONFIG.PERK_TIMER,
        redFlagTimer: CONFIG.RED_FLAG_TIMER,
        argumentTimer: CONFIG.ARGUMENT_TIMER,
        judgingTimer: CONFIG.JUDGING_TIMER,
      },
    });
  });

  socket.on('room:join', ({ roomCode, nickname }: { roomCode: string; nickname: string }) => {
    if (!nickname || nickname.trim().length < 2 || nickname.trim().length > 15) {
      socket.emit('room:error', { message: 'Invalid nickname', code: 'INVALID_NICKNAME' });
      return;
    }

    const existing = gm.getGame(roomCode);
    if (!existing) {
      socket.emit('room:error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' });
      return;
    }

    if (existing.players.size >= CONFIG.MAX_PLAYERS) {
      socket.emit('room:error', { message: 'Room is full', code: 'ROOM_FULL' });
      return;
    }

    if (existing.phase !== ('LOBBY' as any)) {
      socket.emit('room:error', { message: 'Game in progress', code: 'GAME_IN_PROGRESS' });
      return;
    }

    const nickTaken = [...existing.players.values()].some(
      (p) => p.nickname.toLowerCase() === nickname.trim().toLowerCase()
    );
    if (nickTaken) {
      socket.emit('room:error', { message: 'Nickname taken', code: 'NICKNAME_TAKEN' });
      return;
    }

    gm.joinRoom(roomCode, socket.id!, nickname.trim());
    socket.join(roomCode);

    const players = [...existing.players.values()].map((p) => p.toPublic());

    socket.emit('room:joined', {
      roomCode,
      players,
      settings: {
        maxPlayers: CONFIG.MAX_PLAYERS,
        winScore: CONFIG.WIN_SCORE,
        perkTimer: CONFIG.PERK_TIMER,
        redFlagTimer: CONFIG.RED_FLAG_TIMER,
        argumentTimer: CONFIG.ARGUMENT_TIMER,
        judgingTimer: CONFIG.JUDGING_TIMER,
      },
    });

    const newPlayer = existing.players.get(socket.id!);
    if (newPlayer) {
      socket.to(roomCode).emit('room:player-joined', newPlayer.toPublic());
    }
  });

  socket.on('room:leave', () => {
    handleLeave(socket, gm);
  });
}

export function handleLeave(socket: Socket, gm: GameManager) {
  const result = gm.leaveRoom(socket.id!);
  if (result) {
    const { game, newHostSocketId } = result;
    socket.leave(game.code);
    socket.to(game.code).emit('room:player-left', {
      socketId: socket.id,
      newHostSocketId,
    });
  }
}
