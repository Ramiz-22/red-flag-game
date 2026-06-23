import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../ui/LanguageToggle';

interface HeaderProps {
  roomCode?: string;
  showScore?: boolean;
  notify?: boolean;
  onToggleScore?: () => void;
  onLeave?: () => void;
}

export default function Header({ roomCode, showScore, notify, onToggleScore, onLeave }: HeaderProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!roomCode) return;
    const url = `${window.location.origin}/room/${roomCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Shared sizing so every header button is the same height, shape and spacing.
  // Compact on narrow phones (smaller padding) so the row never overflows.
  const btn = 'h-8 sm:h-9 px-2.5 sm:px-3 inline-flex items-center justify-center rounded-lg text-xs sm:text-sm whitespace-nowrap transition-all active:scale-95';

  return (
    <header className="flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 border-b border-white/[0.06] bg-black/20 backdrop-blur-sm">
      <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent shrink-0">
        {t('app.title')}
      </h1>
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        {roomCode && (
          <button
            onClick={handleCopyCode}
            aria-label={t('lobby.copyLink')}
            className={`${btn} font-mono font-bold bg-white/[0.06] border border-white/[0.06] hover:bg-white/[0.1] cursor-pointer`}
            style={{ color: copied ? '#4ade80' : '#d4a84b' }}
            title={t('lobby.copyLink')}
          >
            {copied ? `✓ ${t('lobby.copied')}` : roomCode}
          </button>
        )}
        {showScore !== undefined && (
          <button
            onClick={onToggleScore}
            aria-label="Scoreboard"
            className={`${btn} relative bg-white/[0.06] border border-white/[0.06] hover:bg-white/[0.1]`}
          >
            🏆
            {notify && (
              <span className="absolute -top-1 -end-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-surface-dark animate-pulse" />
            )}
          </button>
        )}
        {onLeave && (
          <button
            onClick={onLeave}
            aria-label={t('game.exitGame')}
            title={t('game.exitGame')}
            className={`${btn} text-red-400 font-medium border border-red-500/30 bg-red-500/[0.08] hover:bg-red-500/[0.18]`}
          >
            <span className="hidden sm:inline">{t('game.exitGame')}</span>
            <span className="sm:hidden">{t('results.leave')}</span>
          </button>
        )}
        <LanguageToggle className={btn} />
      </div>
    </header>
  );
}
