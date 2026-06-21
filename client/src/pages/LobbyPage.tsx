import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import Header from '../components/layout/Header';
import Toast from '../components/ui/Toast';
import RulesModal from '../components/shared/RulesModal';
import { getAvatarColor } from '../utils/constants';

export default function LobbyPage() {
  const { code } = useParams<{ code: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, leaveRoom, startGame, clearError } = useGame();
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    if (!state.isInRoom && code) {
      navigate(`/?room=${code}`);
    }
  }, [state.isInRoom, code, navigate]);

  useEffect(() => {
    if (state.isInGame && state.roomCode) {
      navigate(`/room/${state.roomCode}/play`);
    }
  }, [state.isInGame, state.roomCode, navigate]);

  const canStart = state.isHost && state.players.length >= 3;

  return (
    <div className="min-h-screen flex flex-col bg-surface-dark relative">
      <div className="fixed inset-0 bg-gradient-to-b from-transparent to-red-950/15 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.05),transparent_60%)] pointer-events-none" />

      <Header roomCode={code} />

      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong w-full p-6 mb-5"
        >
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
            <span className="text-xl">👥</span>
            {t('lobby.players', { count: state.players.length, max: 10 })}
          </h2>

          <div className="space-y-2.5 mb-6">
            {state.players.map((player, i) => (
              <motion.div
                key={player.socketId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, type: 'spring', stiffness: 120 }}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.04]
                           hover:bg-white/[0.06] transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-lg"
                  style={{ backgroundColor: getAvatarColor(player.nickname) }}
                >
                  {player.nickname.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium flex-1">{player.nickname}</span>
                <div className="flex gap-2">
                  {player.isHost && (
                    <span className="px-2.5 py-0.5 text-xs rounded-full bg-brand-gold/15 text-brand-gold border border-brand-gold/20 font-medium">
                      {t('lobby.host')}
                    </span>
                  )}
                  {player.socketId === state.mySocketId && (
                    <span className="px-2.5 py-0.5 text-xs rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 font-medium">
                      {t('lobby.you')}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center text-sm text-gray-500 mb-5">
            {t('lobby.shareLink')}
          </div>

          {state.isHost ? (
            <button
              onClick={startGame}
              disabled={!canStart}
              className="btn-primary w-full text-lg py-4"
            >
              {canStart
                ? t('lobby.startGame')
                : t('lobby.needMorePlayers', { min: 3 })}
            </button>
          ) : (
            <div className="text-center py-4">
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-gray-400"
              >
                {t('lobby.waitingForHost')}
              </motion.div>
            </div>
          )}
        </motion.div>

        <div className="flex gap-5">
          <button
            onClick={() => setShowRules(true)}
            className="text-sm text-gray-500 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span>?</span> {t('home.howToPlay')}
          </button>
          <button
            onClick={() => {
              leaveRoom();
              navigate('/');
            }}
            className="text-sm text-gray-500 hover:text-red-400 transition-colors"
          >
            {t('results.leave')}
          </button>
        </div>
      </div>

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <Toast message={state.error} onClose={clearError} />
    </div>
  );
}
