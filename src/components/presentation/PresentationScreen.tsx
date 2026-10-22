import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Users, Clock, Trophy, Sparkles } from 'lucide-react';
import { Room, Round, Answer, Player, RoundScore } from '../../types/game';
import { useCountdown } from '../../hooks/useCountdown';
import { computeLeaderboard } from '../../lib/gameLogic';
import { Leaderboard } from '../leaderboard/Leaderboard';

interface PresentationScreenProps {
  room: Room;
  round: Round | null;
  answers: Answer[];
  players: Player[];
  scores: Record<string, RoundScore>;
}

export const PresentationScreen: React.FC<PresentationScreenProps> = ({
  room,
  round,
  answers,
  players,
  scores,
}) => {
  const isAnswering = room.status === 'ANSWERING';
  const isVoting = room.status === 'VOTING';
  const isResults = room.status === 'RESULTS';
  const isLobby = room.status === 'LOBBY';
  const isFinished = room.status === 'GAME_FINISHED';
  const isPaused = room.status === 'PAUSED';

  const duration = isAnswering
    ? room.settings.answerDuration
    : isVoting
    ? room.settings.votingDuration
    : 120;

  const countdown = useCountdown(room.phaseDeadline, duration, isPaused);
  const leaderboard = computeLeaderboard(players, scores);
  const joinUrl = `${window.location.origin}/join?code=${room.roomCode}`;

  return (
    <div className="min-h-screen bg-psych-black text-white p-6 md:p-12 flex flex-col justify-between select-none halftone-bg">
      {/* Top Bar for Projector */}
      <header className="flex items-center justify-between pb-6 border-b-2 border-psych-yellow/30">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-psych-yellow flex items-center justify-center font-comic font-black text-3xl text-psych-black shadow-brutal transform -rotate-3">
            Ψ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl md:text-4xl font-display font-black tracking-tight text-white">
                PSYCH
              </h1>
              <span className="px-2 py-0.5 rounded bg-psych-red text-xs font-bold tracking-wider uppercase">
                E-Cell SVNIT
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-mono">
              Live College Multiplayer Social Experiment
            </p>
          </div>
        </div>

        {/* Room Code Badge */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs uppercase tracking-wider text-neutral-400 block font-bold">
              Join at {window.location.host}/join
            </span>
            <div className="font-mono font-black text-3xl md:text-4xl text-psych-yellow tracking-wider">
              {room.roomCode}
            </div>
          </div>
          <div className="p-2 bg-white rounded-xl shadow-md border-2 border-psych-black hidden md:block">
            <QRCodeSVG value={joinUrl} size={64} level="M" />
          </div>
        </div>
      </header>

      {/* Main Content Area based on phase */}
      <main className="flex-1 flex flex-col justify-center py-8">
        {isLobby && (
          <div className="max-w-3xl mx-auto text-center space-y-8 animate-fade-in">
            <div className="space-y-3">
              <span className="px-4 py-1.5 rounded-full bg-psych-yellow/15 border border-psych-yellow text-psych-yellow text-sm font-bold tracking-wider uppercase">
                GET READY TO PLAY
              </span>
              <h2 className="text-5xl md:text-6xl font-display font-black tracking-tight text-white leading-tight">
                Scan & Join on Your Phone
              </h2>
              <p className="text-xl text-neutral-300 max-w-xl mx-auto">
                No app installation required. Enter your nickname and prepare your wittiest answers!
              </p>
            </div>

            <div className="p-8 bg-psych-dark border-4 border-psych-yellow rounded-3xl shadow-brutal-lg inline-flex flex-col items-center gap-6">
              <div className="p-4 bg-white rounded-2xl shadow-xl">
                <QRCodeSVG value={joinUrl} size={220} level="H" />
              </div>
              <div className="text-center">
                <span className="text-sm font-bold uppercase tracking-wider text-neutral-400">
                  Room Code
                </span>
                <div className="font-mono font-black text-5xl text-psych-yellow tracking-widest mt-1">
                  {room.roomCode}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 text-lg font-mono text-neutral-300">
              <Users className="w-6 h-6 text-psych-yellow" />
              <span><strong>{players.length}</strong> Players in Lobby</span>
            </div>
          </div>
        )}

        {isAnswering && round && (
          <div className="max-w-4xl mx-auto w-full space-y-8 animate-fade-in">
            {/* Countdown Display */}
            <div className="flex items-center justify-between p-6 bg-psych-cardBg border-4 border-psych-yellow rounded-3xl shadow-brutal-lg">
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest">
                  ROUND {round.roundNumber} OF {room.settings.totalRounds} • WRITING PHASE
                </span>
                <div className="text-lg font-bold text-psych-yellow">
                  Submit anonymously on your mobile screen
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-psych-yellow animate-spin" />
                <span className="font-mono font-black text-5xl md:text-6xl text-white tracking-tight">
                  {countdown.formattedTime}
                </span>
              </div>
            </div>

            {/* Huge Question Display */}
            <div className="p-10 bg-psych-dark border-4 border-white/20 rounded-3xl text-center space-y-4 shadow-2xl">
              <span className="text-sm font-mono font-bold uppercase tracking-widest text-psych-yellow">
                THE QUESTION
              </span>
              <p className="text-3xl md:text-5xl font-display font-black text-white leading-tight">
                "{round.question}"
              </p>
            </div>

            {/* Progress counter */}
            <div className="text-center font-mono text-xl text-neutral-300">
              <strong className="text-psych-yellow">{round.submissionCount || 0}</strong> of <strong>{players.length}</strong> participants submitted
            </div>
          </div>
        )}

        {isVoting && round && (
          <div className="max-w-4xl mx-auto w-full space-y-8 animate-fade-in">
            {/* Voting Countdown */}
            <div className="flex items-center justify-between p-6 bg-psych-cardBg border-4 border-psych-yellow rounded-3xl shadow-brutal-lg">
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest">
                  VOTING ACTIVE • CHOOSE THE WILDEST ANSWER
                </span>
                <div className="text-lg font-bold text-psych-yellow">
                  Vote on your phone screen now
                </div>
              </div>

              <div className="font-mono font-black text-5xl md:text-6xl text-white tracking-tight">
                {countdown.formattedTime}
              </div>
            </div>

            <div className="p-8 bg-psych-dark border-2 border-neutral-800 rounded-3xl text-center space-y-2">
              <p className="text-2xl font-bold text-neutral-300">
                "{round.question}"
              </p>
              <p className="text-sm text-neutral-400 italic">
                Read all anonymous answers and vote for the best one!
              </p>
            </div>

            <div className="text-center font-mono text-xl text-neutral-300">
              <strong className="text-psych-yellow">{round.voteCount || 0}</strong> of <strong>{players.length}</strong> votes recorded
            </div>
          </div>
        )}

        {isResults && (
          <div className="max-w-3xl mx-auto w-full space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <span className="px-4 py-1 rounded-full bg-psych-yellow text-psych-black font-black text-xs uppercase">
                ROUND {room.currentRoundNumber} SCORES
              </span>
              <h2 className="text-4xl md:text-5xl font-display font-black text-white uppercase">
                Current Standings
              </h2>
            </div>

            <Leaderboard entries={leaderboard} highlightCurrentUser={false} />
          </div>
        )}

        {isFinished && (
          <div className="max-w-3xl mx-auto w-full space-y-6 text-center animate-fade-in">
            <h2 className="text-5xl md:text-6xl font-display font-black text-psych-yellow uppercase">
              Tournament Champions
            </h2>
            <Leaderboard entries={leaderboard} highlightCurrentUser={false} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="pt-6 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
        <span>Organized by <strong>E-Cell, SVNIT Surat</strong></span>
        <span>PSYCH Live Engine v1.0</span>
      </footer>
    </div>
  );
};
