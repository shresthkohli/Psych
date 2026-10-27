import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getRoomByCode,
  subscribeToRoom,
  subscribeToPlayers,
  subscribeToRound,
  subscribeToAnswers,
  subscribeToScores,
  startRound,
  restartRound,
  transitionToVoting,
  calculateScoresAndTransitionToResults,
  pauseGame,
  resumeGame,
  advanceToNextRound,
  kickPlayer,
} from '../services/firestoreService';
import { useCountdown } from '../hooks/useCountdown';
import { sessionStore } from '../services/authService';
import { Room, Round, Player, Answer, RoundScore } from '../types/game';
import { Header } from '../components/common/Header';
import { HostDashboard } from '../components/host/HostDashboard';
import { AlertCircle, ShieldAlert, KeyRound } from 'lucide-react';
import { doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const HostPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [scores, setScores] = useState<Record<string, RoundScore>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [enteredToken, setEnteredToken] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    let unsubRoom: () => void = () => {};
    let unsubPlayers: () => void = () => {};

    getRoomByCode(roomCode)
      .then((r) => {
        if (!r) {
          setIsLoading(false);
          return;
        }

        setRoom(r);
        const storedToken = sessionStore.getHostToken(roomCode);
        if (storedToken && storedToken === r.hostSecret) {
          setIsAuthorized(true);
        }

        unsubRoom = subscribeToRoom(r.id, (updated) => {
          if (updated) setRoom(updated);
        });

        unsubPlayers = subscribeToPlayers(r.id, (plist) => {
          setPlayers(plist);
        });

        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Host fetch error:', err);
        setIsLoading(false);
      });

    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [roomCode]);

  useEffect(() => {
    if (!room || !room.currentRoundId) return;

    const roundId = room.currentRoundId;
    const unsubRound = subscribeToRound(room.id, roundId, (rnd) => setRound(rnd));
    const unsubAnswers = subscribeToAnswers(room.id, roundId, (ans) => setAnswers(ans));
    const unsubScores = subscribeToScores(room.id, roundId, (sc) => setScores(sc));

    return () => {
      unsubRound();
      unsubAnswers();
      unsubScores();
    };
  }, [room?.id, room?.currentRoundId]);

  const handleManualAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;

    if (enteredToken.trim() === room.hostSecret) {
      if (roomCode) sessionStore.saveHostToken(roomCode, room.hostSecret);
      setIsAuthorized(true);
      setAuthError(null);
    } else {
      setAuthError('Invalid Host Authorization Key.');
    }
  };

  // Authoritative host countdown timer
  const isAnswering = room?.status === 'ANSWERING';
  const isVoting = room?.status === 'VOTING';
  const totalPhaseSeconds = isAnswering
    ? room?.settings.answerDuration || 120
    : isVoting
    ? room?.settings.votingDuration || 90
    : 120;

  const countdown = useCountdown(
    room?.phaseDeadline || 0,
    totalPhaseSeconds,
    room?.status === 'PAUSED'
  );

  // Authoritative host auto-advance when countdown timer expires
  useEffect(() => {
    if (!isAuthorized || !countdown.isExpired || !room || !round || room.status === 'PAUSED') return;
    const now = Date.now();
    if (!room.phaseDeadline || now < room.phaseDeadline) return;

    if (room.status === 'ANSWERING' && round.status === 'ANSWERING') {
      transitionToVoting(room.id, round.id, room.settings.votingDuration, true).catch(console.error);
    } else if (room.status === 'VOTING' && round.status === 'VOTING' && !round.scoringProcessed) {
      calculateScoresAndTransitionToResults(room.id, round.id, true).catch(console.error);
    }
  }, [isAuthorized, countdown.isExpired, room?.status, room?.phaseDeadline, round?.id, round?.status, round?.scoringProcessed]);

  // Host Action handlers
  const handleStartRound = async () => {
    if (!room || !room.currentRoundId) return;
    await startRound(room.id, room.currentRoundId, room.settings.answerDuration);
  };

  const handleEndAnswering = async () => {
    if (!room || !room.currentRoundId) return;
    await transitionToVoting(room.id, room.currentRoundId, room.settings.votingDuration, true);
  };

  const handleEndVoting = async () => {
    if (!room || !room.currentRoundId) return;
    await calculateScoresAndTransitionToResults(room.id, room.currentRoundId, true);
  };

  const handleNextRound = async () => {
    if (!room) return;
    await advanceToNextRound(room.id, room.currentRoundNumber + 1, room.settings.totalRounds);
  };

  const handlePause = async () => {
    if (!room) return;
    await pauseGame(room.id);
  };

  const handleResume = async () => {
    if (!room) return;
    await resumeGame(room.id);
  };

  const handleSkipQuestion = async () => {
    if (!room) return;
    await advanceToNextRound(room.id, room.currentRoundNumber + 1, room.settings.totalRounds);
  };

  const handleRestartRound = async () => {
    if (!room || !room.currentRoundId || !db) return;
    // Cleanly purge all existing answers, votes, scores and reset round counters
    await restartRound(room.id, room.currentRoundId, room.settings.answerDuration);
  };

  const handleCancelRound = async () => {
    if (!room || !db) return;
    await updateDoc(doc(db, 'rooms', room.id), {
      status: 'LOBBY',
      updatedAt: Date.now(),
    });
  };

  const handleEndGame = async () => {
    if (!room || !db) return;
    await updateDoc(doc(db, 'rooms', room.id), {
      status: 'GAME_FINISHED',
      updatedAt: Date.now(),
    });
  };

  const handleModerateAnswer = async (answerId: string, status: 'active' | 'hidden') => {
    if (!room || !room.currentRoundId || !db) return;
    await updateDoc(doc(db, 'rooms', room.id, 'rounds', room.currentRoundId, 'answers', answerId), {
      moderationStatus: status,
    });
  };

  const handleKickPlayer = async (playerId: string) => {
    if (!room) return;
    await kickPlayer(room.id, playerId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-psych-black flex items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-psych-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-psych-black text-white p-6 text-center">
        <p>Room not found.</p>
      </div>
    );
  }

  // Authorization Screen
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-psych-black text-white flex flex-col justify-between selection:bg-psych-yellow selection:text-psych-black">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-psych-cardBg border-2 border-psych-yellow rounded-3xl p-8 shadow-brutal space-y-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-psych-yellow/15 border border-psych-yellow flex items-center justify-center text-psych-yellow">
              <KeyRound className="w-8 h-8" />
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                Host Authorization Required
              </h2>
              <p className="text-xs text-neutral-400">
                Enter your secret key to manage room <strong>{room.roomCode}</strong>.
              </p>
            </div>

            <form onSubmit={handleManualAuth} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={enteredToken}
                  onChange={(e) => setEnteredToken(e.target.value)}
                  placeholder="Secret Host Key"
                  className="w-full p-3.5 bg-psych-black border-2 border-neutral-700 focus:border-psych-yellow rounded-xl font-mono text-sm text-white focus:outline-none"
                  required
                />
              </div>

              {authError && (
                <div className="p-3 bg-psych-red/10 border border-psych-red/40 rounded-xl text-xs text-psych-red">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-psych-yellow hover:bg-yellow-400 text-psych-black font-extrabold text-sm rounded-xl btn-brutal uppercase tracking-wider"
              >
                UNLOCK HOST DASHBOARD
              </button>
            </form>
          </div>
        </main>
        <footer className="py-4 text-center text-xs text-neutral-500">PSYCH — E-Cell SVNIT</footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-psych-black text-white flex flex-col justify-between selection:bg-psych-yellow selection:text-psych-black">
      <Header roomCode={room.roomCode} playerCount={players.length} isHost={true} />

      <main className="flex-1 px-4 py-6">
        <HostDashboard
          room={room}
          round={round}
          answers={answers}
          players={players}
          scores={scores}
          onStartRound={handleStartRound}
          onEndAnswering={handleEndAnswering}
          onEndVoting={handleEndVoting}
          onRevealResults={handleEndVoting}
          onNextRound={handleNextRound}
          onPauseGame={handlePause}
          onResumeGame={handleResume}
          onSkipQuestion={handleSkipQuestion}
          onRestartRound={handleRestartRound}
          onCancelRound={handleCancelRound}
          onEndGame={handleEndGame}
          onModerateAnswer={handleModerateAnswer}
          onKickPlayer={handleKickPlayer}
        />
      </main>

      <footer className="py-4 text-center text-xs text-neutral-500">
        PSYCH Host Administration Console • E-Cell SVNIT
      </footer>
    </div>
  );
};
