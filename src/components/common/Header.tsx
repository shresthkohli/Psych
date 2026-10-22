import React, { useState } from 'react';
import { Volume2, VolumeX, Copy, Check, Tv, Users } from 'lucide-react';
import { soundManager } from '../../lib/audio';

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
    <header className="w-full bg-psych-black/95 backdrop-blur border-b-2 border-psych-yellow/20 sticky top-0 z-40 px-4 py-2.5">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
        {/* Logo and Brand */}
        <a href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-psych-yellow flex items-center justify-center font-comic font-black text-psych-black text-xl shadow-brutal transform -rotate-2 group-hover:rotate-0 transition-transform">
            Ψ
          </div>
          <div>
            <span className="font-display font-extrabold text-xl tracking-tight text-white flex items-center gap-1">
              PSYCH
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-psych-red/90 text-white font-semibold tracking-wider uppercase ml-1">
                E-Cell
              </span>
            </span>
          </div>
        </a>

        {/* Center / Room Info */}
        {roomCode && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              title="Click to copy room code"
              className="flex items-center gap-1.5 px-3 py-1 bg-psych-dark hover:bg-neutral-800 border border-psych-yellow/40 rounded-md text-xs font-mono font-bold text-psych-yellow transition-all"
            >
              <span>{roomCode}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 opacity-70" />}
            </button>

            {playerCount !== undefined && (
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-psych-dark/80 rounded-md border border-neutral-800 text-xs text-neutral-300">
                <Users className="w-3.5 h-3.5 text-psych-yellow" />
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
              <Tv className="w-3.5 h-3.5 text-psych-yellow" />
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
                ? 'bg-psych-yellow text-psych-black border-psych-yellow shadow-brutal-pressed font-bold'
                : 'bg-psych-dark text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
