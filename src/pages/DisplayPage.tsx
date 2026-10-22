import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  getRoomByCode,
  subscribeToRoom,
  subscribeToPlayers,
  subscribeToRound,
  subscribeToAnswers,
  subscribeToScores,
} from '../services/firestoreService';
import { Room, Round, Player, Answer, RoundScore } from '../types/game';
import { PresentationScreen } from '../components/presentation/PresentationScreen';

export const DisplayPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();

  const [room, setRoom] = useState<Room | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [scores, setScores] = useState<Record<string, RoundScore>>({});
  const [isLoading, setIsLoading] = useState(true);

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
        unsubRoom = subscribeToRoom(r.id, (updated) => {
          if (updated) setRoom(updated);
        });
        unsubPlayers = subscribeToPlayers(r.id, (plist) => {
          setPlayers(plist);
        });
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Display screen error:', err);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-psych-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-psych-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-psych-black text-white p-12 text-center">
        <h1 className="text-3xl font-display font-black text-psych-yellow">Room Not Found</h1>
        <p className="text-neutral-400 mt-2">Check the room code in the URL.</p>
      </div>
    );
  }

  return (
    <PresentationScreen
      room={room}
      round={round}
      answers={answers}
      players={players}
      scores={scores}
    />
  );
};
