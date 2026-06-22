import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useGame } from '../contexts/GameContext';
import LanguageToggle from '../components/ui/LanguageToggle';
import RulesModal from '../components/shared/RulesModal';
import Toast from '../components/ui/Toast';

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, createRoom, joinRoom, clearError } = useGame();

  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState(searchParams.get('room') || '');
  const [mode, setMode] = useState<'home' | 'create' | 'join'>(
    searchParams.get('room') ? 'join' : 'home'
  );
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    if (state.isInRoom && state.roomCode) {
      navigate(`/room/${state.roomCode}`);
    }
  }, [state.isInRoom, state.roomCode, navigate]);

  const handleCreate = () => {
    if (nickname.trim().length < 2) return;
    createRoom(nickname.trim());
  };

  const handleJoin = () => {
    if (nickname.trim().length < 2 || roomCode.trim().length < 4) return;
    joinRoom(roomCode.trim(), nickname.trim());
  };

  const isValidNickname = nickname.trim().length >= 2 && nickname.trim().length <= 15;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background layers */}
      <div className="fixed inset-0 bg-surface-dark" />
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-transparent to-red-950/30" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.08),transparent_60%)]" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-[120px]" />

      {/* Decorative floating cards in background */}
      <motion.div
        animate={{ y: [0, -20, 0], rotate: [-6, -3, -6] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="fixed top-[15%] left-[8%] w-16 h-24 rounded-xl bg-white/[0.03] border border-white/[0.05] -rotate-6 hidden lg:block"
      />
      <motion.div
        animate={{ y: [0, 15, 0], rotate: [8, 12, 8] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="fixed top-[25%] right-[10%] w-14 h-20 rounded-xl bg-red-500/[0.04] border border-red-500/[0.06] rotate-12 hidden lg:block"
      />
      <motion.div
        animate={{ y: [0, -12, 0], rotate: [3, -2, 3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="fixed bottom-[20%] left-[12%] w-12 h-18 rounded-xl bg-yellow-500/[0.03] border border-yellow-500/[0.05] rotate-3 hidden lg:block"
      />

      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>

      {/* Title section */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="text-center mb-10 relative z-10"
      >
        <div className="relative inline-block">
          <h1 className="text-7xl sm:text-8xl font-extrabold tracking-tight relative">
            <span className="bg-gradient-to-b from-red-400 via-red-500 to-red-700 bg-clip-text text-transparent">
              {t('app.title')}
            </span>
          </h1>
          <div className="absolute -inset-4 bg-red-500/10 blur-2xl rounded-full -z-10" />
        </div>
        <p className="text-xl text-gray-300 mt-3 font-medium">{t('app.subtitle')}</p>
        <p className="text-sm text-gray-500 mt-2 tracking-wide">{t('app.tagline')}</p>
      </motion.div>

      {/* Main form card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.25, duration: 0.6, ease: 'easeOut' }}
        className="glass-strong w-full max-w-md p-8 relative z-10"
      >
        {mode === 'home' && (
          <div className="space-y-5">
            <div>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && isValidNickname) { setMode('create'); handleCreate(); } }}
                placeholder={t('home.enterNickname')}
                maxLength={15}
                className="w-full px-5 py-3.5 bg-white/[0.06] border border-white/10 rounded-xl
                           text-white placeholder-gray-500 focus:outline-none focus:border-brand-red/60
                           focus:bg-white/[0.08] transition-all duration-300 text-lg"
                dir="auto"
              />
            </div>

            <button
              onClick={() => {
                if (isValidNickname) {
                  setMode('create');
                  handleCreate();
                }
              }}
              disabled={!isValidNickname}
              className="btn-primary w-full text-lg py-4"
            >
              {t('home.createRoom')}
            </button>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="text-gray-600 text-xs uppercase tracking-widest">{t('home.or')}</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => {
                  let val = e.target.value;
                  const match = val.match(/\/room\/([A-Za-z0-9]+)/);
                  if (match) val = match[1];
                  setRoomCode(val.toUpperCase().slice(0, 6));
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' && isValidNickname && roomCode.trim().length >= 4) handleJoin(); }}
                placeholder={t('home.enterRoomCode')}
                className="w-full px-5 py-3.5 bg-white/[0.06] border border-white/10 rounded-xl
                           text-white placeholder-gray-500 focus:outline-none focus:border-brand-red/60
                           focus:bg-white/[0.08] transition-all duration-300
                           font-mono tracking-[0.3em] uppercase text-center text-lg"
              />
              <button
                onClick={() => {
                  if (isValidNickname && roomCode.trim().length >= 4) handleJoin();
                }}
                disabled={!isValidNickname || roomCode.trim().length < 4}
                className="btn-secondary w-full py-3.5 text-lg"
              >
                {t('home.joinRoom')}
              </button>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-5">
            <div className="text-center">
              <span className="text-gray-500 text-sm">{t('lobby.roomCode')}</span>
              <div className="text-2xl font-mono font-bold text-brand-gold tracking-[0.3em] mt-1">
                {roomCode}
              </div>
            </div>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && isValidNickname) handleJoin(); }}
              placeholder={t('home.enterNickname')}
              maxLength={15}
              className="w-full px-5 py-3.5 bg-white/[0.06] border border-white/10 rounded-xl
                         text-white placeholder-gray-500 focus:outline-none focus:border-brand-red/60
                         focus:bg-white/[0.08] transition-all duration-300 text-lg"
              dir="auto"
              autoFocus
            />
            <button
              onClick={handleJoin}
              disabled={!isValidNickname}
              className="btn-primary w-full text-lg py-4"
            >
              {t('home.joinRoom')}
            </button>
            <button
              onClick={() => setMode('home')}
              className="text-gray-500 text-sm hover:text-white transition-colors w-full text-center"
            >
              ← {t('results.leave')}
            </button>
          </div>
        )}
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={() => setShowRules(true)}
        className="mt-8 text-gray-500 hover:text-brand-red transition-all duration-300 text-sm
                   relative z-10 flex items-center gap-2"
      >
        {t('home.howToPlay')}
        <span className="text-lg">?</span>
      </motion.button>

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <Toast message={state.error} onClose={clearError} />
    </div>
  );
}
