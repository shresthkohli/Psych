import React from 'react';
import { Trophy, Medal, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { LeaderboardEntry } from '../../types/game';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  highlightCurrentUser?: boolean;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  entries,
  highlightCurrentUser = true,
}) => {
  return (
    <div className="w-full bg-psych-cardBg border-2 border-psych-yellow/40 rounded-2xl p-5 shadow-brutal space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-psych-yellow" />
          <h2 className="text-base font-display font-extrabold text-white uppercase tracking-wider">
            Live Standings
          </h2>
        </div>
        <span className="text-xs font-mono text-neutral-400">
          Competition Ranking (1st, 2nd, 2nd, 4th)
        </span>
      </div>

      <div className="space-y-2">
        {entries.map((entry, index) => {
          const isTop1 = entry.rank === 1;
          const isTop2 = entry.rank === 2;
          const isTop3 = entry.rank === 3;

          return (
            <div
              key={entry.playerId}
              className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${
                entry.isCurrentUser && highlightCurrentUser
                  ? 'bg-psych-yellow/15 border-psych-yellow shadow-brutal ring-1 ring-psych-yellow'
                  : isTop1
                  ? 'bg-neutral-900 border-psych-yellow/60'
                  : 'bg-neutral-900/60 border-neutral-800'
              }`}
            >
              {/* Rank and Name */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg font-black text-sm flex items-center justify-center flex-shrink-0 ${
                    isTop1
                      ? 'bg-psych-yellow text-psych-black shadow-brutal'
                      : isTop2
                      ? 'bg-neutral-200 text-neutral-900'
                      : isTop3
                      ? 'bg-amber-700 text-white'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {entry.rank}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white truncate">
                      {entry.displayName}
                    </span>
                    {entry.isCurrentUser && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-psych-yellow text-psych-black font-black rounded uppercase">
                        YOU
                      </span>
                    )}
                  </div>
                  {entry.roundScore !== undefined && (
                    <span className="text-[11px] font-mono text-green-400">
                      +{entry.roundScore} this round
                    </span>
                  )}
                </div>
              </div>

              {/* Total Score with Round Score explicitly beside it */}
              <div className="text-right flex-shrink-0 ml-3">
                <div className="flex items-baseline justify-end gap-1.5">
                  <span className="font-mono font-black text-lg md:text-xl text-psych-yellow">
                    {entry.totalScore.toLocaleString()}
                  </span>
                  {entry.roundScore !== undefined && (
                    <span className="font-mono text-xs font-extrabold text-green-400">
                      (+{entry.roundScore} this round)
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold text-neutral-400 block -mt-0.5 uppercase tracking-wider">
                  TOTAL PTS
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
