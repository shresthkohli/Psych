import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getRoomByCode, subscribeToRoom, subscribeToPlayers } from '../services/firestoreService';
import { Room, Player } from '../types/game';
import { Header } from '../components/common/Header';
import { GameFinishedPhase } from '../components/phases/GameFinishedPhase';

export const ResultsPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
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
        unsubRoom = subscribeToRoom(r.id, (up) => {
          if (up) setRoom(up);
        });
        unsubPlayers = subscribeToPlayers(r.id, (plist) => {
          setPlayers(plist);
        });
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Results page error:', err);
        setIsLoading(false);
      });

    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [roomCode]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-psych-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-psych-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-psych-black text-white p-12 text-center">
        <h1 className="text-3xl font-display font-black text-psych-yellow">Results Not Found</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-psych-black text-white flex flex-col justify-between selection:bg-psych-yellow selection:text-psych-black">
      <Header roomCode={room.roomCode} playerCount={players.length} />
      <main className="flex-1 px-4 py-8">
        <GameFinishedPhase
          room={room}
          players={players}
          currentUserId=""
          isHost={false}
        />
      </main>
      <footer className="py-4 text-center text-xs text-neutral-500">
        PSYCH • E-Cell SVNIT
      </footer>
    </div>
  );
};
