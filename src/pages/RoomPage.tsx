import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getRoomByCode,
  subscribeToRoom,
  subscribeToPlayers,
  subscribeToRound,
  subscribeToAnswers,
  subscribeToScores,
  subscribeToUserAnswer,
  subscribeToUserVote,
  submitAnswer,
  submitVote,
  transitionToVoting,
  calculateScoresAndTransitionToResults,
  advanceToNextRound,
  startRound,
  setPlayerPresence,
} from '../services/firestoreService';
import { sessionStore, getOrCreateAnonymousUser } from '../services/authService';
import { Room, Round, Player, Answer, Vote, RoundScore } from '../types/game';
import { useCountdown } from '../hooks/useCountdown';
import { Header } from '../components/common/Header';
import { PausedOverlay } from '../components/common/PausedOverlay';
import { LobbyPhase } from '../components/phases/LobbyPhase';
import { AnsweringPhase } from '../components/phases/AnsweringPhase';
import { SubmissionLockedPhase } from '../components/phases/SubmissionLockedPhase';
import { VotingPhase } from '../components/phases/VotingPhase';
import { VotingLockedPhase } from '../components/phases/VotingLockedPhase';
import { ResultsPhase } from '../components/phases/ResultsPhase';
import { GameFinishedPhase } from '../components/phases/GameFinishedPhase';
import { AlertCircle, WifiOff } from 'lucide-react';

export const RoomPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [scores, setScores] = useState<Record<string, RoundScore>>({});
  const [userAnswer, setUserAnswer] = useState<Answer | null>(null);
  const [userVote, setUserVote] = useState<Vote | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [authReady, setAuthReady] = useState(false);

  // Retrieve persistent player session
  const playerSession = roomCode ? sessionStore.getPlayerSession(roomCode) : null;
  const currentUserId = playerSession?.playerId || '';

  useEffect(() => {
    let cancelled = false;
    getOrCreateAnonymousUser()
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setAuthReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Network and presence tracking
  useEffect(() => {
    if (!room?.id || !currentUserId) return;

    const handleOnline = () => {
      setIsOnline(true);
      setPlayerPresence(room.id, currentUserId, 'online');
    };
    const handleOffline = () => {
      setIsOnline(false);
      setPlayerPresence(room.id, currentUserId, 'offline');
    };
    const handleBeforeUnload = () => {
      setPlayerPresence(room.id, currentUserId, 'offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Initial presence mark
    setPlayerPresence(room.id, currentUserId, 'online');

    // Heartbeat every 30s to keep lastSeenAt fresh
    const heartbeat = setInterval(() => {
      setPlayerPresence(room.id, currentUserId, 'online');
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(heartbeat);
    };
  }, [room?.id, currentUserId]);

  // Host verification
  const hostToken = roomCode ? sessionStore.getHostToken(roomCode) : null;
  const isHost = Boolean(room && hostToken && room.hostSecret === hostToken);

  // 1. Initial Room Fetch
  useEffect(() => {
    if (!roomCode) return;

    let unsubRoom: () => void = () => {};
    let unsubPlayers: () => void = () => {};

    getRoomByCode(roomCode)
      .then((initialRoom) => {
        if (!initialRoom) {
          setErrorMessage(`Room "${roomCode}" was not found.`);
          setIsLoading(false);
          return;
        }

        setRoom(initialRoom);
        setIsLoading(false);

        // Check if user has joined this room
        if (!sessionStore.getPlayerSession(roomCode) && !sessionStore.getHostToken(roomCode)) {
          // Redirect to join page with prefilled code
          navigate(`/join?code=${roomCode}`);
          return;
        }

        // Real-time room subscription
        unsubRoom = subscribeToRoom(initialRoom.id, (updatedRoom) => {
          if (updatedRoom) {
            setRoom(updatedRoom);
          }
        });

        // Real-time players subscription
        unsubPlayers = subscribeToPlayers(initialRoom.id, (updatedPlayers) => {
          setPlayers(updatedPlayers);
        });
      })
      .catch((err) => {
        console.error('Room subscription error:', err);
        setErrorMessage('Failed to connect to room. Check Firebase configuration.');
        setIsLoading(false);
      });

    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [roomCode, navigate]);

  // 2. Round Subscriptions
  useEffect(() => {
    if (!room || !room.currentRoundId) return;

    const roundId = room.currentRoundId;
    const unsubRound = subscribeToRound(room.id, roundId, (r) => setRound(r));
    const unsubAnswers = subscribeToAnswers(room.id, roundId, (ans) => setAnswers(ans));
    const unsubScores = subscribeToScores(room.id, roundId, (sc) => setScores(sc));

    let unsubUserAns = () => {};
    let unsubUserVote = () => {};

    if (currentUserId) {
      unsubUserAns = subscribeToUserAnswer(room.id, roundId, currentUserId, (ans) => setUserAnswer(ans));
      unsubUserVote = subscribeToUserVote(room.id, roundId, currentUserId, (v) => setUserVote(v));
    }

    return () => {
      unsubRound();
      unsubAnswers();
      unsubScores();
      unsubUserAns();
      unsubUserVote();
    };
  }, [room?.id, room?.currentRoundId, currentUserId]);

  // Countdown timer calculation
  const isAnswering = room?.status === 'ANSWERING';
  const isVotingPhase = room?.status === 'VOTING';
  const totalPhaseSeconds = isAnswering
    ? room?.settings.answerDuration || 120
    : isVotingPhase
    ? room?.settings.votingDuration || 90
    : 120;

  const countdown = useCountdown(
    room?.phaseDeadline || 0,
    totalPhaseSeconds,
    room?.status === 'PAUSED'
  );

  // Auto-advance when ALL active players have submitted during ANSWERING
  useEffect(() => {
    if (!room || room.status !== 'ANSWERING' || !round || round.status !== 'ANSWERING' || players.length === 0) return;
    const activePlayers = players.filter((p) => p.connectedStatus !== 'offline');
    const targetPlayers = activePlayers.length > 0 ? activePlayers : players;
    const submittedIds = round.submittedPlayerIds || [];
    const allActiveSubmitted = targetPlayers.length > 0 && targetPlayers.every((p) => submittedIds.includes(p.id));
    if (allActiveSubmitted) {
      transitionToVoting(room.id, round.id, room.settings.votingDuration, true).catch(console.error);
    }
  }, [room?.status, round?.id, round?.status, round?.submittedPlayerIds, players]);

  // Auto-advance when ALL active players have voted during VOTING
  useEffect(() => {
    if (!room || room.status !== 'VOTING' || !round || round.status !== 'VOTING' || round.scoringProcessed || players.length === 0) return;
    const activePlayers = players.filter((p) => p.connectedStatus !== 'offline');
    const targetPlayers = activePlayers.length > 0 ? activePlayers : players;
    const votedIds = round.votedPlayerIds || [];
    const allActiveVoted = targetPlayers.length > 0 && targetPlayers.every((p) => votedIds.includes(p.id));
    if (allActiveVoted) {
      calculateScoresAndTransitionToResults(room.id, round.id, true).catch(console.error);
    }
  }, [room?.status, round?.id, round?.status, round?.scoringProcessed, round?.votedPlayerIds, players]);

  // Auto-advance on countdown expiry: Host has authoritative priority; player phones have 15s fail-safe buffer
  useEffect(() => {
    if (!countdown.isExpired || !room || !round || room.status === 'PAUSED') return;
    const now = Date.now();
    if (!room.phaseDeadline) return;

    // Host device advances immediately at deadline.
    // Non-host player phones only advance after a 15-second grace period as an emergency fail-safe,
    // preventing any player phone clock skew from cutting off voting or answering prematurely.
    const canAdvance = isHost ? now >= room.phaseDeadline : now >= room.phaseDeadline + 15000;
    if (!canAdvance) return;

    if (room.status === 'ANSWERING' && round.status === 'ANSWERING') {
      transitionToVoting(room.id, round.id, room.settings.votingDuration, isHost).catch(console.error);
    } else if (room.status === 'VOTING' && round.status === 'VOTING' && !round.scoringProcessed) {
      calculateScoresAndTransitionToResults(room.id, round.id, isHost).catch(console.error);
    }
  }, [countdown.isExpired, isHost, room?.status, room?.phaseDeadline, round?.id, round?.status, round?.scoringProcessed]);

  // Submit Answer handler
  const handleSubmitAnswer = async (answerText: string) => {
    if (!room || !round || !currentUserId) {
      return { success: false, error: 'Session not active.' };
    }
    setIsSubmitting(true);
    try {
      const res = await submitAnswer(room.id, round.id, currentUserId, answerText, room.settings);
      return res;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Vote handler
  const handleSubmitVote = async (selectedAnswerId: string) => {
    if (!room || !round || !currentUserId) {
      return { success: false, error: 'Session not active.' };
    }
    setIsVoting(true);
    try {
      const res = await submitVote(room.id, round.id, currentUserId, selectedAnswerId);
      return res;
    } finally {
      setIsVoting(false);
    }
  };

  // Host Next Round handler
  const handleNextRound = async () => {
    if (!room) return;
    await advanceToNextRound(room.id, room.currentRoundNumber + 1, room.settings.totalRounds);
  };

  // Host Start Round handler
  const handleStartRound = async () => {
    if (!room || !room.currentRoundId) return;
    await startRound(room.id, room.currentRoundId, room.settings.answerDuration);
  };

  if (isLoading || !authReady) {
    return (
      <div className="min-h-screen bg-psych-black flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto border-4 border-psych-yellow border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-psych-yellow">
            Connecting to PSYCH Room...
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage || !room) {
    return (
      <div className="min-h-screen bg-psych-black text-white flex flex-col justify-between">
        <Header />
        <div className="max-w-md mx-auto p-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-psych-red/10 border-2 border-psych-red flex items-center justify-center text-psych-red">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-display font-black">Room Not Found</h2>
          <p className="text-sm text-neutral-400">{errorMessage || 'Unable to join this room.'}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-psych-yellow text-psych-black font-extrabold text-xs rounded-xl btn-brutal uppercase tracking-wider"
          >
            RETURN HOME
          </a>
        </div>
        <footer className="py-4 text-center text-xs text-neutral-500">PSYCH — E-Cell SVNIT</footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-psych-black text-white flex flex-col justify-between relative selection:bg-psych-yellow selection:text-psych-black">
      <div className="absolute inset-0 halftone-bg pointer-events-none opacity-40" />

      {/* Reconnection badge */}
      {!isOnline && (
        <div className="bg-psych-red text-white py-1.5 px-4 text-center text-xs font-bold flex items-center justify-center gap-2 sticky top-0 z-50">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Connection lost! Reconnecting to live server...</span>
        </div>
      )}

      {/* Header */}
      <Header roomCode={room.roomCode} playerCount={players.length} isHost={isHost} />

      {/* Paused Overlay */}
      <PausedOverlay isPaused={room.status === 'PAUSED'} />

      {/* Phase Views */}
      <main className="flex-1 px-4 py-6 relative z-10">
        {room.status === 'LOBBY' && (
          <LobbyPhase
            room={room}
            players={players}
            currentUserId={currentUserId}
            isHost={isHost}
            onStartGame={handleStartRound}
          />
        )}

        {room.status === 'ANSWERING' && round && (
          <AnsweringPhase
            key={`${round.id}-${round.restartCount ?? 0}`}
            room={room}
            round={round}
            userAnswer={userAnswer}
            countdown={countdown}
            players={players}
            currentUserId={currentUserId}
            onSubmit={handleSubmitAnswer}
            isSubmitting={isSubmitting}
          />
        )}

        {room.status === 'SUBMISSION_LOCKED' && <SubmissionLockedPhase />}

        {room.status === 'VOTING' && round && (
          <VotingPhase
            room={room}
            round={round}
            answers={answers}
            players={players}
            currentUserId={currentUserId}
            userVote={userVote}
            countdown={countdown}
            onVote={handleSubmitVote}
            isVoting={isVoting}
          />
        )}

        {room.status === 'VOTING_LOCKED' && <VotingLockedPhase />}

        {room.status === 'RESULTS' && round && (
          <ResultsPhase
            room={room}
            round={round}
            answers={answers}
            players={players}
            scores={scores}
            currentUserId={currentUserId}
            isHost={isHost}
            onNextRound={handleNextRound}
            onEndGame={() => advanceToNextRound(room.id, room.settings.totalRounds + 1, room.settings.totalRounds)}
          />
        )}

        {room.status === 'GAME_FINISHED' && (
          <GameFinishedPhase
            room={room}
            players={players}
            currentUserId={currentUserId}
            isHost={isHost}
          />
        )}
      </main>

      <footer className="py-4 text-center text-xs text-neutral-500 relative z-10">
        PSYCH • E-Cell SVNIT Live Multiplayer
      </footer>
    </div>
  );
};
