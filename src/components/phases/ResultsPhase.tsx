import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Star, ArrowRight, UserCheck, Flame } from 'lucide-react';
import { Room, Round, Answer, RoundScore, Player, LeaderboardEntry } from '../../types/game';
import { Leaderboard } from '../leaderboard/Leaderboard';
import { computeLeaderboard } from '../../lib/gameLogic';
import { soundManager } from '../../lib/audio';

interface ResultsPhaseProps {
  room: Room;
  round: Round;
  answers: Answer[];
  players: Player[];
  scores: Record<string, RoundScore>;
  currentUserId: string;
  isHost?: boolean;
  onNextRound?: () => void;
  onEndGame?: () => void;
}

export const ResultsPhase: React.FC<ResultsPhaseProps> = ({
  room,
  round,
  answers,
  players,
  scores,
  currentUserId,
  isHost = false,
  onNextRound,
  onEndGame,
}) => {
  const [revealStage, setRevealStage] = useState<number>(1);

  // Map author names to answers
  const playerMap = React.useMemo(() => {
    return new Map(players.map((p) => [p.id, p]));
  }, [players]);

  // Helper to reliably retrieve vote count for any answer
  const getAnswerVotes = React.useCallback(
    (ans: Answer) => {
      if (typeof ans.voteCount === 'number') {
        return ans.voteCount;
      }
      const authorScore = scores[ans.authorPlayerId];
      if (authorScore && typeof authorScore.totalRoundPoints === 'number') {
        return authorScore.totalRoundPoints; // 1 vote = 1 point
      }
      return 0;
    },
    [scores]
  );

  // Sort answers by vote count (highest votes first)
  const sortedAnswers = React.useMemo(() => {
    return [...answers].sort((a, b) => {
      return getAnswerVotes(b) - getAnswerVotes(a);
    });
  }, [answers, getAnswerVotes]);

  const maxVotes = sortedAnswers[0] ? getAnswerVotes(sortedAnswers[0]) : 0;

  // Staged Reveal Progression
  useEffect(() => {
    soundManager.playReveal();

    const t1 = setTimeout(() => {
      setRevealStage(2); // Reveal authors & votes
    }, 1200);

    const t2 = setTimeout(() => {
      setRevealStage(3); // Highlight winners & scores
      if (maxVotes > 0) {
        soundManager.playWinnerFanfare();
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#FFD400', '#E62429', '#FFFFFF'],
        });
      }
    }, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [maxVotes]);

  const leaderboardEntries: LeaderboardEntry[] = computeLeaderboard(
    players,
    scores,
    currentUserId
  );

  const currentUserScore = scores[currentUserId];
  const isFinalRound = room.currentRoundNumber >= room.settings.totalRounds;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Round Results Header */}
      <div className="text-center space-y-1">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-psych-yellow/15 border border-psych-yellow/40 text-psych-yellow text-xs font-mono font-bold tracking-wide uppercase">
          ROUND {round.roundNumber} COMPLETE
        </span>
        <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight">
          THE RESULTS ARE IN!
        </h1>
        <p className="text-xs md:text-sm text-neutral-400">
          "{round.question}"
        </p>
      </div>

      {/* User's Round Summary Card */}
      {currentUserScore && (
        <div className="bg-psych-cardBg border-2 border-psych-yellow rounded-2xl p-5 shadow-brutal flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              YOUR ROUND EARNINGS
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-mono font-black text-psych-yellow">
                +{currentUserScore.totalRoundPoints} PTS
              </span>
              <span className="text-xs px-2.5 py-0.5 bg-neutral-800 text-neutral-200 font-bold rounded-full">
                {currentUserScore.totalRoundPoints} vote{currentUserScore.totalRoundPoints === 1 ? '' : 's'} received
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-neutral-400 uppercase font-bold block">
              Cumulative Total
            </span>
            <span className="text-xl font-mono font-black text-white">
              {(players.find((p) => p.id === currentUserId)?.totalScore || 0)} PTS
            </span>
          </div>
        </div>
      )}

      {/* Answer Cards with Vote Counts & Revealed Authors */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
          Responses & Votes
        </h2>

        {sortedAnswers.map((answer) => {
          const author = playerMap.get(answer.authorPlayerId);
          const authorName = author ? author.displayName : 'Anonymous Player';
          const votesCount = getAnswerVotes(answer);
          const isWinner = maxVotes > 0 && votesCount === maxVotes;
          const isMe = answer.authorPlayerId === currentUserId;

          return (
            <div
              key={answer.id}
              className={`p-5 rounded-2xl border-2 transition-all relative overflow-hidden ${
                isWinner && revealStage >= 3
                  ? 'bg-neutral-900 border-psych-yellow shadow-brutal-lg ring-2 ring-psych-yellow/30'
                  : 'bg-psych-cardBg border-neutral-800'
              }`}
            >
              {/* Winner sticker badge */}
              {isWinner && revealStage >= 3 && (
                <div className="absolute top-0 right-0 bg-psych-red text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-md flex items-center gap-1">
                  <Flame className="w-3 h-3 text-psych-yellow fill-psych-yellow" />
                  <span>MOST VOTED</span>
                </div>
              )}

              <div className="space-y-3">
                {/* Answer text */}
                <p className="text-base md:text-lg font-medium text-white leading-relaxed whitespace-pre-wrap">
                  "{answer.answerText}"
                </p>

                {/* Reveal author & votes */}
                <div className="flex items-center justify-between pt-3 border-t border-neutral-800 text-xs">
                  {/* Author reveal */}
                  <div className="flex items-center gap-2">
                    {revealStage >= 2 ? (
                      <span className="flex items-center gap-1.5 font-bold text-neutral-200">
                        <UserCheck className="w-4 h-4 text-psych-yellow" />
                        <span>Written by <strong className="text-white">{authorName}</strong></span>
                        {isMe && <span className="text-[10px] bg-psych-yellow text-black px-1.5 rounded font-black">YOU</span>}
                      </span>
                    ) : (
                      <span className="text-neutral-500 italic">Revealing author...</span>
                    )}
                  </div>

                  {/* Vote Count */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-xl text-psych-yellow">
                      {votesCount}
                    </span>
                    <span className="text-neutral-300 font-bold uppercase text-[11px]">
                      vote{votesCount === 1 ? '' : 's'} (+{votesCount} pts)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Standings Leaderboard */}
      <Leaderboard entries={leaderboardEntries} highlightCurrentUser={true} />

      {/* Host Controls for Next Round / End Game */}
      {isHost && (
        <div className="p-4 bg-neutral-900 border-2 border-psych-yellow/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4 shadow-2xl">
          <span className="text-xs text-neutral-300 font-medium">
            {isFinalRound ? 'Final round completed!' : `Ready for Round ${room.currentRoundNumber + 1}?`}
          </span>

          {isFinalRound ? (
            <button
              onClick={onEndGame}
              className="w-full sm:w-auto px-6 py-3 bg-psych-red hover:bg-red-600 text-white font-extrabold text-sm rounded-xl btn-brutal-red flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <span>VIEW FINAL CEREMONY</span>
              <Trophy className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onNextRound}
              className="w-full sm:w-auto px-6 py-3 bg-psych-yellow hover:bg-yellow-400 text-psych-black font-extrabold text-sm rounded-xl btn-brutal flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <span>START ROUND {room.currentRoundNumber + 1}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
