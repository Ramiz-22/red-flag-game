import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useWindowSize } from '../hooks/useWindowSize';
import Header from '../components/layout/Header';
import Toast from '../components/ui/Toast';
import { GamePhase } from '@shared/types';
import type { Card } from '@shared/types';
import { getAvatarColor } from '../utils/constants';

type Edge = 'top' | 'left' | 'right' | 'bottom';
interface Zone {
  seat: { x: number; y: number };
  date: { x: number; y: number };
  edge: Edge;
}

// Hand-tuned anchors for the "other" players (relative index 1..total-1),
// ordered going clockwise. Each player owns a seat at the screen edge and a
// date-card row pulled toward the central band so rows never overlap nameplates.
const OTHER_LAYOUTS: Record<number, Zone[]> = {
  3: [
    { seat: { x: 28, y: 10 }, date: { x: 30, y: 36 }, edge: 'top' },
    { seat: { x: 72, y: 10 }, date: { x: 70, y: 36 }, edge: 'top' },
  ],
  4: [
    { seat: { x: 15, y: 12 }, date: { x: 20, y: 36 }, edge: 'top' },
    { seat: { x: 50, y: 8  }, date: { x: 50, y: 32 }, edge: 'top' },
    { seat: { x: 85, y: 12 }, date: { x: 80, y: 36 }, edge: 'top' },
  ],
  5: [
    { seat: { x: 7,  y: 52 }, date: { x: 15, y: 52 }, edge: 'left' },
    { seat: { x: 35, y: 7  }, date: { x: 35, y: 30 }, edge: 'top' },
    { seat: { x: 65, y: 7  }, date: { x: 65, y: 30 }, edge: 'top' },
    { seat: { x: 93, y: 52 }, date: { x: 85, y: 52 }, edge: 'right' },
  ],
  6: [
    { seat: { x: 6,  y: 62 }, date: { x: 14, y: 62 }, edge: 'left' },
    { seat: { x: 25, y: 6  }, date: { x: 25, y: 28 }, edge: 'top' },
    { seat: { x: 50, y: 4  }, date: { x: 50, y: 24 }, edge: 'top' },
    { seat: { x: 75, y: 6  }, date: { x: 75, y: 28 }, edge: 'top' },
    { seat: { x: 94, y: 62 }, date: { x: 86, y: 62 }, edge: 'right' },
  ],
  // 7-10: U-shaped perimeter (left column up → top row → right column down).
  // Date rows are scaled down (see getDateScale) so the wider counts never overlap.
  7: [
    { seat: { x: 6,  y: 66 }, date: { x: 16, y: 66 }, edge: 'left' },
    { seat: { x: 6,  y: 34 }, date: { x: 16, y: 34 }, edge: 'left' },
    { seat: { x: 38, y: 8  }, date: { x: 38, y: 27 }, edge: 'top' },
    { seat: { x: 62, y: 8  }, date: { x: 62, y: 27 }, edge: 'top' },
    { seat: { x: 94, y: 34 }, date: { x: 84, y: 34 }, edge: 'right' },
    { seat: { x: 94, y: 66 }, date: { x: 84, y: 66 }, edge: 'right' },
  ],
  8: [
    { seat: { x: 6,  y: 66 }, date: { x: 15, y: 66 }, edge: 'left' },
    { seat: { x: 6,  y: 34 }, date: { x: 15, y: 34 }, edge: 'left' },
    { seat: { x: 33, y: 7  }, date: { x: 33, y: 25 }, edge: 'top' },
    { seat: { x: 50, y: 5  }, date: { x: 50, y: 23 }, edge: 'top' },
    { seat: { x: 67, y: 7  }, date: { x: 67, y: 25 }, edge: 'top' },
    { seat: { x: 94, y: 34 }, date: { x: 85, y: 34 }, edge: 'right' },
    { seat: { x: 94, y: 66 }, date: { x: 85, y: 66 }, edge: 'right' },
  ],
  9: [
    { seat: { x: 5,  y: 72 }, date: { x: 15, y: 72 }, edge: 'left' },
    { seat: { x: 5,  y: 46 }, date: { x: 15, y: 46 }, edge: 'left' },
    { seat: { x: 5,  y: 20 }, date: { x: 15, y: 20 }, edge: 'left' },
    { seat: { x: 40, y: 7  }, date: { x: 40, y: 18 }, edge: 'top' },
    { seat: { x: 60, y: 7  }, date: { x: 60, y: 18 }, edge: 'top' },
    { seat: { x: 95, y: 20 }, date: { x: 85, y: 20 }, edge: 'right' },
    { seat: { x: 95, y: 46 }, date: { x: 85, y: 46 }, edge: 'right' },
    { seat: { x: 95, y: 72 }, date: { x: 85, y: 72 }, edge: 'right' },
  ],
  10: [
    { seat: { x: 5,  y: 72 }, date: { x: 15, y: 72 }, edge: 'left' },
    { seat: { x: 5,  y: 46 }, date: { x: 15, y: 46 }, edge: 'left' },
    { seat: { x: 5,  y: 20 }, date: { x: 15, y: 20 }, edge: 'left' },
    { seat: { x: 34, y: 6  }, date: { x: 34, y: 16 }, edge: 'top' },
    { seat: { x: 50, y: 4  }, date: { x: 50, y: 14 }, edge: 'top' },
    { seat: { x: 66, y: 6  }, date: { x: 66, y: 16 }, edge: 'top' },
    { seat: { x: 95, y: 20 }, date: { x: 85, y: 20 }, edge: 'right' },
    { seat: { x: 95, y: 46 }, date: { x: 85, y: 46 }, edge: 'right' },
    { seat: { x: 95, y: 72 }, date: { x: 85, y: 72 }, edge: 'right' },
  ],
};

// Date rows shrink as the table fills up so the wider player counts stay tidy.
function getDateScale(total: number): number {
  if (total <= 6) return 1;
  if (total === 7) return 0.85;
  if (total === 8) return 0.8;
  if (total === 9) return 0.72;
  return 0.68; // 10
}

// Position of a player relative to "you". relativeIndex 0 is always you (bottom).
function getZone(relativeIndex: number, total: number): Zone {
  if (relativeIndex === 0) {
    return { seat: { x: 50, y: 87 }, date: { x: 50, y: 72 }, edge: 'bottom' };
  }

  const others = OTHER_LAYOUTS[total];
  if (others) return others[relativeIndex - 1];

  // Fallback (>10 players): spread others along an inverted-∩ arc
  // (lower-left → top → lower-right), skipping the bottom where you sit.
  const count = total - 1;
  const t = (relativeIndex - 1 + 0.5) / count;
  const startAngle = (200 * Math.PI) / 180;
  const endAngle = (-20 * Math.PI) / 180;
  const angle = startAngle + (endAngle - startAngle) * t;
  const cx = 50, cy = 44;
  const seat = { x: cx + 45 * Math.cos(angle), y: cy - 42 * Math.sin(angle) };
  const date = { x: cx + 27 * Math.cos(angle), y: cy - 24 * Math.sin(angle) };
  const edge: Edge = seat.x < 25 ? 'left' : seat.x > 75 ? 'right' : 'top';
  return { seat, date, edge };
}

export default function GamePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { state, selectPerks, playRedFlag, judgePick, leaveRoom, startGame, clearError } = useGame();

  const [selectedPerks, setSelectedPerks] = useState<string[]>([]);
  const [selectedRedFlag, setSelectedRedFlag] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [lockedIn, setLockedIn] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const { width: vw } = useWindowSize();

  const isJudge = state.mySocketId === state.judgeSocketId;
  const phase = state.phase as GamePhase;
  const myIndex = Math.max(0, state.players.findIndex(p => p.socketId === state.mySocketId));

  useEffect(() => {
    if (!state.isInGame && !state.isInRoom) navigate('/');
  }, [state.isInGame, state.isInRoom, navigate]);

  useEffect(() => {
    setSelectedPerks([]);
    setSelectedRedFlag(null);
    setSelectedTarget(null);
    setLockedIn(false);
  }, [phase, state.roundNumber]);

  useEffect(() => {
    if (phase === GamePhase.RED_FLAG_PLAY && !lockedIn) {
      const targets = state.availableTargets.filter(t => t.socketId !== state.mySocketId);
      if (selectedTarget) {
        const stillAvailable = targets.some(t => t.socketId === selectedTarget);
        if (!stillAvailable) {
          setSelectedTarget(null);
        }
      }
      if (!selectedTarget && targets.length === 1) {
        setSelectedTarget(targets[0].socketId);
      }
    }
  }, [state.availableTargets, phase, selectedTarget, lockedIn, state.mySocketId]);

  useEffect(() => {
    if (state.error && lockedIn && (phase === GamePhase.PERK_SELECTION || phase === GamePhase.RED_FLAG_PLAY)) {
      setLockedIn(false);
    }
  }, [state.error, lockedIn, phase]);

  const handlePerkSelect = (cardId: string) => {
    if (lockedIn) return;
    setSelectedPerks((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length >= 2) return prev;
      return [...prev, cardId];
    });
  };

  const handlePerkLockIn = () => {
    if (selectedPerks.length === 2) {
      selectPerks(selectedPerks);
      setLockedIn(true);
    }
  };

  const handleRedFlagLockIn = () => {
    if (selectedRedFlag && selectedTarget) {
      playRedFlag(selectedRedFlag, selectedTarget);
      setLockedIn(true);
    }
  };

  const handleExitGame = () => { leaveRoom(); navigate('/'); };
  const renderCardText = (card: Card) => card.text[lang] || card.text.en;
  const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);

  const showCardFan = !isJudge && (phase === GamePhase.PERK_SELECTION || phase === GamePhase.RED_FLAG_PLAY);

  const roundWinnerPlayer = state.roundWinner
    ? state.players.find(p => p.socketId === state.roundWinner)
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-surface-dark relative overflow-x-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,#1a0a0a_0%,#0f0808_40%,#080505_100%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(220,38,38,0.06),transparent_70%)]" />

      <div className="relative z-10">
        <Header roomCode={state.roomCode || ''} showScore onToggleScore={() => setShowScoreboard(!showScoreboard)} onLeave={() => setShowExitConfirm(true)} />
      </div>

      <div className="flex-1 flex flex-col relative z-10">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-sm font-medium text-gray-300">
              {t('game.round', { number: state.roundNumber })}
            </span>
            {isJudge ? (
              <span className="px-3 py-1.5 rounded-lg bg-yellow-500/15 border border-yellow-500/25 text-sm font-medium text-yellow-400">
                👑 {t('game.youAreJudge')}
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/25 text-sm font-medium text-blue-400">
                🃏 {t('game.youAreMatchmaker')}
              </span>
            )}
          </div>
        </div>

        <motion.div key={`${phase}-${state.roundNumber}`} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-center px-4 mb-1">
          <PhaseTitle phase={phase} isJudge={isJudge} state={state} t={t} />
        </motion.div>

        {phase === GamePhase.GAME_OVER ? (
          <GameOverView state={state} sortedPlayers={sortedPlayers} startGame={startGame} handleExitGame={handleExitGame} t={t} />
        ) : (
          <>
            {/* ============ GAME AREA (per-player zones) ============ */}
            <div className="flex-1 relative min-h-0">
              {(() => {
                const total = state.players.length;
                const dateScale = getDateScale(total);
                return (
                  <>
                    {/* Judge nameplate (rendered separately since judge has no date cards) */}
                    {state.players.map((p, i) => {
                      const isPlayerJudge = p.socketId === state.judgeSocketId;
                      if (!isPlayerJudge) return null;

                      const isSelf = p.socketId === state.mySocketId;
                      const zone = getZone((i - myIndex + total) % total, total);

                      return (
                        <motion.div
                          key={p.socketId}
                          className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                          style={{ left: `${zone.seat.x}%`, top: `${zone.seat.y}%` }}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 22 }}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                              className="text-xl leading-none">👑</motion.div>
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-sm text-xs font-medium border whitespace-nowrap ${
                              isSelf
                                ? 'bg-red-500/15 border-red-500/25 text-red-300 ring-1 ring-white/20'
                                : 'bg-red-500/15 border-red-500/25 text-red-300'
                            }`}>
                              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                                style={{ backgroundColor: getAvatarColor(p.nickname) }}>
                                {p.nickname.charAt(0).toUpperCase()}
                              </div>
                              <span className="max-w-[70px] truncate">{p.nickname}</span>
                              {isSelf && <span className="text-blue-400/70 text-[9px]">({t('lobby.you')})</span>}
                              {p.score > 0 && <span className="text-red-400 font-bold">{p.score}</span>}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}

                    {/* Each non-judge player's nameplate + date row */}
                    {state.players.map((p, i) => {
                      const isPlayerJudge = p.socketId === state.judgeSocketId;
                      if (isPlayerJudge) return null;

                      const isSelf = p.socketId === state.mySocketId;
                      const isReady = state.playersReady.includes(p.socketId);
                      const hasRedFlag = state.dates.some(d => d.matchmakerSocketId === p.socketId && d.redFlag);
                      const zone = getZone((i - myIndex + total) % total, total);
                      const date = state.dates.find(d => d.matchmakerSocketId === p.socketId);
                      const revealed = !!date && (
                        phase === GamePhase.RED_FLAG_PLAY ||
                        phase === GamePhase.REVEAL ||
                        phase === GamePhase.JUDGING ||
                        phase === GamePhase.ROUND_RESULT
                      );
                      const isWinner = p.socketId === state.roundWinner;
                      const canPick = phase === GamePhase.JUDGING && isJudge && !lockedIn && !!date;

                      // Hide self entirely while the card fan is open (it occupies the center).
                      if (isSelf && showCardFan) return null;

                      // Side-column players get their name beside the cards (toward the
                      // screen edge) so stacked rows never overlap; top/bottom go above.
                      const flexDir =
                        zone.edge === 'left' ? 'flex-row' :
                        zone.edge === 'right' ? 'flex-row-reverse' :
                        'flex-col';
                      const nameMargin =
                        zone.edge === 'left' ? 'mr-2' :
                        zone.edge === 'right' ? 'ml-2' :
                        'mb-2';

                      return (
                        <div
                          key={`date-${p.socketId}`}
                          dir="ltr"
                          className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 flex items-center ${flexDir}`}
                          style={{ left: `${zone.date.x}%`, top: `${zone.date.y}%` }}
                        >
                          {/* Nameplate beside / above the cards */}
                          <motion.div
                            className={`${nameMargin} z-20 shrink-0`}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 22 }}
                          >
                            <div className="flex flex-col items-center gap-1">
                              {isReady && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
                                  className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold shadow-lg">
                                  ✓
                                </motion.div>
                              )}
                              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-sm text-xs font-medium border whitespace-nowrap ${
                                isSelf
                                  ? 'bg-white/[0.08] border-white/20 text-white'
                                  : 'bg-black/50 border-white/[0.08] text-gray-300'
                              }`}>
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                                  style={{ backgroundColor: getAvatarColor(p.nickname) }}>
                                  {p.nickname.charAt(0).toUpperCase()}
                                </div>
                                <span className="max-w-[70px] truncate" dir="auto">{p.nickname}</span>
                                {isSelf && <span className="text-blue-400/70 text-[9px]">({t('lobby.you')})</span>}
                                {p.score > 0 && <span className="text-red-400 font-bold">{p.score}</span>}
                                {hasRedFlag && <span className="text-[9px]">🚩</span>}
                              </div>
                            </div>
                          </motion.div>
                          {revealed && date ? (
                            <motion.div
                              className={canPick ? 'cursor-pointer' : ''}
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              whileHover={canPick ? { scale: 1.08, transition: { type: 'spring', stiffness: 400, damping: 20 } } : undefined}
                              transition={{ delay: i * 0.08, type: 'spring', stiffness: 200, damping: 20 }}
                              onClick={() => canPick && judgePick(p.socketId)}
                            >
                              <div className={`flex gap-1 ${isWinner ? 'drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]' : ''}`}
                                style={{ transform: `scale(${dateScale})`, transformOrigin: 'center' }}>
                                {date.perks.map((perk, pi) => (
                                  <motion.div key={perk.id}
                                    initial={{ rotateY: -90, opacity: 0 }}
                                    animate={{ rotateY: 0, opacity: 1 }}
                                    transition={{ delay: i * 0.08 + pi * 0.08, type: 'spring', stiffness: 200, damping: 18 }}
                                    className="poker-card poker-card-white poker-card-table">
                                    <div className="poker-card-inner">
                                      <div className="poker-card-corner top">♥</div>
                                      <div className="poker-card-body" dir="auto">{renderCardText(perk)}</div>
                                      <div className="poker-card-corner bottom">♥</div>
                                    </div>
                                  </motion.div>
                                ))}
                                {date.redFlag ? (
                                  <motion.div
                                    initial={{ rotateY: -90, opacity: 0, scale: 0.9 }}
                                    animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.08 + 0.25, type: 'spring', stiffness: 180, damping: 16 }}
                                    className="poker-card poker-card-red poker-card-table">
                                    <div className="poker-card-inner">
                                      <div className="poker-card-corner top">🚩</div>
                                      <div className="poker-card-body" dir="auto">{renderCardText(date.redFlag)}</div>
                                      <div className="poker-card-corner bottom">🚩</div>
                                    </div>
                                  </motion.div>
                                ) : phase === GamePhase.RED_FLAG_PLAY ? (
                                  <div className="poker-card poker-card-back poker-card-table">
                                    <div className="poker-card-back-pattern">?</div>
                                  </div>
                                ) : null}
                              </div>
                            </motion.div>
                          ) : (
                            <div className="flex gap-1" style={{ transform: `scale(${dateScale})`, transformOrigin: 'center' }}>
                              {[0, 1, 2].map(s => <div key={s} className="poker-card-slot" />)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>

            {/* ============ CARD SELECTION (below table) ============ */}

            {phase === GamePhase.PERK_SELECTION && !isJudge && (
              <div className="absolute inset-x-0 bottom-0 z-40 pb-4 px-4">
                <p className="text-center text-xs text-gray-500 mb-2">{t('game.selected', { count: selectedPerks.length })}</p>
                <div className="relative flex justify-center items-end mx-auto max-w-4xl w-full" style={{ minHeight: 'min(200px, 35vh)' }}>
                  {state.myHand?.perks.map((card, i, arr) => {
                    const total = arr.length;
                    const mid = (total - 1) / 2;
                    const offset = i - mid;
                    const angle = offset * 3.5;
                    const translateX = offset * Math.min(52, vw / 14);
                    const translateY = Math.abs(offset) * 5;
                    const isSelected = selectedPerks.includes(card.id);
                    return (
                      <motion.div key={card.id} layout
                        initial={{ y: 120, opacity: 0, rotate: 0 }}
                        animate={{ y: isSelected ? -35 - translateY : translateY, opacity: 1, rotate: angle, x: translateX, scale: isSelected ? 1.08 : 1 }}
                        whileHover={!lockedIn ? { y: -50, scale: 1.22, zIndex: 50, rotate: 0, transition: { type: 'spring', stiffness: 400, damping: 20, mass: 0.5 } } : undefined}
                        transition={{ type: 'spring', stiffness: 300, damping: 22, mass: 0.8 }}
                        onClick={() => handlePerkSelect(card.id)}
                        className={`poker-card poker-card-white absolute cursor-pointer ${
                          isSelected ? 'ring-2 ring-red-400 shadow-[0_0_30px_rgba(220,38,38,0.4)]' : ''
                        } ${lockedIn ? 'pointer-events-none opacity-50' : ''}`}
                        style={{ zIndex: isSelected ? 25 : 10 + i }}>
                        <div className="poker-card-inner">
                          <div className="poker-card-corner top">♥</div>
                          <div className="poker-card-body" dir="auto">{renderCardText(card)}</div>
                          <div className="poker-card-corner bottom">♥</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                <div className="mt-6 text-center">
                  {!lockedIn ? (
                    <button onClick={handlePerkLockIn} disabled={selectedPerks.length !== 2} aria-label={t('game.lockIn')} className="btn-primary px-12 py-3 text-lg">{t('game.lockIn')}</button>
                  ) : (
                    <p className="text-green-400 font-medium animate-pulse">{t('game.waiting')}</p>
                  )}
                </div>
              </div>
            )}

            {phase === GamePhase.RED_FLAG_PLAY && !isJudge && (
              <div className="absolute inset-x-0 bottom-0 z-40 px-4 pb-4">
                {!lockedIn && (
                  <div className="flex justify-center gap-2 mb-3 flex-wrap relative z-30">
                    <span className="text-xs text-gray-500 self-center me-2">{t('game.chooseTarget')}:</span>
                    {state.availableTargets
                      .filter(tgt => tgt.socketId !== state.mySocketId)
                      .map(tgt => (
                        <motion.button
                          key={tgt.socketId}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedTarget(tgt.socketId)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                            selectedTarget === tgt.socketId
                              ? 'bg-red-500/20 border-red-500/50 text-red-300 shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                              : 'bg-black/30 border-white/10 text-gray-300 hover:border-red-500/30'
                          }`}
                        >
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                            style={{ backgroundColor: getAvatarColor(tgt.nickname) }}>
                            {tgt.nickname.charAt(0).toUpperCase()}
                          </div>
                          {tgt.nickname}
                        </motion.button>
                      ))}
                  </div>
                )}

                <div className="relative flex justify-center items-end mx-auto max-w-3xl w-full" style={{ minHeight: 'min(200px, 35vh)' }}>
                  {state.myHand?.redFlags.map((card, i, arr) => {
                    const total = arr.length;
                    const mid = (total - 1) / 2;
                    const offset = i - mid;
                    const angle = offset * 5;
                    const translateX = offset * Math.min(75, vw / 10);
                    const translateY = Math.abs(offset) * 3;
                    const isSelected = selectedRedFlag === card.id;
                    return (
                      <motion.div key={card.id} layout
                        initial={{ y: 120, opacity: 0, rotate: 0 }}
                        animate={{ y: isSelected ? -35 - translateY : translateY, opacity: 1, rotate: angle, x: translateX, scale: isSelected ? 1.08 : 1 }}
                        whileHover={!lockedIn ? { y: -50, scale: 1.22, zIndex: 50, rotate: 0, transition: { type: 'spring', stiffness: 400, damping: 20, mass: 0.5 } } : undefined}
                        transition={{ type: 'spring', stiffness: 300, damping: 22, mass: 0.8 }}
                        onClick={() => !lockedIn && setSelectedRedFlag(card.id)}
                        className={`poker-card poker-card-red absolute cursor-pointer ${
                          isSelected ? 'ring-2 ring-white/70 shadow-[0_0_30px_rgba(220,38,38,0.6)]' : ''
                        } ${lockedIn ? 'pointer-events-none opacity-50' : ''}`}
                        style={{ zIndex: isSelected ? 25 : 10 + i }}>
                        <div className="poker-card-inner">
                          <div className="poker-card-corner top">🚩</div>
                          <div className="poker-card-body" dir="auto">{renderCardText(card)}</div>
                          <div className="poker-card-corner bottom">🚩</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="mt-6 text-center">
                  {!lockedIn ? (
                    <button onClick={handleRedFlagLockIn} disabled={!selectedRedFlag || !selectedTarget} aria-label={t('game.lockIn')} className="btn-primary px-12 py-3 text-lg">
                      {t('game.lockIn')}
                    </button>
                  ) : (
                    <p className="text-green-400 font-medium animate-pulse">{t('game.waiting')}</p>
                  )}
                </div>
              </div>
            )}

            {phase === GamePhase.PERK_SELECTION && isJudge && state.playersReady.length > 0 && (
              <div className="shrink-0 flex flex-wrap gap-2 justify-center px-4 pb-4">
                {state.playersReady.map(sid => {
                  const p = state.players.find(pl => pl.socketId === sid);
                  return p ? (
                    <motion.span key={sid} initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="px-3 py-1 bg-green-500/15 text-green-400 rounded-full text-xs border border-green-500/20">
                      {p.nickname} ✓
                    </motion.span>
                  ) : null;
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ============ ROUND WINNER BANNER ============ */}
      <AnimatePresence>
        {phase === GamePhase.ROUND_RESULT && roundWinnerPlayer && (
          <motion.div
            className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/30" />
            <motion.div
              className="relative text-center"
              initial={{ scale: 0.3, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.6, opacity: 0, y: -30 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14 }}
            >
              <motion.div
                className="text-7xl sm:text-8xl mb-4"
                animate={{ scale: [1, 1.25, 1], rotate: [0, 8, -8, 0] }}
                transition={{ duration: 0.7, repeat: 3 }}
              >🎉</motion.div>
              <div className="bg-black/70 backdrop-blur-xl border border-red-500/30 rounded-2xl px-8 sm:px-14 py-6 sm:py-8 shadow-[0_0_80px_rgba(220,38,38,0.25)]">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-lg"
                    style={{ backgroundColor: getAvatarColor(roundWinnerPlayer.nickname) }}>
                    {roundWinnerPlayer.nickname.charAt(0).toUpperCase()}
                  </div>
                </div>
                <h2 className="text-2xl sm:text-4xl font-extrabold bg-gradient-to-r from-red-300 via-white to-red-300 bg-clip-text text-transparent">
                  {t('results.roundWinner', { name: roundWinnerPlayer.nickname })}
                </h2>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scoreboard */}
      <AnimatePresence>
        {showScoreboard && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowScoreboard(false)} className="fixed inset-0 bg-black/40 z-30" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 end-0 h-full w-72 bg-surface-dark/95 backdrop-blur-xl border-s border-white/[0.06] p-5 z-40 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg">🏆 {t('results.finalScores')}</h3>
                <button onClick={() => setShowScoreboard(false)} className="text-gray-500 hover:text-white text-lg">✕</button>
              </div>
              {sortedPlayers.map((p, i) => (
                <div key={p.socketId} className={`flex items-center gap-3 py-2.5 px-3 rounded-xl mb-1.5 ${
                  p.socketId === state.judgeSocketId ? 'bg-red-500/10 border border-red-500/10' : ''}`}>
                  <span className="text-sm font-bold text-gray-500 w-5">{i + 1}</span>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: getAvatarColor(p.nickname) }}>{p.nickname.charAt(0).toUpperCase()}</div>
                  <span className="flex-1 text-sm font-medium">{p.nickname}</span>
                  {p.socketId === state.judgeSocketId && <span className="text-xs">👑</span>}
                  <span className="text-red-400 font-bold text-sm">{p.score}</span>
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Exit confirm */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowExitConfirm(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-strong p-6 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
              <div className="text-4xl mb-4">🚪</div>
              <h3 className="text-lg font-bold mb-2">{t('game.exitConfirmTitle')}</h3>
              <p className="text-gray-400 text-sm mb-6">{t('game.exitConfirmDesc')}</p>
              <div className="flex gap-3">
                <button onClick={() => setShowExitConfirm(false)} className="btn-secondary flex-1">{t('game.stayInGame')}</button>
                <button onClick={handleExitGame} className="btn-danger-outline flex-1 py-3">{t('game.exitGame')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast message={state.error} onClose={clearError} />
    </div>
  );
}

function GameOverView({ state, sortedPlayers, startGame, handleExitGame, t }: any) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 80 }} className="text-center">
        <div className="text-8xl mb-6">🎉</div>
        <h2 className="text-4xl font-extrabold bg-gradient-to-r from-red-400 via-red-300 to-red-500 bg-clip-text text-transparent mb-2">
          {t('results.gameWinner', { name: state.players.find((p: any) => p.socketId === state.roundWinner)?.nickname || '' })}
        </h2>
        <div className="glass-strong p-5 mt-8 max-w-sm mx-auto">
          <h3 className="font-bold mb-4 text-gray-300">{t('results.finalScores')}</h3>
          {sortedPlayers.map((p: any, i: number) => (
            <div key={p.socketId} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
              <span className="text-lg font-bold text-gray-600 w-6">{i + 1}</span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md"
                style={{ backgroundColor: getAvatarColor(p.nickname) }}>{p.nickname.charAt(0).toUpperCase()}</div>
              <span className="flex-1 font-medium">{p.nickname}</span>
              <span className="text-red-400 font-bold">{t('results.score', { score: p.score })}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-8 justify-center">
          {state.isHost && <button onClick={startGame} className="btn-primary px-8">{t('results.playAgain')}</button>}
          <button onClick={handleExitGame} className="btn-secondary">{t('results.leave')}</button>
        </div>
      </motion.div>
    </div>
  );
}

function PhaseTitle({ phase, isJudge, state, t }: { phase: GamePhase; isJudge: boolean; state: any; t: any }) {
  let text = '';
  switch (phase) {
    case GamePhase.PERK_SELECTION:
      text = isJudge ? t('game.youAreJudge') : t('game.selectPerks', { judge: state.judgeNickname }); break;
    case GamePhase.RED_FLAG_PLAY:
      text = isJudge ? t('game.waiting') : t('game.chooseTargetAndCard'); break;
    case GamePhase.REVEAL:
      text = t('game.revealingDates'); break;
    case GamePhase.JUDGING:
      text = isJudge ? t('game.pickWinner') : t('game.judgePicking', { judge: state.judgeNickname }); break;
    case GamePhase.ROUND_RESULT: {
      const w = state.players.find((p: any) => p.socketId === state.roundWinner);
      text = t('results.roundWinner', { name: w?.nickname || '' }); break;
    }
    case GamePhase.GAME_OVER: {
      const gw = state.players.find((p: any) => p.socketId === state.roundWinner);
      text = t('results.gameWinner', { name: gw?.nickname || '' }); break;
    }
  }
  return <h2 className="text-lg font-bold text-white/90">{text}</h2>;
}
