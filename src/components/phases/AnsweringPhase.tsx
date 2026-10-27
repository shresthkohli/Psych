import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, Edit3, Users, AlertCircle, Clock } from 'lucide-react';
import { Room, Round, Answer, Player } from '../../types/game';
import { countWords, validateAnswerWords, computeLeaderboard } from '../../lib/gameLogic';
import { UrgencyTimer } from '../common/UrgencyTimer';
import { CountdownState } from '../../hooks/useCountdown';
import { soundManager } from '../../lib/audio';

interface AnsweringPhaseProps {
  room: Room;
  round: Round;
  userAnswer: Answer | null;
  countdown: CountdownState;
  players: Player[];
  currentUserId: string;
  onSubmit: (answerText: string) => Promise<{ success: boolean; error?: string }>;
  isSubmitting?: boolean;
}

export const AnsweringPhase: React.FC<AnsweringPhaseProps> = ({
  room,
  round,
  userAnswer,
  countdown,
  players,
  currentUserId,
  onSubmit,
  isSubmitting = false,
}) => {
  const [text, setText] = useState(userAnswer?.answerText || '');
  const [hasSubmittedLocally, setHasSubmittedLocally] = useState(false);
  const hasUserSubmitted = Boolean(userAnswer || hasSubmittedLocally);
  const [isEditing, setIsEditing] = useState(!userAnswer);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wordCount = countWords(text);
  const minWords = room.settings.minWords || 1;
  const maxWords = room.settings.maxWords || 50;
  const validation = validateAnswerWords(text, minWords, maxWords);
  const isClosed = room.status !== 'ANSWERING';

  useEffect(() => {
    if (userAnswer && !isEditing) {
      setText(userAnswer.answerText);
    }
  }, [userAnswer, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.valid || isSubmitting) return;

    setErrorMessage(null);
    const res = await onSubmit(text);
    if (res.success) {
      soundManager.playSuccess();
      setIsEditing(false);
      setHasSubmittedLocally(true);
    } else {
      setErrorMessage(res.error || 'Failed to submit. Please try again.');
    }
  };

  const handleEditClick = () => {
    if (room.settings.allowAnswerEdits && !isClosed) {
      setIsEditing(true);
    }
  };

  const leaderboardEntries = computeLeaderboard(players, undefined, currentUserId);
  const submittedCount = round.submittedPlayerIds?.length ?? (round.submissionCount || 0);

  const unsubmittedPlayers = players.filter(
    (p) => !round.submittedPlayerIds?.includes(p.id) && (p.id !== currentUserId || !hasUserSubmitted)
  );

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 animate-fade-in">
      {/* Sticky Top Timer */}
      <div className="sticky top-14 z-30 pt-1 pb-2 bg-psych-black/90 backdrop-blur">
        <UrgencyTimer
          countdown={countdown}
          label={`ROUND ${round.roundNumber} • ${userAnswer && !isEditing ? 'WAITING FOR PLAYERS' : 'WRITE YOUR ANSWER'}`}
          isPaused={room.status === 'PAUSED'}
        />
      </div>

      {/* Prominent Question Card */}
      <div className="relative bg-psych-cardBg border-2 border-psych-yellow rounded-2xl p-6 shadow-brutal web-corner-tl web-corner-br">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-psych-yellow">
            QUESTION {round.roundNumber} OF {room.settings.totalRounds}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <Users className="w-3.5 h-3.5 text-psych-yellow" />
            <span>
              {submittedCount} / {players.length} submitted
            </span>
          </div>
        </div>

        <p className="mt-4 text-xl md:text-2xl font-display font-black text-white leading-snug">
          "{round.question}"
        </p>

        <div className="mt-3 text-xs text-neutral-400 italic">
          Be witty, be wild, stay anonymous.
        </div>
      </div>

      {/* Answer Submitted -> Show Leaderboard & Who has NOT submitted */}
      {hasUserSubmitted && !isEditing ? (
        <div className="space-y-4 animate-fade-in">
          {/* Submission Confirmation Bar */}
          <div className="bg-psych-cardBg border-2 border-green-500/60 rounded-2xl p-4 shadow-brutal flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Answer Submitted Anonymously!</h3>
                <p className="text-xs text-neutral-400">
                  {submittedCount} of {players.length} participants ready
                </p>
              </div>
            </div>
            {room.settings.allowAnswerEdits && !isClosed && (
              <button
                onClick={handleEditClick}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-psych-yellow rounded-xl text-xs font-bold transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
          </div>

          {/* User's Answer text preview */}
          {text && (
            <div className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-300 leading-relaxed italic">
              "{text}"
            </div>
          )}

          {/* Leaderboard & Live Submission Status Tracker */}
          <div className="bg-psych-cardBg border-2 border-psych-yellow/40 rounded-2xl p-5 shadow-brutal space-y-4">
            <div className="space-y-2 pb-3 border-b border-neutral-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-display font-extrabold text-white uppercase tracking-wider">
                    Submission Progress Tracker
                  </h2>
                  <span className="text-[11px] text-neutral-400">
                    Moves automatically to voting once everyone submits!
                  </span>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-psych-yellow/15 text-psych-yellow text-xs font-mono font-bold">
                  {submittedCount}/{players.length} Submitted
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-psych-yellow transition-all duration-300"
                  style={{ width: `${Math.min(100, (submittedCount / Math.max(1, players.length)) * 100)}%` }}
                />
              </div>

              {/* Unsubmitted Players Callout */}
              {unsubmittedPlayers.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex flex-col gap-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span>Waiting for {unsubmittedPlayers.length} {unsubmittedPlayers.length === 1 ? 'player' : 'players'} to submit:</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {unsubmittedPlayers.map((p) => (
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
                const hasSubmitted = round.submittedPlayerIds?.includes(entry.playerId) || entry.playerId === currentUserId;

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

                      {hasSubmitted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/40 text-green-400 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Submitted</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-bold animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Writing...</span>
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
        /* Writing form */
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-psych-cardBg border border-psych-borderDark rounded-2xl p-4 focus-within:border-psych-yellow transition-colors">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write your anonymous response here... (30–50 words maximum)"
              rows={4}
              disabled={isSubmitting || isClosed}
              className="w-full bg-transparent text-white text-base placeholder-neutral-500 resize-none focus:outline-none"
              autoFocus
            />

            {/* Word Count Indicator */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-800 text-xs">
              <span
                className={`font-mono font-bold ${
                  wordCount > maxWords
                    ? 'text-psych-red'
                    : wordCount < minWords && wordCount > 0
                    ? 'text-orange-400'
                    : 'text-neutral-400'
                }`}
              >
                {wordCount} / {maxWords} words
              </span>

              {minWords > 1 && wordCount < minWords && (
                <span className="text-[11px] text-orange-400">
                  {minWords - wordCount} more required
                </span>
              )}

              {wordCount > maxWords && (
                <span className="text-[11px] text-psych-red">
                  {wordCount - maxWords} words over limit
                </span>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-psych-red/10 border border-psych-red/40 rounded-xl text-xs text-psych-red">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!validation.valid || isSubmitting || isClosed}
            className="w-full py-3.5 bg-psych-yellow hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-psych-black font-extrabold text-sm rounded-xl btn-brutal flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            {isSubmitting ? (
              <span>SAVING SUBMISSION...</span>
            ) : (
              <>
                <span>CONFIRM & SUBMIT ANSWER</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
