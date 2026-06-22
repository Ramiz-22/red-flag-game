import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../ui/LanguageToggle';

interface HeaderProps {
  roomCode?: string;
  showScore?: boolean;
  onToggleScore?: () => void;
  onLeave?: () => void;
}

export default function Header({ roomCode, showScore, onToggleScore, onLeave }: HeaderProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!roomCode) return;
    const url = `${window.location.origin}/room/${roomCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-black/20 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
          {t('app.title')}
        </h1>
        {roomCode && (
          <button
            onClick={handleCopyCode}
            className="px-2.5 py-1 bg-white/[0.06] rounded-lg font-mono font-bold text-sm border border-white/[0.06]
                       hover:bg-white/[0.1] active:scale-95 transition-all cursor-pointer"
            style={{ color: copied ? '#4ade80' : '#d4a84b' }}
            title={t('lobby.copyLink')}
          >
            {copied ? `✓ ${t('lobby.copied')}` : roomCode}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {showScore !== undefined && (
          <button
            onClick={onToggleScore}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.06] text-sm
                       hover:bg-white/[0.1] transition-all"
          >
            🏆
          </button>
        )}
        {onLeave && (
          <button
            onClick={onLeave}
            className="btn-danger-outline text-sm py-1.5 px-3"
          >
            {t('game.exitGame')}
          </button>
        )}
        <LanguageToggle />
      </div>
    </header>
  );
}
