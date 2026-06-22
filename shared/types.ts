export interface Card {
  id: string;
  type: 'perk' | 'redflag';
  text: {
    en: string;
    fa: string;
  };
}

export interface PublicPlayer {
  socketId: string;
  nickname: string;
  score: number;
  isConnected: boolean;
  isHost: boolean;
}

export interface RoomSettings {
  maxPlayers: number;
  winScore: number;
  perkTimer: number;
  redFlagTimer: number;
  argumentTimer: number;
  judgingTimer: number;
}

export interface DateProfile {
  matchmakerSocketId: string;
  matchmakerNickname: string;
  perks: Card[];
  redFlags: Card[];
}

export enum GamePhase {
  LOBBY = 'LOBBY',
  PERK_SELECTION = 'PERK_SELECTION',
  RED_FLAG_PLAY = 'RED_FLAG_PLAY',
  REVEAL = 'REVEAL',
  ARGUMENT = 'ARGUMENT',
  JUDGING = 'JUDGING',
  ROUND_RESULT = 'ROUND_RESULT',
  GAME_OVER = 'GAME_OVER',
}

export interface ClientGameState {
  phase: GamePhase;
  roundNumber: number;
  judgeSocketId: string;
  judgeNickname: string;
  players: PublicPlayer[];
  myHand: {
    perks: Card[];
    redFlags: Card[];
  } | null;
  dates: DateProfile[];
  redFlagTarget: { socketId: string; nickname: string } | null;
  availableTargets: { socketId: string; nickname: string }[];
  roundWinner: string | null;
  timer: number | null;
  playersReady: string[];
}

// Socket event payloads
export interface RoomCreatedPayload {
  roomCode: string;
  players: PublicPlayer[];
  settings: RoomSettings;
}

export interface RoomJoinedPayload {
  roomCode: string;
  players: PublicPlayer[];
  settings: RoomSettings;
}

export interface GameStartedPayload {
  playerOrder: string[];
  judgeSocketId: string;
  judgeNickname: string;
}

export interface HandDealtPayload {
  perks: Card[];
  redFlags: Card[];
}

export interface PhaseChangedPayload {
  phase: GamePhase;
  timer: number | null;
  roundNumber: number;
  judgeSocketId: string;
  judgeNickname: string;
}

export interface RedFlagTargetPayload {
  targetSocketId: string;
  targetNickname: string;
}

export interface DatesRevealedPayload {
  dates: DateProfile[];
}

export interface RoundResultPayload {
  winnerSocketId: string;
  winnerNickname: string;
  scores: Record<string, number>;
}

export interface GameOverPayload {
  winnerSocketId: string;
  winnerNickname: string;
  finalScores: Record<string, number>;
}

export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'GAME_IN_PROGRESS'
  | 'NICKNAME_TAKEN'
  | 'NOT_HOST'
  | 'INVALID_CARDS'
  | 'NOT_YOUR_TURN'
  | 'INVALID_PHASE'
  | 'MIN_PLAYERS';
