import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface CopyLinkProps {
  roomCode: string;
}

export default function CopyLink({ roomCode }: CopyLinkProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/room/${roomCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="px-2 py-1 text-xs rounded bg-surface-elevated hover:bg-surface-border
                 border border-surface-border transition-colors text-gray-300"
    >
      {copied ? t('lobby.copied') : t('lobby.copyLink')}
    </button>
  );
}
