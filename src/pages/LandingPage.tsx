import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Play, PlusCircle, HelpCircle, Flame, Shield, ArrowRight } from 'lucide-react';
import { Header } from '../components/common/Header';
import { RulesModal } from '../components/common/RulesModal';
import { createRoom } from '../services/firestoreService';
import { getOrCreateAnonymousUser, sessionStore } from '../services/authService';
import { GAME_LIMITS } from '../constants/gameLimits';
import { APP_INFO } from '../constants/appInfo';
import { clampTotalRounds, clampMaxPlayers, minQuestionsToStart } from '../lib/questionRules';
import { RoomSettings } from '../types/game';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);

  // Room config state
  const [roomName, setRoomName] = useState<string>(APP_INFO.DEFAULT_ROOM_NAME);
  const [eventLabel, setEventLabel] = useState<string>('');
  const [totalRounds, setTotalRounds] = useState<number>(GAME_LIMITS.DEFAULT_TOTAL_ROUNDS);
  const [maxPlayers, setMaxPlayers] = useState<number>(GAME_LIMITS.DEFAULT_MAX_PLAYERS);
  const [answerDuration, setAnswerDuration] = useState(120);
  const [votingDuration, setVotingDuration] = useState(90);
  const [maxWords, setMaxWords] = useState(50);
  const [minWords, setMinWords] = useState(1);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingRoom(true);
    setCreateError(null);

    try {
      const user = await getOrCreateAnonymousUser();
      const hostUid = user ? user.uid : `host_${Date.now()}`;
      const hostSecret = `secret_${Math.random().toString(36).substring(2, 10)}`;

      const settings: RoomSettings = {
        totalRounds: clampTotalRounds(totalRounds),
        maxPlayers: clampMaxPlayers(maxPlayers),
        answerDuration,
        votingDuration,
        maxWords,
        minWords,
        allowVoteChanges: true,
        allowAnswerEdits: true,
        showSubmissionsCount: true,
      };

      const { roomCode } = await createRoom(hostUid, hostSecret, roomName.trim(), eventLabel.trim(), settings, []);

      // Save host token
      sessionStore.saveHostToken(roomCode, hostSecret);

      navigate(`/host/${roomCode}`);
    } catch (err: unknown) {
      console.error('Room creation error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create room. Check Firebase connection.';
      setCreateError(msg);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  return (
    <div className="min-h-screen bg-outwit-black text-white flex flex-col justify-between selection:bg-outwit-yellow selection:text-outwit-black relative overflow-x-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 halftone-bg pointer-events-none opacity-40" />

      {/* Header */}
      <Header />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          {/* Badge */}
          <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-outwit-dark border border-outwit-yellow/40 text-xs font-mono font-bold tracking-wider text-outwit-yellow shadow-md uppercase">
            <Sparkles className="w-4 h-4 text-outwit-yellow" />
            <span>{APP_INFO.BADGE}</span>
          </div>
          </div>

          {/* Huge title */}
          <div className="relative inline-block">
            <h1 className="text-6xl sm:text-8xl md:text-9xl font-display font-black tracking-tighter text-white transform -rotate-1 select-none">
              {APP_INFO.NAME}<span className="text-outwit-yellow font-comic">!</span>
            </h1>
            <div className="absolute -bottom-3 right-0 bg-outwit-red text-white text-[11px] md:text-xs font-black uppercase tracking-wider px-3 py-1 rounded-md shadow-brutal transform rotate-2">
              PARTY EDITION
            </div>
          </div>

          {/* Subtitle */}
          <div className="space-y-2 pt-2">
            <p className="text-2xl sm:text-3xl font-display font-black text-outwit-yellow tracking-tight">
              Think fast. Write wild. Read minds.
            </p>
            <p className="text-base sm:text-lg text-neutral-300 max-w-xl mx-auto leading-relaxed">
              A live anonymous multiplayer game of witty prompts, disguised answers, and high-stakes social guessing.
            </p>
          </div>

          {/* Primary & Secondary Call to Actions */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={() => setRoomModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 bg-outwit-yellow hover:bg-yellow-400 text-outwit-black font-display font-black text-base rounded-2xl btn-brutal flex items-center justify-center gap-2 uppercase tracking-wider shadow-brutal-lg"
            >
              <PlusCircle className="w-5 h-5 stroke-[2.5]" />
              <span>CREATE A GAME</span>
            </button>

            <button
              onClick={() => navigate('/join')}
              className="w-full sm:w-auto px-8 py-4 bg-outwit-dark hover:bg-neutral-800 text-white font-display font-extrabold text-base rounded-2xl border-2 border-neutral-700 hover:border-outwit-yellow flex items-center justify-center gap-2 uppercase tracking-wider transition-all"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>JOIN A GAME</span>
            </button>
          </div>

          {/* How Scoring Works link */}
          <div className="pt-4">
            <button
              onClick={() => setIsRulesOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-outwit-yellow transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span>How {APP_INFO.NAME} scoring works (1 vote = 1 point)</span>
            </button>
          </div>
        </div>

        {/* Features highlight pills */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
          <div className="p-4 bg-outwit-cardBg/90 border border-neutral-800 rounded-2xl space-y-1">
            <span className="text-outwit-yellow font-black text-sm">01 / ANONYMOUS ANSWERS</span>
            <p className="text-xs text-neutral-400">Write punchy responses in 120s without revealing your name.</p>
          </div>
          <div className="p-4 bg-outwit-cardBg/90 border border-neutral-800 rounded-2xl space-y-1">
            <span className="text-outwit-yellow font-black text-sm">02 / LIVE MOBILE VOTING</span>
            <p className="text-xs text-neutral-400">Pick the funniest or smartest response in 90s on your phone.</p>
          </div>
          <div className="p-4 bg-outwit-cardBg/90 border border-neutral-800 rounded-2xl space-y-1">
            <span className="text-outwit-red font-black text-sm">03 / REAL-TIME LEADERBOARD</span>
            <p className="text-xs text-neutral-400">Reveal authors, award bonus points, and crown the champion.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-neutral-800/80 text-center text-xs text-neutral-500 relative z-10">
        <p>Built with ❤️ • Mobile-First Real-Time Experience</p>
      </footer>

      {/* Rules Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* Room Creation Modal */}
      {roomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="max-w-lg w-full bg-outwit-dark border-2 border-outwit-yellow rounded-2xl p-6 shadow-brutal space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h2 className="text-xl font-display font-black text-white uppercase tracking-tight">
                Create {APP_INFO.NAME} Room
              </h2>
              <button
                onClick={() => setRoomModalOpen(false)}
                className="text-neutral-400 hover:text-white text-xs font-bold"
              >
                CLOSE
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  maxLength={GAME_LIMITS.ROOM_NAME_MAX_LENGTH}
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full p-3 bg-outwit-black border border-neutral-700 rounded-xl text-white text-sm focus:border-outwit-yellow focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
                  Event or group (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Friday house party"
                  maxLength={GAME_LIMITS.EVENT_LABEL_MAX_LENGTH}
                  value={eventLabel}
                  onChange={(e) => setEventLabel(e.target.value)}
                  className="w-full p-3 bg-outwit-black border border-neutral-700 rounded-xl text-white text-sm focus:border-outwit-yellow focus:outline-none"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Shown in the lobby and used to personalise AI-generated questions.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
                    Number of Questions (max {GAME_LIMITS.MAX_QUESTIONS_PER_GAME})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={GAME_LIMITS.MAX_QUESTIONS_PER_GAME}
                    value={totalRounds}
                    onChange={(e) => setTotalRounds(Number(e.target.value))}
                    className="w-full p-3 bg-outwit-black border border-neutral-700 rounded-xl text-white text-sm focus:border-outwit-yellow focus:outline-none"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    You can start after typing {minQuestionsToStart(clampTotalRounds(totalRounds))} — add the rest during the game.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
                    Max Word Limit
                  </label>
                  <select
                    value={maxWords}
                    onChange={(e) => setMaxWords(Number(e.target.value))}
                    className="w-full p-3 bg-outwit-black border border-neutral-700 rounded-xl text-white text-sm focus:border-outwit-yellow focus:outline-none"
                  >
                    <option value={30}>30 Words</option>
                    <option value={40}>40 Words</option>
                    <option value={50}>50 Words (Default)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
                  Max Players ({GAME_LIMITS.MIN_PLAYERS_LIMIT}–{GAME_LIMITS.MAX_PLAYERS_CAP})
                </label>
                <input
                  type="number"
                  min={GAME_LIMITS.MIN_PLAYERS_LIMIT}
                  max={GAME_LIMITS.MAX_PLAYERS_CAP}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full p-3 bg-outwit-black border border-neutral-700 rounded-xl text-white text-sm focus:border-outwit-yellow focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
                    Answer Duration
                  </label>
                  <select
                    value={answerDuration}
                    onChange={(e) => setAnswerDuration(Number(e.target.value))}
                    className="w-full p-3 bg-outwit-black border border-neutral-700 rounded-xl text-white text-sm focus:border-outwit-yellow focus:outline-none"
                  >
                    <option value={60}>60 Seconds</option>
                    <option value={90}>90 Seconds</option>
                    <option value={120}>120 Seconds (Default)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
                    Voting Duration
                  </label>
                  <select
                    value={votingDuration}
                    onChange={(e) => setVotingDuration(Number(e.target.value))}
                    className="w-full p-3 bg-outwit-black border border-neutral-700 rounded-xl text-white text-sm focus:border-outwit-yellow focus:outline-none"
                  >
                    <option value={45}>45 Seconds</option>
                    <option value={60}>60 Seconds</option>
                    <option value={90}>90 Seconds (Default)</option>
                  </select>
                </div>
              </div>

              {createError && (
                <div className="p-3 bg-outwit-red/10 border border-outwit-red/40 rounded-xl text-xs text-outwit-red">
                  {createError}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreatingRoom}
                  className="w-full py-3.5 bg-outwit-yellow hover:bg-yellow-400 disabled:opacity-50 text-outwit-black font-extrabold text-sm rounded-xl btn-brutal uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  {isCreatingRoom ? 'INITIALIZING ROOM...' : 'LAUNCH ROOM AS HOST'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
