import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import { useLanguage } from '../contexts/LanguageContext';
import Header from '../components/layout/Header';
import Timer from '../components/ui/Timer';
import Toast from '../components/ui/Toast';
import { GamePhase } from '@shared/types';
import type { Card } from '@shared/types';
import { getAvatarColor } from '../utils/constants';

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

  const isJudge = state.mySocketId === state.judgeSocketId;
  const phase = state.phase as GamePhase;

  useEffect(() => {
    if (!state.isInGame && !state.isInRoom) navigate('/');
  }, [state.isInGame, state.isInRoom, navigate]);

  useEffect(() => {
    setSelectedPerks([]);
    setSelectedRedFlag(null);
    setSelectedTarget(null);
    setLockedIn(false);
  }, [phase, state.roundNumber]);

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

  const showTable =
    phase === GamePhase.RED_FLAG_PLAY ||
    phase === GamePhase.REVEAL ||
    phase === GamePhase.JUDGING ||
    phase === GamePhase.ROUND_RESULT;

  return (
    <div className="min-h-screen flex flex-col bg-surface-dark relative overflow-hidden">
      {/* Dark red/black background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,#1a0a0a_0%,#0f0808_40%,#080505_100%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(220,38,38,0.06),transparent_70%)]" />

      <div className="relative z-10">
        <Header roomCode={state.roomCode || ''} showScore onToggleScore={() => setShowScoreboard(!showScoreboard)} onLeave={() => setShowExitConfirm(true)} />
      </div>

      <div className="flex-1 flex flex-col relative z-10">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3">
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
          <Timer seconds={state.timer} />
        </div>

        {/* Phase instruction */}
        <motion.div key={`${phase}-${state.roundNumber}`} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-center px-4 mb-3">
          <PhaseTitle phase={phase} isJudge={isJudge} state={state} t={t} />
        </motion.div>

        {/* ============ PLAYER SEATS (always visible during game) ============ */}
        <div className="flex justify-center gap-3 px-4 mb-3 flex-wrap">
          {state.players.map((p) => {
            const isSelf = p.socketId === state.mySocketId;
            const isPlayerJudge = p.socketId === state.judgeSocketId;
            const hasRedFlag = state.dates.some((d) => d.matchmakerSocketId === p.socketId && d.redFlag);
            return (
              <motion.div
                key={p.socketId}
                layout
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                  isPlayerJudge
                    ? 'bg-red-500/10 border-red-500/25 text-red-300'
                    : isSelf
                    ? 'bg-white/[0.06] border-white/15 text-white'
                    : 'bg-black/20 border-white/[0.06] text-gray-400'
                }`}
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ backgroundColor: getAvatarColor(p.nickname) }}>
                  {p.nickname.charAt(0).toUpperCase()}
                </div>
                <span>{p.nickname}</span>
                {isPlayerJudge && <span>👑</span>}
                {isSelf && !isPlayerJudge && <span className="text-blue-400">({t('lobby.you')})</span>}
                <span className="text-red-400 font-bold">{p.score > 0 ? p.score : ''}</span>
                {hasRedFlag && <span className="text-[10px]">🚩</span>}
              </motion.div>
            );
          })}
        </div>

        {/* ============ TABLE VIEW ============ */}
        {showTable && state.dates.length > 0 && (
          <div className="flex-1 flex items-center justify-center px-4 pb-4">
            <div className="relative w-full max-w-4xl">
              <div className="mx-auto rounded-[50%] border-[6px] shadow-[inset_0_4px_30px_rgba(0,0,0,0.6),0_8px_40px_rgba(0,0,0,0.5)]"
                style={{ aspectRatio: '2.2/1', maxHeight: '50vh', background: 'radial-gradient(ellipse at center, #1c1010 0%, #140a0a 50%, #0d0606 100%)', borderColor: 'rgba(220, 38, 38, 0.2)' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-wrap gap-5 justify-center items-start px-8 max-w-full">
                  {state.dates.map((date, i) => {
                    const isMe = date.matchmakerSocketId === state.mySocketId;
                    const isWinner = date.matchmakerSocketId === state.roundWinner;
                    const canPick = phase === GamePhase.JUDGING && isJudge && !lockedIn;
                    return (
                      <motion.div
                        key={date.matchmakerSocketId}
                        initial={{ opacity: 0, scale: 0.85, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        whileHover={canPick ? { y: -8, scale: 1.06, transition: { type: 'spring', stiffness: 400, damping: 20 } } : undefined}
                        transition={{ delay: i * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
                        onClick={() => canPick && judgePick(date.matchmakerSocketId)}
                        className={`relative ${canPick ? 'cursor-pointer' : ''} ${isWinner ? 'scale-105' : ''}`}
                      >
                        <div className="text-center mb-2">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/10">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                              style={{ backgroundColor: getAvatarColor(date.matchmakerNickname) }}>
                              {date.matchmakerNickname.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium text-gray-200">
                              {date.matchmakerNickname}
                              {isMe && <span className="text-blue-400 ms-1">({t('lobby.you')})</span>}
                            </span>
                            {isWinner && <span className="text-sm">👑</span>}
                          </div>
                        </div>
                        <div className={`flex gap-1.5 ${isWinner ? 'drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]' : ''}`}>
                          {date.perks.map((perk, pi) => (
                            <motion.div key={perk.id}
                              initial={{ rotateY: -90, opacity: 0 }}
                              animate={{ rotateY: 0, opacity: 1 }}
                              transition={{ delay: i * 0.1 + pi * 0.08, type: 'spring', stiffness: 200, damping: 18 }}
                              className="poker-card poker-card-white">
                              <div className="poker-card-inner">
                                <div className="poker-card-corner top">♥</div>
                                <div className="poker-card-body" dir="auto">{renderCardText(perk)}</div>
                                <div className="poker-card-corner bottom">♥</div>
                              </div>
                            </motion.div>
                          ))}
                          {date.redFlag && (
                            <motion.div
                              initial={{ rotateY: -90, opacity: 0, scale: 0.9 }}
                              animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.1 + 0.25, type: 'spring', stiffness: 180, damping: 16 }}
                              className="poker-card poker-card-red">
                              <div className="poker-card-inner">
                                <div className="poker-card-corner top">🚩</div>
                                <div className="poker-card-body" dir="auto">{renderCardText(date.redFlag)}</div>
                                <div className="poker-card-corner bottom">🚩</div>
                              </div>
                            </motion.div>
                          )}
                          {!date.redFlag && phase === GamePhase.RED_FLAG_PLAY && (
                            <div className="poker-card poker-card-back">
                              <div className="poker-card-back-pattern">?</div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ PERK SELECTION ============ */}
        {phase === GamePhase.PERK_SELECTION && !isJudge && (
          <div className="flex-1 flex flex-col justify-end pb-6 px-4">
            <p className="text-center text-sm text-gray-400 mb-3">{t('game.selected', { count: selectedPerks.length })}</p>
            <div className="relative flex justify-center items-end mx-auto max-w-4xl w-full" style={{ minHeight: '200px' }}>
              {state.myHand?.perks.map((card, i, arr) => {
                const total = arr.length;
                const mid = (total - 1) / 2;
                const offset = i - mid;
                const angle = offset * 3.5;
                const translateX = offset * 52;
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
            <div className="mt-8 text-center">
              {!lockedIn ? (
                <button onClick={handlePerkLockIn} disabled={selectedPerks.length !== 2} className="btn-primary px-12 py-3.5 text-lg">{t('game.lockIn')}</button>
              ) : (
                <p className="text-green-400 font-medium animate-pulse">{t('game.waiting')}</p>
              )}
            </div>
          </div>
        )}

        {/* ============ RED FLAG: Target Selection + Card Selection ============ */}
        {phase === GamePhase.RED_FLAG_PLAY && !isJudge && (
          <div className="px-4 pb-6">
            {/* Target selection */}
            {!lockedIn && (
              <div className="flex justify-center gap-2 mb-4 flex-wrap">
                <span className="text-sm text-gray-500 self-center me-2">{t('game.chooseTarget')}:</span>
                {state.availableTargets
                  .filter((tgt) => tgt.socketId !== state.mySocketId)
                  .map((tgt) => (
                    <motion.button
                      key={tgt.socketId}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedTarget(tgt.socketId)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                        selectedTarget === tgt.socketId
                          ? 'bg-red-500/20 border-red-500/50 text-red-300 shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                          : 'bg-black/30 border-white/10 text-gray-300 hover:border-red-500/30'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: getAvatarColor(tgt.nickname) }}>
                        {tgt.nickname.charAt(0).toUpperCase()}
                      </div>
                      {tgt.nickname}
                    </motion.button>
                  ))}
              </div>
            )}

            {/* Red flag cards hand */}
            <div className="relative flex justify-center items-end mx-auto max-w-3xl w-full" style={{ minHeight: '180px' }}>
              {state.myHand?.redFlags.map((card, i, arr) => {
                const total = arr.length;
                const mid = (total - 1) / 2;
                const offset = i - mid;
                const angle = offset * 5;
                const translateX = offset * 75;
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

            <div className="mt-8 text-center">
              {!lockedIn ? (
                <button onClick={handleRedFlagLockIn} disabled={!selectedRedFlag || !selectedTarget} className="btn-primary px-12 py-3.5 text-lg">
                  {t('game.lockIn')}
                </button>
              ) : (
                <p className="text-green-400 font-medium animate-pulse">{t('game.waiting')}</p>
              )}
            </div>
          </div>
        )}

        {/* ============ JUDGE WAITING ============ */}
        {phase === GamePhase.PERK_SELECTION && isJudge && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-7xl mb-6">💝</motion.div>
            <p className="text-gray-400 text-lg">{t('game.waiting')}</p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {state.playersReady.map((sid) => {
                const p = state.players.find((pl) => pl.socketId === sid);
                return p ? (
                  <motion.span key={sid} initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="px-4 py-1.5 bg-green-500/15 text-green-400 rounded-full text-sm border border-green-500/20">
                    {p.nickname} ✓
                  </motion.span>
                ) : null;
              })}
            </div>
          </div>
        )}

        {phase === GamePhase.RED_FLAG_PLAY && isJudge && (
          <div className="text-center pb-4">
            <p className="text-gray-400 animate-pulse">{t('game.waiting')}</p>
          </div>
        )}

        {/* ============ GAME OVER ============ */}
        {phase === GamePhase.GAME_OVER && (
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 80 }} className="text-center">
              <div className="text-8xl mb-6">🎉</div>
              <h2 className="text-4xl font-extrabold bg-gradient-to-r from-red-400 via-red-300 to-red-500 bg-clip-text text-transparent mb-2">
                {t('results.gameWinner', { name: state.players.find((p) => p.socketId === state.roundWinner)?.nickname || '' })}
              </h2>
              <div className="glass-strong p-5 mt-8 max-w-sm mx-auto">
                <h3 className="font-bold mb-4 text-gray-300">{t('results.finalScores')}</h3>
                {sortedPlayers.map((p, i) => (
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
        )}
      </div>

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
