import React from 'react';
import { Lock, Shuffle } from 'lucide-react';

export const SubmissionLockedPhase: React.FC = () => {
  return (
    <div className="w-full max-w-md mx-auto py-12 text-center space-y-6 animate-fade-in">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-psych-yellow/10 border-2 border-psych-yellow flex items-center justify-center text-psych-yellow shadow-brutal animate-bounce">
        <Lock className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-display font-black text-white tracking-tight uppercase">
          Time's Up! Submissions Locked
        </h2>
        <p className="text-sm text-neutral-400">
          Shuffling responses anonymously. Voting begins in a few seconds...
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs font-mono text-psych-yellow bg-psych-dark p-3 rounded-xl border border-neutral-800">
        <Shuffle className="w-4 h-4 animate-spin" />
        <span>Randomizing card order...</span>
      </div>
    </div>
  );
};
