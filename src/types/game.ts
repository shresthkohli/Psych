export type GamePhase =
  | 'LOBBY'
  | 'ANSWERING'
  | 'SUBMISSION_LOCKED'
  | 'VOTING'
  | 'VOTING_LOCKED'
  | 'RESULTS'
  | 'GAME_FINISHED'
  | 'PAUSED';

export interface RoomSettings {
  answerDuration: number; // in seconds (default 120)
  votingDuration: number; // in seconds (default 90)
  maxWords: number; // default 50 (max allowed 50)
  minWords: number; // default 1 (can be set up to 30)
  allowVoteChanges: boolean; // default true
  allowAnswerEdits: boolean; // default true
  showSubmissionsCount: boolean; // default true
  totalRounds: number; // default 4
}

export interface Room {
  id: string;
  roomCode: string;
  roomName?: string;
  eventLabel?: string;
  hostUid: string;
  hostSecret?: string; // stored host verification token
  status: GamePhase;
  previousPhase?: GamePhase; // used when unpausing
  currentRoundNumber: number;
  currentRoundId?: string;
  phaseStartedAt: number; // authoritative unix timestamp ms
  phaseDeadline: number; // authoritative unix timestamp ms
  remainingDurationBeforePause?: number; // ms remaining when paused
  settings: RoomSettings;
  createdAt: number;
  updatedAt: number;
}

export interface Player {
  id: string; // playerId / uid
  uid: string;
  displayName: string;
  totalScore: number;
  connectedStatus: 'online' | 'offline';
  joinedAt: number;
  lastSeenAt: number;
  rank?: number;
}

export interface QuestionItem {
  id: string;
  text: string;
  category?: string;
}

export interface Round {
  id: string;
  roundNumber: number;
  question: string;
  status: GamePhase;
  phaseStartedAt: number;
  phaseDeadline: number;
  eligiblePlayerCount: number;
  submissionCount: number;
  voteCount: number;
  submittedPlayerIds?: string[];
  votedPlayerIds?: string[];
  randomizedAnswerIds: string[];
  resultsRevealed: boolean;
  scoringProcessed: boolean;
  restartCount?: number;
  createdAt: number;
}

export interface Answer {
  id: string;
  authorPlayerId: string; // Private until RESULTS phase
  answerText: string;
  normalizedWordCount: number;
  submittedAt: number;
  moderationStatus: 'active' | 'hidden' | 'flagged';
  displayLabel?: string; // 'A', 'B', 'C', etc.
  voteCount?: number; // Calculated on server for RESULTS
  authorDisplayName?: string; // Revealed during RESULTS
  isCurrentUserAuthor?: boolean; // Client-side derived helper
}

// Sanitized public answer used during VOTING (no authorPlayerId!)
export interface PublicAnswer {
  id: string;
  displayLabel: string;
  answerText: string;
  normalizedWordCount: number;
}

export interface Vote {
  playerId: string;
  selectedAnswerId: string;
  createdAt: number;
  updatedAt: number;
}

export interface RoundScore {
  playerId: string;
  answerPoints: number; // 100 * votes
  participationPoints: number; // 25 if voted
  winnerBonus: number; // 50 if tied or top
  totalRoundPoints: number;
  processedAt: number;
}

export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  totalScore: number;
  roundScore?: number;
  rank: number;
  previousRank?: number;
  rankDelta?: number;
  isCurrentUser?: boolean;
}

export interface GameEventLog {
  id: string;
  timestamp: number;
  type: 'PHASE_CHANGE' | 'ROUND_START' | 'ROUND_END' | 'MODERATION' | 'SCORING' | 'PLAYER_JOIN' | 'PAUSE' | 'RESUME';
  message: string;
  details?: Record<string, unknown>;
}
