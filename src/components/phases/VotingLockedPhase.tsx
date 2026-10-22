import React from 'react';
import { Award, Loader2 } from 'lucide-react';

export const VotingLockedPhase: React.FC = () => {
  return (
    <div className="w-full max-w-md mx-auto py-12 text-center space-y-6 animate-fade-in">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-psych-yellow/10 border-2 border-psych-yellow flex items-center justify-center text-psych-yellow shadow-brutal animate-pulse">
        <Award className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-display font-black text-white tracking-tight uppercase">
          Voting Closed!
        </h2>
        <p className="text-sm text-neutral-400">
          Tallying votes, checking for ties, and awarding bonus points...
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs font-mono text-psych-yellow bg-psych-dark p-3 rounded-xl border border-neutral-800">
        <Loader2 className="w-4 h-4 animate-spin text-psych-yellow" />
        <span>Calculating authoritative round scores...</span>
      </div>
    </div>
  );
};
