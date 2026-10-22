import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, AlertCircle, ArrowLeft, Users, Sparkles } from 'lucide-react';
import { Header } from '../components/common/Header';
import { getRoomByCode, joinRoom } from '../services/firestoreService';
import { getOrCreateAnonymousUser, sessionStore } from '../services/authService';

export const JoinPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code') || '';

  const [roomCode, setRoomCode] = useState(codeFromUrl.toUpperCase());
  const [displayName, setDisplayName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (codeFromUrl) {
      setRoomCode(codeFromUrl.toUpperCase());
      const existing = sessionStore.getPlayerSession(codeFromUrl);
      if (existing) {
        setDisplayName(existing.displayName);
      }
    }
  }, [codeFromUrl]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = roomCode.trim().toUpperCase();
    const cleanName = displayName.trim();

    if (!cleanCode) {
      setErrorMessage('Please enter a room code.');
      return;
    }
    if (!cleanName) {
      setErrorMessage('Please enter your nickname.');
      return;
    }

    setIsJoining(true);
    setErrorMessage(null);

    try {
      // 1. Authenticate anonymously
      const user = await getOrCreateAnonymousUser();
      const uid = user ? user.uid : `anon_${Date.now()}`;

      // Check existing session for this room to avoid duplicate players
      const existingSession = sessionStore.getPlayerSession(cleanCode);
      const playerId = existingSession?.playerId || uid;

      // 2. Validate room exists in Firestore
      const room = await getRoomByCode(cleanCode);
      if (!room) {
        setErrorMessage(`Room "${cleanCode}" was not found. Please double-check the code.`);
        setIsJoining(false);
        return;
      }

      if (room.status === 'GAME_FINISHED') {
        setErrorMessage('This game has already finished.');
        setIsJoining(false);
        return;
      }

      // 3. Register player in room
      const player = await joinRoom(room.id, playerId, cleanName, uid);

      // 4. Save session locally for reconnect resilience
      sessionStore.savePlayerSession(cleanCode, {
        playerId: player.id,
        displayName: cleanName,
      });

      // 5. Navigate to room
      navigate(`/room/${cleanCode}`);
    } catch (err: unknown) {
      console.error('Join room error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to join room. Please check your connection.';
      setErrorMessage(msg);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-psych-black text-white flex flex-col justify-between relative selection:bg-psych-yellow selection:text-psych-black">
      <div className="absolute inset-0 halftone-bg pointer-events-none opacity-40" />

      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-md bg-psych-cardBg border-2 border-psych-yellow rounded-3xl p-6 md:p-8 shadow-brutal space-y-6">
          <div className="text-center space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-psych-yellow/15 border border-psych-yellow/40 text-psych-yellow text-xs font-mono font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              JOIN MULTIPLAYER ROOM
            </span>
            <h1 className="text-3xl font-display font-black text-white tracking-tight">
              Enter The Arena
            </h1>
            <p className="text-xs text-neutral-400">
              No account required. Jump right into the live college game.
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g. MIND27"
                maxLength={10}
                className="w-full p-3.5 bg-psych-black border-2 border-neutral-700 focus:border-psych-yellow rounded-xl font-mono font-extrabold text-lg text-psych-yellow tracking-widest placeholder-neutral-600 focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                Your Nickname
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. SuratKeLocho"
                maxLength={20}
                className="w-full p-3.5 bg-psych-black border-2 border-neutral-700 focus:border-psych-yellow rounded-xl text-base text-white placeholder-neutral-600 focus:outline-none transition-colors"
                required
              />
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-psych-red/10 border border-psych-red/40 rounded-xl text-xs text-psych-red">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isJoining}
              className="w-full py-4 bg-psych-yellow hover:bg-yellow-400 disabled:opacity-50 text-psych-black font-extrabold text-sm rounded-xl btn-brutal uppercase tracking-wider flex items-center justify-center gap-2 shadow-brutal"
            >
              <LogIn className="w-4 h-4" />
              <span>{isJoining ? 'JOINING ROOM...' : 'JOIN PSYCH GAME'}</span>
            </button>
          </form>

          <div className="pt-2 text-center">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to home</span>
            </a>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-neutral-500 relative z-10">
        E-Cell SVNIT • Live Multiplayer Game
      </footer>
    </div>
  );
};
