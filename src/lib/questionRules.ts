import { GAME_LIMITS } from '../constants/gameLimits';
import type { GamePhase } from '../types/game';

/** Minimal room shape the rules need (keeps this file free of Firestore/React). */
export interface RoomLike {
  status: GamePhase;
  currentRoundNumber: number;
  questionCount?: number;
  settings: { totalRounds: number; maxPlayers?: number };
}

export const QUESTION_ALREADY_ASKED_MSG = 'This question has already been asked and can no longer be edited.';

export function missingQuestionMessage(roundNumber: number): string {
  return `Type question ${roundNumber} to continue.`;
}

// ---------- clamping (for form inputs) ----------
export function clampTotalRounds(n: number): number {
  if (!Number.isFinite(n)) return GAME_LIMITS.DEFAULT_TOTAL_ROUNDS;
  return Math.min(GAME_LIMITS.MAX_QUESTIONS_PER_GAME, Math.max(1, Math.floor(n)));
}

export function clampMaxPlayers(n: number): number {
  if (!Number.isFinite(n)) return GAME_LIMITS.DEFAULT_MAX_PLAYERS;
  return Math.min(GAME_LIMITS.MAX_PLAYERS_CAP, Math.max(GAME_LIMITS.MIN_PLAYERS_LIMIT, Math.floor(n)));
}

// ---------- derived values ----------
export function minQuestionsToStart(totalRounds: number): number {
  return Math.min(GAME_LIMITS.MIN_QUESTIONS_TO_START, Math.max(1, totalRounds));
}

export function getQuestionCount(room: Pick<RoomLike, 'questionCount' | 'settings'>): number {
  return room.questionCount ?? room.settings.totalRounds;
}

// ---------- block reasons: null = allowed, string = the message to show ----------
export function getAddQuestionBlockReason(room: Pick<RoomLike, 'status' | 'questionCount' | 'settings'>): string | null {
  if (room.status === 'GAME_FINISHED') return 'The game has finished.';
  if (getQuestionCount(room) >= GAME_LIMITS.MAX_QUESTIONS_PER_GAME) {
    return `Maximum of ${GAME_LIMITS.MAX_QUESTIONS_PER_GAME} questions reached.`;
  }
  return null;
}

export function getStartBlockReason(room: RoomLike): string | null {
  const count = getQuestionCount(room);
  if (room.currentRoundNumber === 1) {
    const needed = minQuestionsToStart(room.settings.totalRounds);
    return count < needed ? `Type at least ${needed} questions to start the game (${count} typed).` : null;
  }
  return count < room.currentRoundNumber ? missingQuestionMessage(room.currentRoundNumber) : null;
}

export function getNextRoundBlockReason(room: RoomLike): string | null {
  // On the final round the host finishes the game instead of advancing, so nothing blocks it.
  if (room.currentRoundNumber >= room.settings.totalRounds) return null;
  if (getQuestionCount(room) <= room.currentRoundNumber) {
    return `${missingQuestionMessage(room.currentRoundNumber + 1)} You can also lower the total rounds to finish.`;
  }
  return null;
}

export function getJoinBlockReason(currentPlayerCount: number, maxPlayers?: number): string | null {
  if (!maxPlayers) return null;
  return currentPlayerCount >= maxPlayers ? `This room is full (maximum ${maxPlayers} players).` : null;
}

// ---------- predicates ----------
export function isQuestionEditable(roundNumber: number, currentRoundNumber: number, status: GamePhase): boolean {
  if (status === 'GAME_FINISHED') return false;
  if (roundNumber > currentRoundNumber) return true;
  return roundNumber === currentRoundNumber && status === 'LOBBY';
}

// ---------- validation: null = valid, string = error message ----------
export function validateQuestionText(text: string): { valid: boolean; error?: string; clean: string } {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (!clean) return { valid: false, error: 'Question cannot be empty.', clean };
  if (clean.length > GAME_LIMITS.MAX_QUESTION_LENGTH) {
    return { valid: false, error: `Question is too long (max ${GAME_LIMITS.MAX_QUESTION_LENGTH} characters).`, clean };
  }
  return { valid: true, clean };
}

export function validateTotalRounds(n: number, room: Pick<RoomLike, 'status' | 'currentRoundNumber'>): string | null {
  if (room.status === 'GAME_FINISHED') return 'The game has finished.';
  if (!Number.isInteger(n)) return 'Total rounds must be a whole number.';
  if (n < Math.max(1, room.currentRoundNumber)) {
    return `Total rounds cannot be lower than the current round (${room.currentRoundNumber}).`;
  }
  if (n > GAME_LIMITS.MAX_QUESTIONS_PER_GAME) {
    return `Total rounds cannot exceed ${GAME_LIMITS.MAX_QUESTIONS_PER_GAME}.`;
  }
  return null;
}

export function validateMaxPlayers(n: number, currentPlayerCount: number): string | null {
  if (!Number.isInteger(n) || n < GAME_LIMITS.MIN_PLAYERS_LIMIT || n > GAME_LIMITS.MAX_PLAYERS_CAP) {
    return `Max players must be a whole number between ${GAME_LIMITS.MIN_PLAYERS_LIMIT} and ${GAME_LIMITS.MAX_PLAYERS_CAP}.`;
  }
  if (n < currentPlayerCount) return `There are already ${currentPlayerCount} players in the room.`;
  return null;
}

