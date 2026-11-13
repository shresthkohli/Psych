import React, { useState } from 'react';
import { Volume2, VolumeX, Copy, Check, Tv, Users } from 'lucide-react';
import { soundManager } from '../../lib/audio';
import { APP_INFO } from '../../constants/appInfo';

interface HeaderProps {
  roomCode?: string;
  playerCount?: number;
  isHost?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ roomCode, playerCount, isHost }) => {
  const [soundEnabled, setSoundEnabled] = useState(soundManager.enabled);
  const [copied, setCopied] = useState(false);

  const handleToggleSound = () => {
    const nextState = soundManager.toggle();
    setSoundEnabled(nextState);
  };

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="w-full bg-outwit-black/95 backdrop-blur border-b-2 border-outwit-yellow/20 sticky top-0 z-40 px-4 py-2.5">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
        {/* Logo and Brand */}
        <a href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-outwit-yellow flex items-center justify-center font-comic font-black text-outwit-black text-xl shadow-brutal transform -rotate-2 group-hover:rotate-0 transition-transform">
            {APP_INFO.LOGO_GLYPH}
          </div>
          <div>
            <span className="font-display font-extrabold text-xl tracking-tight text-white flex items-center gap-1">
              {APP_INFO.NAME}
            </span>
          </div>
        </a>

        {/* Center / Room Info */}
        {roomCode && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              title="Click to copy room code"
              className="flex items-center gap-1.5 px-3 py-1 bg-outwit-dark hover:bg-neutral-800 border border-outwit-yellow/40 rounded-md text-xs font-mono font-bold text-outwit-yellow transition-all"
            >
              <span>{roomCode}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 opacity-70" />}
            </button>

            {playerCount !== undefined && (
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-outwit-dark/80 rounded-md border border-neutral-800 text-xs text-neutral-300">
                <Users className="w-3.5 h-3.5 text-outwit-yellow" />
                <span>{playerCount}</span>
              </div>
            )}
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {roomCode && (
            <a
              href={`/display/${roomCode}`}
              target="_blank"
              rel="noreferrer"
              title="Open Projector Presentation Screen"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-md text-xs font-medium text-neutral-300 hover:text-white transition-colors"
            >
              <Tv className="w-3.5 h-3.5 text-outwit-yellow" />
              <span>Projector</span>
            </a>
          )}

          {/* Sound Toggle Button */}
          <button
            onClick={handleToggleSound}
            aria-label="Toggle Sound Effects"
            title={soundEnabled ? 'Sound is ON (Click to Mute)' : 'Sound is OFF (Click to Enable)'}
            className={`p-2 rounded-md border transition-all ${
              soundEnabled
                ? 'bg-outwit-yellow text-outwit-black border-outwit-yellow shadow-brutal-pressed font-bold'
                : 'bg-outwit-dark text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
