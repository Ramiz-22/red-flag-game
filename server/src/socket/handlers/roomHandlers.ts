import type { Socket } from 'socket.io';
import type { GameManager } from '../../game/GameManager.js';
import type { GameInstance } from '../../game/GameInstance.js';
import { CONFIG } from '../../config.js';
import { sanitizeNickname } from '../../utils/sanitize.js';

function roomSettings() {
  return {
    maxPlayers: CONFIG.MAX_PLAYERS,
    winScore: CONFIG.WIN_SCORE,
    perkTimer: CONFIG.PERK_TIMER,
    redFlagTimer: CONFIG.RED_FLAG_TIMER,
    argumentTimer: CONFIG.ARGUMENT_TIMER,
    judgingTimer: CONFIG.JUDGING_TIMER,
  };
}

function broadcastPending(game: GameInstance, gm: GameManager) {
  gm.getIO().to(game.code).emit('room:join-requests', { pending: game.getPendingList() });
}

export function registerRoomHandlers(socket: Socket, gm: GameManager) {
  socket.on('room:create', ({ nickname }: { nickname: string }) => {
    const clean = sanitizeNickname(nickname);
    if (!clean) {
      socket.emit('room:error', { message: 'Invalid nickname', code: 'INVALID_NICKNAME' });
      return;
    }

    const game = gm.createRoom(socket.id!, clean);
    socket.join(game.code);

    socket.emit('room:created', {
      roomCode: game.code,
      players: [...game.players.values()].map((p) => p.toPublic()),
      settings: roomSettings(),
    });
  });

  // A join is now a request that the host must approve.
  socket.on('room:join', ({ roomCode, nickname }: { roomCode: string; nickname: string }) => {
    const clean = sanitizeNickname(nickname);
    if (!clean) {
      socket.emit('room:error', { message: 'Invalid nickname', code: 'INVALID_NICKNAME' });
      return;
    }

    const game = gm.getGame(roomCode);
    if (!game) {
      socket.emit('room:error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' });
      return;
    }

    if (game.players.size + game.pendingJoins.size >= CONFIG.MAX_PLAYERS) {
      socket.emit('room:error', { message: 'Room is full', code: 'ROOM_FULL' });
      return;
    }

    const nickLower = clean.toLowerCase();
    const nickTaken =
      [...game.players.values()].some((p) => p.nickname.toLowerCase() === nickLower) ||
      game.getPendingList().some((p) => p.nickname.toLowerCase() === nickLower);
    if (nickTaken) {
      socket.emit('room:error', { message: 'Nickname taken', code: 'NICKNAME_TAKEN' });
      return;
    }

    game.addPendingJoin(socket.id!, clean);
    gm.addPending(socket.id!, game.code);

    socket.emit('room:join-pending', { roomCode: game.code });
    broadcastPending(game, gm);
  });

  socket.on('room:approve-join', ({ socketId }: { socketId: string }) => {
    if (typeof socketId !== 'string') return;
    const game = gm.getGameForSocket(socket.id!);
    if (!game) return;
    if (!game.players.get(socket.id!)?.isHost) {
      socket.emit('room:error', { message: 'Not the host', code: 'NOT_HOST' });
      return;
    }
    if (game.players.size >= CONFIG.MAX_PLAYERS) {
      // Room filled up since the request; drop it.
      if (game.rejectJoin(socketId)) {
        gm.removePending(socketId);
        gm.getIO().sockets.sockets.get(socketId)?.emit('room:join-rejected');
        broadcastPending(game, gm);
      }
      return;
    }

    const player = game.approveJoin(socketId);
    if (!player) return;
    gm.removePending(socketId);
    gm.bindSocket(socketId, game.code);

    // Tell everyone already in the room (host + existing players) about the
    // newcomer BEFORE the newcomer joins the socket room — otherwise the host
    // (the sender) would be skipped, and the newcomer would receive both the
    // full roster (room:joined) and a duplicate room:player-joined.
    gm.getIO().to(game.code).emit('room:player-joined', player.toPublic());

    const target = gm.getIO().sockets.sockets.get(socketId);
    if (target) {
      target.join(game.code);
      target.emit('room:joined', {
        roomCode: game.code,
        players: [...game.players.values()].map((p) => p.toPublic()),
        settings: roomSettings(),
      });
      if (game.isInProgress()) {
        // They watch this round, then enter the rotation next round.
        target.emit('game:sync', game.buildSyncFor(true));
      }
    }

    broadcastPending(game, gm);
  });

  socket.on('room:reject-join', ({ socketId }: { socketId: string }) => {
    if (typeof socketId !== 'string') return;
    const game = gm.getGameForSocket(socket.id!);
    if (!game) return;
    if (!game.players.get(socket.id!)?.isHost) {
      socket.emit('room:error', { message: 'Not the host', code: 'NOT_HOST' });
      return;
    }

    if (game.rejectJoin(socketId)) {
      gm.removePending(socketId);
      gm.getIO().sockets.sockets.get(socketId)?.emit('room:join-rejected');
      broadcastPending(game, gm);
    }
  });

  socket.on('room:leave', () => {
    handleLeave(socket, gm);
  });

  socket.on('room:kick', ({ targetSocketId }: { targetSocketId: string }) => {
    if (typeof targetSocketId !== 'string') return;
    const game = gm.getGameForSocket(socket.id!);
    if (!game) return;

    const player = game.players.get(socket.id!);
    if (!player?.isHost) {
      socket.emit('room:error', { message: 'Not the host', code: 'NOT_HOST' });
      return;
    }

    if (targetSocketId === socket.id) return;
    if (!game.players.has(targetSocketId)) return;

    const { newHostSocketId, tooFewPlayers } = game.handlePlayerRemoved(targetSocketId);
    gm.removeSocketMapping(targetSocketId);

    const targetSocket = gm.getIO().sockets.sockets.get(targetSocketId);
    if (targetSocket) {
      targetSocket.emit('room:kicked');
      targetSocket.leave(game.code);
    }

    const payload = { socketId: targetSocketId, newHostSocketId, tooFewPlayers };
    socket.to(game.code).emit('room:player-left', payload);
    socket.emit('room:player-left', payload);
  });
}

export function handleLeave(socket: Socket, gm: GameManager) {
  // A socket still waiting for approval just gets dropped from the pending list.
  const pendingCode = gm.removePending(socket.id!);
  if (pendingCode) {
    const pendingGame = gm.getGame(pendingCode);
    if (pendingGame && pendingGame.rejectJoin(socket.id!)) {
      gm.getIO().to(pendingCode).emit('room:join-requests', { pending: pendingGame.getPendingList() });
    }
    return;
  }

  const game = gm.getGameForSocket(socket.id!);
  if (!game) return;

  const { newHostSocketId, tooFewPlayers } = game.handlePlayerRemoved(socket.id!);
  gm.removeSocketMapping(socket.id!);
  socket.leave(game.code);

  if (game.players.size === 0) {
    game.destroy();
    gm.removeGame(game.code);
    return;
  }

  socket.to(game.code).emit('room:player-left', {
    socketId: socket.id,
    newHostSocketId,
    tooFewPlayers,
  });
}
