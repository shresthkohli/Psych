import React from 'react';
import { PauseCircle } from 'lucide-react';

interface PausedOverlayProps {
  isPaused: boolean;
}

export const PausedOverlay: React.FC<PausedOverlayProps> = ({ isPaused }) => {
  if (!isPaused) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="max-w-md w-full bg-psych-dark border-4 border-psych-yellow rounded-2xl p-6 text-center shadow-brutal space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-psych-yellow/10 border-2 border-psych-yellow flex items-center justify-center text-psych-yellow animate-pulse">
          <PauseCircle className="w-10 h-10" />
        </div>

        <div>
          <h2 className="text-2xl font-display font-black text-white tracking-tight uppercase">
            Game Paused
          </h2>
          <p className="text-sm text-neutral-300 mt-1">
            The host has temporarily paused the game. Timers and submissions are frozen.
          </p>
        </div>

        <div className="p-3 bg-psych-black rounded-xl border border-neutral-800 text-xs text-psych-yellow font-mono">
          Hang tight! The round will resume right where you left off.
        </div>
      </div>
    </div>
  );
};
