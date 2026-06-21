import { useEffect, useState } from 'react';
import { formatTimer } from '../../utils/constants';
import clsx from 'clsx';

interface TimerProps {
  seconds: number | null;
}

export default function Timer({ seconds }: TimerProps) {
  const [display, setDisplay] = useState(seconds ?? 0);

  useEffect(() => {
    if (seconds !== null) setDisplay(seconds);
  }, [seconds]);

  useEffect(() => {
    if (display <= 0) return;
    const interval = setInterval(() => {
      setDisplay((d) => Math.max(0, d - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [display > 0]);

  if (seconds === null) return null;

  const urgent = display <= 10;
  const warning = display <= 20 && display > 10;

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-lg',
        urgent && 'bg-red-600/20 text-red-400 animate-pulse',
        warning && 'bg-yellow-600/20 text-yellow-400',
        !urgent && !warning && 'bg-surface-elevated text-white'
      )}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {formatTimer(display)}
    </div>
  );
}
