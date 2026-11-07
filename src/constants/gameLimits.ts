export const GAME_LIMITS = {
  /** Hard cap on questions (= rounds) per game. Change ONLY here. */
  MAX_QUESTIONS_PER_GAME: 15,
  /** Typed questions required before round 1 can start (automatically lowered if totalRounds is smaller). */
  MIN_QUESTIONS_TO_START: 3,
  DEFAULT_TOTAL_ROUNDS: 4,
  /** Max characters in one question. */
  MAX_QUESTION_LENGTH: 200,
  DEFAULT_MAX_PLAYERS: 15,
  MIN_PLAYERS_LIMIT: 2,
  MAX_PLAYERS_CAP: 30,
} as const;

