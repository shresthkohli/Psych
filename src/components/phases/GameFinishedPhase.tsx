import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Download, RotateCcw, Medal, Crown } from 'lucide-react';
import { Room, Player, LeaderboardEntry } from '../../types/game';
import { computeLeaderboard } from '../../lib/gameLogic';
import { exportLeaderboardToCSV } from '../../lib/csvExport';
import { soundManager } from '../../lib/audio';

interface GameFinishedPhaseProps {
  room: Room;
  players: Player[];
  currentUserId: string;
  isHost?: boolean;
}

export const GameFinishedPhase: React.FC<GameFinishedPhaseProps> = ({
  room,
  players,
  currentUserId,
  isHost = false,
}) => {
  const leaderboard: LeaderboardEntry[] = computeLeaderboard(players, undefined, currentUserId);
  const first = leaderboard[0];
  const second = leaderboard[1];
  const third = leaderboard[2];

  useEffect(() => {
    soundManager.playWinnerFanfare();
    // Confetti cannon
    const end = Date.now() + 3000;
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD400', '#E62429', '#FFFFFF'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FFD400', '#E62429', '#FFFFFF'],
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const handleExportCSV = () => {
    exportLeaderboardToCSV(room.roomCode, leaderboard, room.roomName);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 animate-fade-in py-6">
      {/* Title */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-psych-yellow/15 border border-psych-yellow/40 text-psych-yellow text-xs font-mono font-bold tracking-wide uppercase">
          TOURNAMENT CONCLUDED
        </span>
        <h1 className="text-4xl md:text-5xl font-display font-black text-white tracking-tight uppercase">
          CHAMPIONS OF PSYCH
        </h1>
        <p className="text-sm text-neutral-400">
          Official Final Standings — E-Cell, SVNIT Surat
        </p>
      </div>

      {/* Podium (Top 3) */}
      {first && (
        <div className="flex items-end justify-center gap-3 pt-8 pb-4">
          {/* 2nd Place */}
          {second && (
            <div className="flex-1 max-w-[140px] text-center space-y-2">
              <div className="text-xs font-bold text-neutral-300 truncate">
                {second.displayName}
              </div>
              <div className="h-28 bg-neutral-800 border-2 border-neutral-600 rounded-t-2xl flex flex-col items-center justify-center p-2 shadow-lg">
                <span className="text-2xl font-black text-neutral-300">2</span>
                <span className="font-mono text-xs text-psych-yellow font-bold mt-1">
                  {second.totalScore} pts
                </span>
              </div>
            </div>
          )}

          {/* 1st Place Champion */}
          <div className="flex-1 max-w-[160px] text-center space-y-2 relative -top-4">
            <div className="w-10 h-10 mx-auto rounded-full bg-psych-yellow flex items-center justify-center text-psych-black shadow-brutal animate-bounce">
              <Crown className="w-6 h-6" />
            </div>
            <div className="text-sm font-extrabold text-white truncate px-1">
              {first.displayName}
            </div>
            <div className="h-36 bg-neutral-900 border-4 border-psych-yellow rounded-t-2xl flex flex-col items-center justify-center p-2 shadow-brutal-lg">
              <span className="text-4xl font-black text-psych-yellow">1</span>
              <span className="font-mono text-sm text-white font-extrabold mt-1">
                {first.totalScore} pts
              </span>
              <span className="text-[10px] uppercase font-bold text-psych-red tracking-wider">
                CHAMPION
              </span>
            </div>
          </div>

          {/* 3rd Place */}
          {third && (
            <div className="flex-1 max-w-[140px] text-center space-y-2">
              <div className="text-xs font-bold text-neutral-300 truncate">
                {third.displayName}
              </div>
              <div className="h-20 bg-neutral-900 border-2 border-amber-800 rounded-t-2xl flex flex-col items-center justify-center p-2 shadow-md">
                <span className="text-xl font-black text-amber-600">3</span>
                <span className="font-mono text-xs text-neutral-300 font-bold mt-1">
                  {third.totalScore} pts
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Complete Standings Table */}
      <div className="bg-psych-cardBg border-2 border-neutral-800 rounded-2xl p-5 shadow-brutal space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 pb-2 border-b border-neutral-800">
          Full Tournament Leaderboard ({leaderboard.length} Players)
        </h2>

        <div className="space-y-2">
          {leaderboard.map((entry) => (
            <div
              key={entry.playerId}
              className={`flex items-center justify-between p-3 rounded-xl border ${
                entry.isCurrentUser
                  ? 'bg-psych-yellow/15 border-psych-yellow text-white'
                  : 'bg-neutral-900/60 border-neutral-800 text-neutral-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 font-mono font-bold text-sm text-neutral-400">
                  #{entry.rank}
                </span>
                <span className="font-bold text-sm text-white">
                  {entry.displayName}
                </span>
                {entry.isCurrentUser && (
                  <span className="text-[10px] bg-psych-yellow text-black px-1.5 py-0.2 rounded font-black">
                    YOU
                  </span>
                )}
              </div>
              <div className="font-mono font-black text-base text-psych-yellow">
                {entry.totalScore.toLocaleString()} PTS
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
        <button
          onClick={handleExportCSV}
          className="w-full sm:w-auto px-6 py-3 bg-neutral-900 hover:bg-neutral-800 border-2 border-psych-yellow text-psych-yellow font-extrabold text-sm rounded-xl btn-brutal flex items-center justify-center gap-2 uppercase tracking-wider"
        >
          <Download className="w-4 h-4" />
          <span>EXPORT FINAL CSV</span>
        </button>

        <a
          href="/"
          className="w-full sm:w-auto px-6 py-3 bg-psych-yellow hover:bg-yellow-400 text-psych-black font-extrabold text-sm rounded-xl btn-brutal flex items-center justify-center gap-2 uppercase tracking-wider"
        >
          <RotateCcw className="w-4 h-4" />
          <span>START NEW GAME</span>
        </a>
      </div>
    </div>
  );
};
