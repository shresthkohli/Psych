import React, { useState, useEffect } from 'react';
import { Check, CheckCircle2, AlertCircle, Vote as VoteIcon, Edit3, Clock, Users } from 'lucide-react';
import { Room, Round, Answer, Vote, Player } from '../../types/game';
import { UrgencyTimer } from '../common/UrgencyTimer';
import { CountdownState } from '../../hooks/useCountdown';
import { soundManager } from '../../lib/audio';
import { computeLeaderboard } from '../../lib/gameLogic';

interface VotingPhaseProps {
  room: Room;
  round: Round;
  answers: Answer[];
  players: Player[];
  currentUserId: string;
  userVote: Vote | null;
  countdown: CountdownState;
  onVote: (answerId: string) => Promise<{ success: boolean; error?: string }>;
  isVoting?: boolean;
}

export const VotingPhase: React.FC<VotingPhaseProps> = ({
  room,
  round,
  answers,
  players,
  currentUserId,
  userVote,
  countdown,
  onVote,
  isVoting = false,
}) => {
  const [hasVotedLocally, setHasVotedLocally] = useState(false);
  const hasUserVoted = Boolean(userVote || hasVotedLocally);
  const [selectedId, setSelectedId] = useState<string>(userVote?.selectedAnswerId || '');
  const [isChangingVote, setIsChangingVote] = useState(!userVote);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isClosed = room.status !== 'VOTING';

  useEffect(() => {
    if (userVote) {
      setSelectedId(userVote.selectedAnswerId);
    }
  }, [userVote]);

  const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];

  // Order answers by round.randomizedAnswerIds if provided, else keep as-is
  const orderedAnswers = React.useMemo(() => {
    if (!round.randomizedAnswerIds || round.randomizedAnswerIds.length === 0) {
      return answers;
    }
    const map = new Map(answers.map((a) => [a.id, a]));
    const list: Answer[] = [];
    round.randomizedAnswerIds.forEach((id) => {
      const found = map.get(id);
      if (found) list.push(found);
    });
    // Add any remaining
    answers.forEach((a) => {
      if (!list.some((item) => item.id === a.id)) {
        list.push(a);
      }
    });
    return list;
  }, [answers, round.randomizedAnswerIds]);

  const handleSelect = (ansId: string, isSelf: boolean) => {
    if (isSelf || isClosed) return;
    if (userVote && !isChangingVote && !room.settings.allowVoteChanges) return;

    soundManager.playVote();
    setSelectedId(ansId);
    setErrorMessage(null);
  };

  const handleConfirmVote = async () => {
    if (!selectedId || isVoting || isClosed) return;
    setErrorMessage(null);

    const res = await onVote(selectedId);
    if (res.success) {
      soundManager.playSuccess();
      setIsChangingVote(false);
      setHasVotedLocally(true);
    } else {
      setErrorMessage(res.error || 'Failed to submit vote.');
    }
  };

  const leaderboardEntries = computeLeaderboard(players, undefined, currentUserId);
  const votedCount = round.votedPlayerIds?.length ?? (round.voteCount || 0);

  const unvotedPlayers = players.filter(
    (p) => !round.votedPlayerIds?.includes(p.id) && (p.id !== currentUserId || !hasUserVoted)
  );

  if (orderedAnswers.length === 0) {
    return (
      <div className="w-full max-w-lg mx-auto py-12 text-center space-y-4">
        <p className="text-neutral-400">No submissions were received for this round.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 animate-fade-in">
      {/* Sticky Top Timer */}
      <div className="sticky top-14 z-30 pt-1 pb-2 bg-psych-black/90 backdrop-blur">
        <UrgencyTimer
          countdown={countdown}
          label={`ROUND ${round.roundNumber} • ${userVote && !isChangingVote ? 'WAITING FOR VOTES' : 'VOTE FOR THE BEST ANSWER'}`}
          isPaused={room.status === 'PAUSED'}
        />
      </div>

      {/* Round Question Reminder */}
      <div className="bg-psych-cardBg border border-neutral-800 rounded-xl p-4 text-center">
        <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800/80 mb-2">
          <span className="text-[11px] font-mono font-bold text-psych-yellow uppercase">
            Question {round.roundNumber}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <Users className="w-3.5 h-3.5 text-psych-yellow" />
            <span>{votedCount} / {players.length} voted</span>
          </div>
        </div>
        <p className="text-sm md:text-base font-bold text-white">
          "{round.question}"
        </p>
      </div>

      {/* Post-Vote Leaderboard & Voting Status */}
      {hasUserVoted && !isChangingVote ? (
        <div className="space-y-4 animate-fade-in">
          {/* Vote Recorded Confirmation Bar */}
          <div className="bg-psych-cardBg border-2 border-green-500/60 rounded-2xl p-4 shadow-brutal flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Vote Recorded!</h3>
                <p className="text-xs text-neutral-400">
                  {votedCount} of {players.length} participants have voted
                </p>
              </div>
            </div>
            {room.settings.allowVoteChanges && !isClosed && (
              <button
                onClick={() => setIsChangingVote(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-psych-yellow rounded-xl text-xs font-bold transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Change</span>
              </button>
            )}
          </div>

          {/* Voting Tracker & Leaderboard */}
          <div className="bg-psych-cardBg border-2 border-psych-yellow/40 rounded-2xl p-5 shadow-brutal space-y-4">
            <div className="space-y-2 pb-3 border-b border-neutral-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-display font-extrabold text-white uppercase tracking-wider">
                    Live Voting Progress
                  </h2>
                  <span className="text-[11px] text-neutral-400">
                    Scores and winner revealed as soon as all vote!
                  </span>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-psych-yellow/15 text-psych-yellow text-xs font-mono font-bold">
                  {votedCount}/{players.length} Voted
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-psych-yellow transition-all duration-300"
                  style={{ width: `${Math.min(100, (votedCount / Math.max(1, players.length)) * 100)}%` }}
                />
              </div>

              {/* Unvoted Players Callout */}
              {unvotedPlayers.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex flex-col gap-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span>Waiting for {unvotedPlayers.length} {unvotedPlayers.length === 1 ? 'player' : 'players'} to vote:</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {unvotedPlayers.map((p) => (
                      <span key={p.id} className="px-2 py-0.5 rounded-md bg-neutral-900/80 text-amber-200 font-mono text-[11px]">
                        {p.displayName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {leaderboardEntries.map((entry) => {
                const hasVoted = round.votedPlayerIds?.includes(entry.playerId) || entry.playerId === currentUserId;

                return (
                  <div
                    key={entry.playerId}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      entry.isCurrentUser
                        ? 'bg-psych-yellow/10 border-psych-yellow ring-1 ring-psych-yellow/30'
                        : 'bg-neutral-900/60 border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 font-mono text-xs font-bold text-neutral-400">
                        #{entry.rank}
                      </span>
                      <span className="font-bold text-sm text-white truncate">
                        {entry.displayName}
                      </span>
                      {entry.isCurrentUser && (
                        <span className="text-[9px] bg-psych-yellow text-black px-1.5 py-0.2 rounded font-black">
                          YOU
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-mono text-xs font-bold text-psych-yellow">
                        {entry.totalScore} pts
                      </span>

                      {hasVoted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/40 text-green-400 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Voted</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-bold animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Thinking...</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Voting Card Selection List */
        <>
          <div className="space-y-3">
            {orderedAnswers.map((answer, index) => {
              const isSelf = answer.authorPlayerId === currentUserId;
              const isSelected = selectedId === answer.id;
              const letter = labels[index] || `#${index + 1}`;

              return (
                <button
                  key={answer.id}
                  type="button"
                  onClick={() => handleSelect(answer.id, isSelf)}
                  disabled={isSelf || isClosed}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all relative ${
                    isSelected
                      ? 'bg-neutral-900 border-psych-yellow shadow-brutal ring-2 ring-psych-yellow/20'
                      : isSelf
                      ? 'bg-neutral-950/60 border-neutral-800/80 opacity-60 cursor-not-allowed'
                      : 'bg-psych-cardBg border-psych-borderDark hover:border-neutral-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Letter badge */}
                    <div
                      className={`w-7 h-7 rounded-lg font-black text-sm flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-psych-yellow text-psych-black'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {letter}
                    </div>

                    {/* Answer text */}
                    <div className="flex-1 min-w-0 pr-6">
                      <p className="text-sm md:text-base text-neutral-200 leading-relaxed break-words whitespace-pre-wrap">
                        {answer.answerText}
                      </p>

                      {isSelf && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-800 text-[11px] font-bold text-neutral-400">
                          Your answer (cannot vote for yourself)
                        </div>
                      )}
                    </div>

                    {/* Selection Radio / Check Indicator */}
                    <div className="absolute right-4 top-4">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-psych-yellow border-psych-yellow text-psych-black'
                            : 'border-neutral-700 bg-neutral-900'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-psych-red/10 border border-psych-red/40 rounded-xl text-xs text-psych-red">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            onClick={handleConfirmVote}
            disabled={!selectedId || isVoting || isClosed}
            className="w-full py-4 bg-psych-yellow hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-psych-black font-extrabold text-sm rounded-xl btn-brutal flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            {isVoting ? (
              <span>RECORDING VOTE...</span>
            ) : (
              <>
                <VoteIcon className="w-4 h-4" />
                <span>CONFIRM VOTE</span>
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
};
