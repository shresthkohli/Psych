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
  DEFAULT_AI_QUESTION_COUNT: 8,
  MAX_IMPORT_FILE_BYTES: 102400, // 100 KB
  AI_CONTEXT_MAX_LENGTH: 600, // host free-text "about my group"
  AI_TOPICS_MAX_LENGTH: 200, // include / avoid topic fields
  AI_NICKNAME_MAX_LENGTH: 30, // per nickname inside the prompt
} as const;

