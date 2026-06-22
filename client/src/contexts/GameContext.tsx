import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import { useSocket } from './SocketContext';
import type {
  ClientGameState,
  PublicPlayer,
  GamePhase,
  HandDealtPayload,
  PhaseChangedPayload,
  DatesRevealedPayload,
  RoundResultPayload,
  GameOverPayload,
  GameStartedPayload,
  RedFlagTargetPayload,
  RoomCreatedPayload,
  RoomJoinedPayload,
} from '@shared/types';

interface GameStore extends ClientGameState {
  roomCode: string | null;
  mySocketId: string | null;
  isHost: boolean;
  isInRoom: boolean;
  isInGame: boolean;
  error: string | null;
}

type Action =
  | { type: 'SET_SOCKET_ID'; payload: string }
  | { type: 'ROOM_CREATED'; payload: RoomCreatedPayload }
  | { type: 'ROOM_JOINED'; payload: RoomJoinedPayload }
  | { type: 'PLAYER_JOINED'; payload: PublicPlayer }
  | { type: 'PLAYER_LEFT'; payload: { socketId: string; newHostSocketId?: string } }
  | { type: 'GAME_STARTED'; payload: GameStartedPayload }
  | { type: 'HAND_DEALT'; payload: HandDealtPayload }
  | { type: 'PHASE_CHANGED'; payload: PhaseChangedPayload }
  | { type: 'PLAYER_READY'; payload: string[] }
  | { type: 'RED_FLAG_TARGET'; payload: RedFlagTargetPayload }
  | { type: 'RED_FLAG_TARGETS'; payload: { availableTargets: { socketId: string; nickname: string }[]; playedBy: string[] } }
  | { type: 'DATES_REVEALED'; payload: DatesRevealedPayload }
  | { type: 'ROUND_RESULT'; payload: RoundResultPayload }
  | { type: 'GAME_OVER'; payload: GameOverPayload }
  | { type: 'TIMER_TICK'; payload: number }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LEAVE_ROOM' };

const initialState: GameStore = {
  roomCode: null,
  mySocketId: null,
  isHost: false,
  isInRoom: false,
  isInGame: false,
  error: null,
  phase: 'LOBBY' as GamePhase,
  roundNumber: 0,
  judgeSocketId: '',
  judgeNickname: '',
  players: [],
  myHand: null,
  dates: [],
  redFlagTarget: null,
  availableTargets: [],
  roundWinner: null,
  timer: null,
  playersReady: [],
};

function reducer(state: GameStore, action: Action): GameStore {
  switch (action.type) {
    case 'SET_SOCKET_ID':
      return { ...state, mySocketId: action.payload };

    case 'ROOM_CREATED':
    case 'ROOM_JOINED': {
      const p = action.payload;
      const mySocketId = state.mySocketId;
      return {
        ...state,
        roomCode: p.roomCode,
        players: p.players,
        isHost: p.players.some((pl) => pl.socketId === mySocketId && pl.isHost),
        isInRoom: true,
        phase: 'LOBBY' as GamePhase,
        error: null,
      };
    }

    case 'PLAYER_JOINED':
      return {
        ...state,
        players: [...state.players, action.payload],
      };

    case 'PLAYER_LEFT': {
      const updated = state.players.filter((p) => p.socketId !== action.payload.socketId);
      const isHost = action.payload.newHostSocketId
        ? action.payload.newHostSocketId === state.mySocketId
        : state.isHost;
      if (action.payload.newHostSocketId) {
        const idx = updated.findIndex((p) => p.socketId === action.payload.newHostSocketId);
        if (idx >= 0) updated[idx] = { ...updated[idx], isHost: true };
      }
      return { ...state, players: updated, isHost };
    }

    case 'GAME_STARTED':
      return {
        ...state,
        isInGame: true,
        phase: 'PERK_SELECTION' as GamePhase,
        roundNumber: 1,
        judgeSocketId: action.payload.judgeSocketId,
        judgeNickname: action.payload.judgeNickname,
        dates: [],
        roundWinner: null,
        playersReady: [],
      };

    case 'HAND_DEALT':
      return {
        ...state,
        myHand: { perks: action.payload.perks, redFlags: action.payload.redFlags },
      };

    case 'PHASE_CHANGED':
      return {
        ...state,
        phase: action.payload.phase,
        timer: action.payload.timer,
        roundNumber: action.payload.roundNumber,
        judgeSocketId: action.payload.judgeSocketId,
        judgeNickname: action.payload.judgeNickname,
        playersReady: [],
        redFlagTarget: null,
        ...(action.payload.phase === ('PERK_SELECTION' as GamePhase) ? { dates: [], roundWinner: null } : {}),
      };

    case 'PLAYER_READY':
      return { ...state, playersReady: action.payload };

    case 'RED_FLAG_TARGET':
      return { ...state, redFlagTarget: action.payload };

    case 'RED_FLAG_TARGETS':
      return { ...state, availableTargets: action.payload.availableTargets };

    case 'DATES_REVEALED':
      return { ...state, dates: action.payload.dates };

    case 'ROUND_RESULT': {
      const updatedPlayers = state.players.map((p) => ({
        ...p,
        score: action.payload.scores[p.socketId] ?? p.score,
      }));
      return {
        ...state,
        roundWinner: action.payload.winnerSocketId,
        players: updatedPlayers,
      };
    }

    case 'GAME_OVER': {
      const finalPlayers = state.players.map((p) => ({
        ...p,
        score: action.payload.finalScores[p.socketId] ?? p.score,
      }));
      return {
        ...state,
        phase: 'GAME_OVER' as GamePhase,
        roundWinner: action.payload.winnerSocketId,
        players: finalPlayers,
      };
    }

    case 'TIMER_TICK':
      return { ...state, timer: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'LEAVE_ROOM':
      return { ...initialState, mySocketId: state.mySocketId };

    default:
      return state;
  }
}

interface GameContextType {
  state: GameStore;
  createRoom: (nickname: string) => void;
  joinRoom: (roomCode: string, nickname: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  selectPerks: (cardIds: string[]) => void;
  playRedFlag: (cardId: string, targetSocketId: string) => void;
  judgePick: (winnerSocketId: string) => void;
  kickPlayer: (targetSocketId: string) => void;
  clearError: () => void;
}

const GameContext = createContext<GameContextType>({} as GameContextType);

export function GameProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!socket) return;

    socket.on('connect', () => {
      dispatch({ type: 'SET_SOCKET_ID', payload: socket.id! });
    });

    if (socket.id) {
      dispatch({ type: 'SET_SOCKET_ID', payload: socket.id });
    }

    socket.on('room:created', (data: RoomCreatedPayload) => {
      dispatch({ type: 'ROOM_CREATED', payload: data });
    });

    socket.on('room:joined', (data: RoomJoinedPayload) => {
      dispatch({ type: 'ROOM_JOINED', payload: data });
    });

    socket.on('room:player-joined', (data: PublicPlayer) => {
      dispatch({ type: 'PLAYER_JOINED', payload: data });
    });

    socket.on('room:player-left', (data: { socketId: string; newHostSocketId?: string }) => {
      dispatch({ type: 'PLAYER_LEFT', payload: data });
    });

    socket.on('room:error', (data: { message: string }) => {
      dispatch({ type: 'SET_ERROR', payload: data.message });
    });

    socket.on('room:kicked', () => {
      dispatch({ type: 'LEAVE_ROOM' });
    });

    socket.on('game:started', (data: GameStartedPayload) => {
      dispatch({ type: 'GAME_STARTED', payload: data });
    });

    socket.on('game:hand-dealt', (data: HandDealtPayload) => {
      dispatch({ type: 'HAND_DEALT', payload: data });
    });

    socket.on('game:phase-changed', (data: PhaseChangedPayload) => {
      dispatch({ type: 'PHASE_CHANGED', payload: data });
    });

    socket.on('game:perk-selection-update', (data: { playersReady: string[] }) => {
      dispatch({ type: 'PLAYER_READY', payload: data.playersReady });
    });

    socket.on('game:redflag-target', (data: RedFlagTargetPayload) => {
      dispatch({ type: 'RED_FLAG_TARGET', payload: data });
    });

    socket.on('game:redflag-targets', (data: { availableTargets: { socketId: string; nickname: string }[]; playedBy: string[] }) => {
      dispatch({ type: 'RED_FLAG_TARGETS', payload: data });
    });

    socket.on('game:dates-revealed', (data: DatesRevealedPayload) => {
      dispatch({ type: 'DATES_REVEALED', payload: data });
    });

    socket.on('game:round-result', (data: RoundResultPayload) => {
      dispatch({ type: 'ROUND_RESULT', payload: data });
    });

    socket.on('game:over', (data: GameOverPayload) => {
      dispatch({ type: 'GAME_OVER', payload: data });
    });

    socket.on('game:timer-tick', (data: { secondsRemaining: number }) => {
      dispatch({ type: 'TIMER_TICK', payload: data.secondsRemaining });
    });

    return () => {
      socket.off('connect');
      socket.off('room:created');
      socket.off('room:joined');
      socket.off('room:player-joined');
      socket.off('room:player-left');
      socket.off('room:error');
      socket.off('room:kicked');
      socket.off('game:started');
      socket.off('game:hand-dealt');
      socket.off('game:phase-changed');
      socket.off('game:perk-selection-update');
      socket.off('game:redflag-target');
      socket.off('game:redflag-targets');
      socket.off('game:dates-revealed');
      socket.off('game:round-result');
      socket.off('game:over');
      socket.off('game:timer-tick');
    };
  }, [socket]);

  const createRoom = useCallback((nickname: string) => {
    socket?.emit('room:create', { nickname });
  }, [socket]);

  const joinRoom = useCallback((roomCode: string, nickname: string) => {
    socket?.emit('room:join', { roomCode: roomCode.toUpperCase(), nickname });
  }, [socket]);

  const leaveRoom = useCallback(() => {
    socket?.emit('room:leave');
    dispatch({ type: 'LEAVE_ROOM' });
  }, [socket]);

  const startGame = useCallback(() => {
    socket?.emit('game:start');
  }, [socket]);

  const selectPerks = useCallback((cardIds: string[]) => {
    socket?.emit('game:select-perks', { cardIds });
  }, [socket]);

  const playRedFlag = useCallback((cardId: string, targetSocketId: string) => {
    socket?.emit('game:play-redflag', { cardId, targetSocketId });
  }, [socket]);

  const judgePick = useCallback((winnerSocketId: string) => {
    socket?.emit('game:judge-pick', { winnerSocketId });
  }, [socket]);

  const kickPlayer = useCallback((targetSocketId: string) => {
    socket?.emit('room:kick', { targetSocketId });
  }, [socket]);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  return (
    <GameContext.Provider
      value={{
        state,
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        selectPerks,
        playRedFlag,
        judgePick,
        kickPlayer,
        clearError,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
