import React from 'react';
import { X, Award, CheckCircle2, Trophy, HelpCircle } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-psych-dark border-2 border-psych-yellow rounded-2xl shadow-brutal p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-psych-yellow/10 rounded-lg border border-psych-yellow/30 text-psych-yellow">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-display font-extrabold text-white tracking-tight">HOW SCORING WORKS</h2>
              <p className="text-xs text-neutral-400">Official PSYCH Scoring Rules — E-Cell SVNIT</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Rules */}
        {/* Content Rules */}
        <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Rule 1 */}
          <div className="flex gap-3 p-3.5 rounded-xl bg-psych-black border border-psych-yellow/40">
            <div className="p-2 h-fit rounded-lg bg-psych-yellow text-psych-black font-black text-sm">
              +1
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">1 Vote = 1 Point</h3>
              <p className="text-xs text-neutral-300 mt-0.5">
                Every valid vote your anonymous response receives gives you <strong className="text-psych-yellow">+1 score point</strong>.
                If nobody votes for your answer, you receive <strong className="text-neutral-400">0 points</strong>.
              </p>
              <div className="mt-1 font-mono text-[11px] text-psych-yellow">
                Formula: Round Points = Number of Votes Received
              </div>
            </div>
          </div>

          {/* Rule 2 */}
          <div className="flex gap-3 p-3.5 rounded-xl bg-psych-black border border-neutral-800">
            <div className="p-2 h-fit rounded-lg bg-neutral-800 text-white font-black text-sm border border-neutral-700">
              🚫
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">No Self-Voting</h3>
              <p className="text-xs text-neutral-300 mt-0.5">
                You cannot vote for your own response. Try to fool others with the funniest or most creative answers!
              </p>
            </div>
          </div>

          {/* Example Box */}
          <div className="p-4 rounded-xl bg-neutral-900/90 border border-psych-yellow/30 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-psych-yellow uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5" />
              <span>Example Calculation</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              If your response gets <strong>4 players</strong> to vote for it:
            </p>
            <div className="p-2 bg-psych-black rounded-lg font-mono text-xs text-neutral-200 space-y-0.5">
              <div>4 votes received = +4 pts</div>
              <div className="pt-1 border-t border-neutral-800 text-psych-yellow font-bold">
                Round Score = 4 points!
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-psych-yellow hover:bg-yellow-400 text-psych-black font-extrabold text-sm rounded-xl btn-brutal uppercase tracking-wider"
          >
            GOT IT, LET'S PLAY!
          </button>
        </div>
      </div>
    </div>
  );
};
