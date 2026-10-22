import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Users, Sparkles, Shield, ArrowRight } from 'lucide-react';
import { Room, Player } from '../../types/game';

interface LobbyPhaseProps {
  room: Room;
  players: Player[];
  currentUserId?: string;
  isHost?: boolean;
  onStartGame?: () => void;
}

export const LobbyPhase: React.FC<LobbyPhaseProps> = ({
  room,
  players,
  currentUserId,
  isHost = false,
  onStartGame,
}) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/join?code=${room.roomCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Event Banner */}
      <div className="text-center space-y-1">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-psych-yellow/10 border border-psych-yellow/30 text-psych-yellow text-xs font-bold tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          {room.eventLabel || 'E-Cell SVNIT'} Present
        </span>
        <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight">
          {room.roomName || 'PSYCH Live'}
        </h1>
        <p className="text-sm text-neutral-400">
          Round {room.currentRoundNumber} of {room.settings.totalRounds} • Waiting for players
        </p>
      </div>

      {/* Room Code & QR Card */}
      <div className="bg-psych-cardBg border-2 border-psych-yellow rounded-2xl p-6 shadow-brutal text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-28 h-28 bg-psych-yellow/5 rounded-bl-full pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          {/* QR Code */}
          <div className="p-3 bg-white rounded-xl shadow-lg border-2 border-psych-black flex-shrink-0">
            <QRCodeSVG value={shareUrl} size={140} level="M" />
          </div>

          {/* Room Code and Share */}
          <div className="space-y-3 text-center md:text-left">
            <div>
              <span className="text-xs uppercase tracking-wider text-neutral-400 font-bold">
                Join with Room Code
              </span>
              <div className="mt-1 flex items-center justify-center md:justify-start gap-2">
                <span className="font-mono font-black text-4xl text-psych-yellow tracking-wider select-all">
                  {room.roomCode}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg border border-neutral-700 transition-colors"
                  title="Copy room code"
                >
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-neutral-400 max-w-xs">
              Scan QR code on your phone or go to <strong className="text-white">{window.location.host}/join</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Connected Players List */}
      <div className="bg-psych-cardBg border border-psych-borderDark rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-psych-yellow" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Joined Participants ({players.length})
            </h2>
          </div>
          <span className="text-xs text-neutral-400 font-mono">
            {players.length >= 2 ? 'Ready to launch' : 'Min 2 players recommended'}
          </span>
        </div>

        {players.length === 0 ? (
          <div className="py-8 text-center text-neutral-500 text-sm italic">
            Waiting for players to join...
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
            {players.map((player) => {
              const isMe = player.id === currentUserId || player.uid === currentUserId;
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    isMe
                      ? 'bg-psych-yellow/15 border-psych-yellow text-psych-yellow font-bold shadow-sm'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span>{player.displayName}</span>
                  {isMe && <span className="text-[10px] bg-psych-yellow text-black px-1.5 py-0.2 rounded font-black">YOU</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Host / Waiting State Action */}
      {isHost ? (
        <div className="bg-neutral-900 border-2 border-psych-yellow/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-neutral-300">
            <Shield className="w-4 h-4 text-psych-yellow" />
            <span>You are controlling this room as <strong>Host</strong>.</span>
          </div>
          <button
            onClick={onStartGame}
            disabled={players.length === 0}
            className="w-full sm:w-auto px-6 py-3 bg-psych-yellow hover:bg-yellow-400 disabled:opacity-50 text-psych-black font-extrabold text-sm rounded-xl btn-brutal flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            <span>START ROUND 1</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="text-center py-4 space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs animate-pulse">
            <span className="w-2 h-2 rounded-full bg-psych-yellow animate-ping" />
            Waiting for the host to start the round...
          </div>
        </div>
      )}
    </div>
  );
};
