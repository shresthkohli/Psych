import { describe, it, expect } from 'vitest';
import {
  RoomLike,
  clampTotalRounds,
  clampMaxPlayers,
  minQuestionsToStart,
  getQuestionCount,
  getRemainingQuestionSlots,
  getAddQuestionBlockReason,
  getStartBlockReason,
  getNextRoundBlockReason,
  getJoinBlockReason,
  isQuestionEditable,
  validateQuestionText,
  validateTotalRounds,
  validateMaxPlayers,
  missingQuestionMessage,
} from '../src/lib/questionRules';
import { GAME_LIMITS } from '../src/constants/gameLimits';

function room(overrides: Partial<RoomLike> = {}): RoomLike {
  return {
    status: 'LOBBY',
    currentRoundNumber: 1,
    questionCount: 0,
    settings: { totalRounds: 5 },
    ...overrides,
  };
}

describe('questionRules business logic', () => {
  it('clampTotalRounds correctly clamps input values', () => {
    expect(clampTotalRounds(NaN)).toBe(GAME_LIMITS.DEFAULT_TOTAL_ROUNDS);
    expect(clampTotalRounds(0)).toBe(1);
    expect(clampTotalRounds(999)).toBe(GAME_LIMITS.MAX_QUESTIONS_PER_GAME);
    expect(clampTotalRounds(7.9)).toBe(7);
  });

  it('clampMaxPlayers correctly clamps player limit values', () => {
    expect(clampMaxPlayers(NaN)).toBe(GAME_LIMITS.DEFAULT_MAX_PLAYERS);
    expect(clampMaxPlayers(0)).toBe(GAME_LIMITS.MIN_PLAYERS_LIMIT);
    expect(clampMaxPlayers(100000)).toBe(GAME_LIMITS.MAX_PLAYERS_CAP);
  });

  it('minQuestionsToStart returns lower of minimum start limit or total rounds', () => {
    expect(minQuestionsToStart(10)).toBe(GAME_LIMITS.MIN_QUESTIONS_TO_START);
    expect(minQuestionsToStart(2)).toBe(2);
    expect(minQuestionsToStart(1)).toBe(1);
  });

  it('getQuestionCount reads questionCount or falls back to totalRounds for legacy rooms', () => {
    expect(getQuestionCount({ questionCount: 4, settings: { totalRounds: 5 } })).toBe(4);
    expect(getQuestionCount({ questionCount: undefined, settings: { totalRounds: 5 } })).toBe(5);
  });

  it('getAddQuestionBlockReason blocks when game is finished or limit reached', () => {
    expect(getAddQuestionBlockReason(room({ questionCount: GAME_LIMITS.MAX_QUESTIONS_PER_GAME - 1 }))).toBeNull();
    const maxReason = getAddQuestionBlockReason(room({ questionCount: GAME_LIMITS.MAX_QUESTIONS_PER_GAME }));
    expect(maxReason).toContain(String(GAME_LIMITS.MAX_QUESTIONS_PER_GAME));
    expect(typeof getAddQuestionBlockReason(room({ status: 'GAME_FINISHED' }))).toBe('string');
  });

  it('getStartBlockReason checks minimum questions for round 1 and current question presence', () => {
    expect(typeof getStartBlockReason(room({ currentRoundNumber: 1, questionCount: 2, settings: { totalRounds: 5 } }))).toBe('string');
    expect(getStartBlockReason(room({ currentRoundNumber: 1, questionCount: GAME_LIMITS.MIN_QUESTIONS_TO_START, settings: { totalRounds: 5 } }))).toBeNull();
    expect(getStartBlockReason(room({ currentRoundNumber: 1, questionCount: 2, settings: { totalRounds: 2 } }))).toBeNull();
    expect(getStartBlockReason(room({ currentRoundNumber: 3, questionCount: 2 }))).toBe(missingQuestionMessage(3));
    expect(getStartBlockReason(room({ questionCount: undefined, settings: { totalRounds: 5 } }))).toBeNull();
  });

  it('getNextRoundBlockReason checks next question presence until final round', () => {
    expect(typeof getNextRoundBlockReason(room({ currentRoundNumber: 2, questionCount: 2, settings: { totalRounds: 5 } }))).toBe('string');
    expect(getNextRoundBlockReason(room({ currentRoundNumber: 2, questionCount: 3, settings: { totalRounds: 5 } }))).toBeNull();
    expect(getNextRoundBlockReason(room({ currentRoundNumber: 5, questionCount: 5, settings: { totalRounds: 5 } }))).toBeNull();
  });

  it('getJoinBlockReason enforces max players limit', () => {
    expect(getJoinBlockReason(5, undefined)).toBeNull();
    expect(getJoinBlockReason(4, 5)).toBeNull();
    expect(typeof getJoinBlockReason(5, 5)).toBe('string');
  });

  it('isQuestionEditable determines question editability based on round status', () => {
    expect(isQuestionEditable(5, 3, 'ANSWERING')).toBe(true);
    expect(isQuestionEditable(3, 3, 'ANSWERING')).toBe(false);
    expect(isQuestionEditable(3, 3, 'LOBBY')).toBe(true);
    expect(isQuestionEditable(2, 3, 'LOBBY')).toBe(false);
    expect(isQuestionEditable(5, 3, 'GAME_FINISHED')).toBe(false);
    expect(isQuestionEditable(3, 3, 'PAUSED')).toBe(false);
  });

  it('validateQuestionText validates question whitespace and length', () => {
    expect(validateQuestionText('   ').valid).toBe(false);
    const validResult = validateQuestionText('  hello   world ');
    expect(validResult.valid).toBe(true);
    expect(validResult.clean).toBe('hello world');
    expect(validateQuestionText('a'.repeat(GAME_LIMITS.MAX_QUESTION_LENGTH + 1)).valid).toBe(false);
    expect(validateQuestionText('a'.repeat(GAME_LIMITS.MAX_QUESTION_LENGTH)).valid).toBe(true);
  });

  it('validateTotalRounds checks integer bounds and current progress', () => {
    expect(typeof validateTotalRounds(GAME_LIMITS.MAX_QUESTIONS_PER_GAME + 1, room())).toBe('string');
    expect(typeof validateTotalRounds(1, room({ currentRoundNumber: 3 }))).toBe('string');
    expect(validateTotalRounds(3, room({ currentRoundNumber: 3 }))).toBeNull();
    expect(typeof validateTotalRounds(5, room({ status: 'GAME_FINISHED' }))).toBe('string');
    expect(typeof validateTotalRounds(2.5, room())).toBe('string');
  });

  it('validateMaxPlayers checks player limits against current player count', () => {
    expect(typeof validateMaxPlayers(GAME_LIMITS.MIN_PLAYERS_LIMIT - 1, 0)).toBe('string');
    expect(typeof validateMaxPlayers(GAME_LIMITS.MAX_PLAYERS_CAP + 1, 0)).toBe('string');
    expect(typeof validateMaxPlayers(5, 8)).toBe('string');
    expect(validateMaxPlayers(8, 8)).toBeNull();
  });

  describe('validateTotalRounds', () => {
    const testRoom = room({
      status: 'LOBBY',
      currentRoundNumber: 1,
      questionCount: 5,
      settings: { totalRounds: 6 },
    });

    it('returns a non-null string containing "5" when n is lower than typed questions', () => {
      const result = validateTotalRounds(3, testRoom);
      expect(result).not.toBeNull();
      expect(result).toContain('5');
    });

    it('returns null when n equals typed questions', () => {
      expect(validateTotalRounds(5, testRoom)).toBeNull();
    });

    it('returns null when n is greater than typed questions within limits', () => {
      expect(validateTotalRounds(6, testRoom)).toBeNull();
    });

    it('returns the max-limit error when n exceeds MAX_QUESTIONS_PER_GAME', () => {
      const maxExceeded = GAME_LIMITS.MAX_QUESTIONS_PER_GAME + 1;
      const result = validateTotalRounds(maxExceeded, testRoom);
      expect(result).not.toBeNull();
      expect(result).toContain(String(GAME_LIMITS.MAX_QUESTIONS_PER_GAME));
    });

    it('handles legacy rooms where questionCount is undefined', () => {
      const legacyRoom = room({
        status: 'LOBBY',
        currentRoundNumber: 1,
        questionCount: undefined,
        settings: { totalRounds: 4 },
      });
      expect(validateTotalRounds(2, legacyRoom)).not.toBeNull();
      expect(validateTotalRounds(4, legacyRoom)).toBeNull();
    });

    it('returns game finished error when room status is GAME_FINISHED', () => {
      const finishedRoom = room({ status: 'GAME_FINISHED' });
      expect(validateTotalRounds(5, finishedRoom)).toBe('The game has finished.');
    });
  });

  describe('getRemainingQuestionSlots', () => {
    it('returns MAX_QUESTIONS_PER_GAME when questionCount is 0', () => {
      expect(getRemainingQuestionSlots(room({ questionCount: 0 }))).toBe(
        GAME_LIMITS.MAX_QUESTIONS_PER_GAME,
      );
    });

    it('returns 0 when questionCount equals MAX_QUESTIONS_PER_GAME', () => {
      expect(
        getRemainingQuestionSlots(room({ questionCount: GAME_LIMITS.MAX_QUESTIONS_PER_GAME })),
      ).toBe(0);
    });

    it('falls back to settings.totalRounds when questionCount is undefined', () => {
      expect(
        getRemainingQuestionSlots(room({ questionCount: undefined, settings: { totalRounds: 4 } })),
      ).toBe(GAME_LIMITS.MAX_QUESTIONS_PER_GAME - 4);
    });

    it('never returns a negative number', () => {
      expect(
        getRemainingQuestionSlots(
          room({ questionCount: GAME_LIMITS.MAX_QUESTIONS_PER_GAME + 5 }),
        ),
      ).toBe(0);
    });
  });
});

