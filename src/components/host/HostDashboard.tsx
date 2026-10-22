import React, { useState } from 'react';
import {
  Play,
  Pause,
  FastForward,
  RotateCcw,
  XCircle,
  AlertTriangle,
  Download,
  Tv,
  Users,
  Eye,
  EyeOff,
  CheckCircle,
  Clock,
  Shield,
  FileText,
} from 'lucide-react';
import { Room, Round, Answer, Player, RoundScore, GameEventLog } from '../../types/game';
import { exportLeaderboardToCSV } from '../../lib/csvExport';
import { computeLeaderboard } from '../../lib/gameLogic';

interface HostDashboardProps {
  room: Room;
  round: Round | null;
  answers: Answer[];
  players: Player[];
  scores: Record<string, RoundScore>;
  onStartRound: () => void;
  onEndAnswering: () => void;
  onEndVoting: () => void;
  onRevealResults: () => void;
  onNextRound: () => void;
  onPauseGame: () => void;
  onResumeGame: () => void;
  onSkipQuestion: () => void;
  onRestartRound: () => void;
  onCancelRound: () => void;
  onEndGame: () => void;
  onModerateAnswer: (answerId: string, status: 'active' | 'hidden') => void;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({
  room,
  round,
  answers,
  players,
  scores,
  onStartRound,
  onEndAnswering,
  onEndVoting,
  onRevealResults,
  onNextRound,
  onPauseGame,
  onResumeGame,
  onSkipQuestion,
  onRestartRound,
  onCancelRound,
  onEndGame,
  onModerateAnswer,
}) => {
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({ isOpen: false, title: '', description: '', action: () => {} });

  const [showModeration, setShowModeration] = useState(false);

  const leaderboard = computeLeaderboard(players, scores);

  const handleExportCSV = () => {
    exportLeaderboardToCSV(room.roomCode, leaderboard, room.roomName);
  };

  const isPaused = room.status === 'PAUSED';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Host Bar */}
      <div className="bg-psych-cardBg border-2 border-psych-yellow rounded-2xl p-5 shadow-brutal flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-psych-yellow/20 text-psych-yellow">
              <Shield className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-psych-yellow">
              HOST CONTROL CONSOLE
            </span>
          </div>
          <h1 className="text-2xl font-display font-black text-white mt-1">
            Room {room.roomCode} — {room.roomName || 'PSYCH Live'}
          </h1>
          <p className="text-xs text-neutral-400">
            Phase: <strong className="text-psych-yellow uppercase">{room.status}</strong> • Round {room.currentRoundNumber} of {room.settings.totalRounds}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/display/${room.roomCode}`}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Tv className="w-3.5 h-3.5 text-psych-yellow" />
            <span>Open Projector</span>
          </a>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-bold text-neutral-300 hover:text-white rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-psych-yellow" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Primary Phase Controls */}
      <div className="bg-neutral-900 border border-psych-borderDark rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Primary Phase Progression
          </h2>
          <span className="text-xs font-mono text-neutral-400">
            {players.length} Players Connected
          </span>
        </div>

        {/* Action Buttons based on current state */}
        <div className="flex flex-wrap gap-3">
          {room.status === 'LOBBY' && (
            <button
              onClick={onStartRound}
              className="px-6 py-3.5 bg-psych-yellow hover:bg-yellow-400 text-psych-black font-extrabold text-sm rounded-xl btn-brutal flex items-center gap-2 uppercase tracking-wider"
            >
              <Play className="w-4 h-4 fill-psych-black" />
              <span>START ROUND {room.currentRoundNumber}</span>
            </button>
          )}

          {room.status === 'ANSWERING' && (
            <button
              onClick={onEndAnswering}
              className="px-6 py-3.5 bg-psych-yellow hover:bg-yellow-400 text-psych-black font-extrabold text-sm rounded-xl btn-brutal flex items-center gap-2 uppercase tracking-wider"
            >
              <CheckCircle className="w-4 h-4" />
              <span>CLOSE SUBMISSIONS & START VOTING</span>
            </button>
          )}

          {room.status === 'VOTING' && (
            <button
              onClick={onEndVoting}
              className="px-6 py-3.5 bg-psych-yellow hover:bg-yellow-400 text-psych-black font-extrabold text-sm rounded-xl btn-brutal flex items-center gap-2 uppercase tracking-wider"
            >
              <CheckCircle className="w-4 h-4" />
              <span>CLOSE VOTING & TALLY SCORES</span>
            </button>
          )}

          {room.status === 'RESULTS' && (
            <>
              {room.currentRoundNumber < room.settings.totalRounds ? (
                <button
                  onClick={onNextRound}
                  className="px-6 py-3.5 bg-psych-yellow hover:bg-yellow-400 text-psych-black font-extrabold text-sm rounded-xl btn-brutal flex items-center gap-2 uppercase tracking-wider"
                >
                  <Play className="w-4 h-4 fill-psych-black" />
                  <span>START ROUND {room.currentRoundNumber + 1}</span>
                </button>
              ) : (
                <button
                  onClick={onEndGame}
                  className="px-6 py-3.5 bg-psych-red hover:bg-red-600 text-white font-extrabold text-sm rounded-xl btn-brutal-red flex items-center gap-2 uppercase tracking-wider"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>FINISH TOURNAMENT & REVEAL CHAMPION</span>
                </button>
              )}
            </>
          )}

          {/* Pause / Resume Controls */}
          {['ANSWERING', 'VOTING'].includes(room.status) && (
            <button
              onClick={onPauseGame}
              className="px-4 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-neutral-200 font-bold text-sm rounded-xl flex items-center gap-2"
            >
              <Pause className="w-4 h-4" />
              <span>Pause Round</span>
            </button>
          )}

          {isPaused && (
            <button
              onClick={onResumeGame}
              className="px-5 py-3 bg-green-500 hover:bg-green-600 text-black font-extrabold text-sm rounded-xl flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Resume Game</span>
            </button>
          )}
        </div>

        {/* Current Round Stats Overview */}
        {round && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-psych-black rounded-xl border border-neutral-800">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Submissions</span>
              <div className="text-xl font-mono font-black text-psych-yellow">
                {round.submissionCount || 0} / {players.length}
              </div>
            </div>

            <div className="p-3 bg-psych-black rounded-xl border border-neutral-800">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Votes Cast</span>
              <div className="text-xl font-mono font-black text-white">
                {round.voteCount || 0} / {players.length}
              </div>
            </div>

            <div className="p-3 bg-psych-black rounded-xl border border-neutral-800">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Answer Limit</span>
              <div className="text-xl font-mono font-black text-neutral-300">
                {room.settings.maxWords} words
              </div>
            </div>

            <div className="p-3 bg-psych-black rounded-xl border border-neutral-800">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Voting Time</span>
              <div className="text-xl font-mono font-black text-neutral-300">
                {room.settings.votingDuration}s
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Moderation Panel (Private to Host) */}
      <div className="bg-psych-cardBg border border-psych-borderDark rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-psych-yellow" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Private Content Moderation ({answers.length})
            </h2>
          </div>
          <button
            onClick={() => setShowModeration(!showModeration)}
            className="text-xs text-psych-yellow hover:underline font-bold"
          >
            {showModeration ? 'Collapse' : 'Inspect Submissions'}
          </button>
        </div>

        {showModeration && (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {answers.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">No answers submitted yet.</p>
            ) : (
              answers.map((ans) => {
                const author = players.find((p) => p.id === ans.authorPlayerId);
                const isHidden = ans.moderationStatus === 'hidden';

                return (
                  <div
                    key={ans.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      isHidden ? 'bg-red-950/20 border-red-900/50 opacity-60' : 'bg-neutral-900 border-neutral-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-psych-yellow">
                          Author: {author?.displayName || ans.authorPlayerId}
                        </span>
                        {isHidden && (
                          <span className="text-[10px] px-1.5 bg-red-600 text-white rounded font-bold uppercase">
                            HIDDEN
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-300 mt-1 truncate">
                        "{ans.answerText}"
                      </p>
                    </div>

                    <button
                      onClick={() => onModerateAnswer(ans.id, isHidden ? 'active' : 'hidden')}
                      title={isHidden ? 'Unhide answer' : 'Hide answer from voting'}
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white"
                    >
                      {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Destructive Host Actions with Confirmation */}
      <div className="bg-neutral-950 border border-red-900/30 rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-psych-red">
          Danger Zone / Round Management
        </h3>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() =>
              setConfirmModal({
                isOpen: true,
                title: 'Skip Current Question?',
                description: 'This will discard current round submissions and move to the next question.',
                action: onSkipQuestion,
              })
            }
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>Skip Question</span>
          </button>

          <button
            onClick={() =>
              setConfirmModal({
                isOpen: true,
                title: 'Restart Round?',
                description: 'This will reset the round timer and clear submissions so players can submit again.',
                action: onRestartRound,
              })
            }
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart Round</span>
          </button>

          <button
            onClick={() =>
              setConfirmModal({
                isOpen: true,
                title: 'Cancel Round?',
                description: 'Cancels the active round without awarding any points.',
                action: onCancelRound,
              })
            }
            className="px-3.5 py-2 bg-red-950/40 hover:bg-red-900/50 border border-red-900/60 text-red-300 text-xs font-semibold rounded-xl flex items-center gap-1.5"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancel Round</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-psych-dark border-2 border-psych-red rounded-2xl p-6 shadow-brutal space-y-4">
            <div className="flex items-center gap-2 text-psych-red font-bold text-lg">
              <AlertTriangle className="w-5 h-5" />
              <span>{confirmModal.title}</span>
            </div>
            <p className="text-sm text-neutral-300">{confirmModal.description}</p>
            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  confirmModal.action();
                  setConfirmModal({ ...confirmModal, isOpen: false });
                }}
                className="px-4 py-2 bg-psych-red hover:bg-red-600 text-white text-xs font-extrabold rounded-xl"
              >
                CONFIRM ACTION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
