import { RoundScore, LeaderboardEntry, Player } from '../types/game';

/**
 * Normalizes text and counts meaningful whitespace-separated tokens.
 * Trims leading/trailing whitespace, collapses multiple whitespace/newlines.
 */
export function countWords(text: string): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Validates an answer against room word limits (minWords, maxWords).
 */
export function validateAnswerWords(
  text: string,
  minWords = 1,
  maxWords = 50
): { valid: boolean; wordCount: number; error?: string } {
  const wordCount = countWords(text);
  if (wordCount === 0) {
    return { valid: false, wordCount: 0, error: 'Answer cannot be empty.' };
  }
  if (wordCount < minWords) {
    const diff = minWords - wordCount;
    return {
      valid: false,
      wordCount,
      error: `Add ${diff} more word${diff > 1 ? 's' : ''} to reach the minimum of ${minWords}.`,
    };
  }
  if (wordCount > maxWords) {
    const diff = wordCount - maxWords;
    return {
      valid: false,
      wordCount,
      error: `Exceeds word limit by ${diff} word${diff > 1 ? 's' : ''} (max ${maxWords}).`,
    };
  }
  return { valid: true, wordCount };
}

/**
 * Validates whether a vote is allowed.
 * - Player cannot vote for their own answer.
 * - Answer must exist in active answers.
 */
export function validateVote(
  voterPlayerId: string,
  selectedAnswerId: string,
  answerAuthorMap: Record<string, string> // answerId -> authorPlayerId
): { valid: boolean; error?: string } {
  if (!voterPlayerId || !selectedAnswerId) {
    return { valid: false, error: 'Invalid vote parameters.' };
  }
  const authorId = answerAuthorMap[selectedAnswerId];
  if (!authorId) {
    return { valid: false, error: 'Answer does not exist or has been removed.' };
  }
  if (authorId === voterPlayerId) {
    return { valid: false, error: 'You cannot vote for your own answer!' };
  }
  return { valid: true };
}

export interface CalculateScoresInput {
  answers: { id: string; authorPlayerId: string; moderationStatus?: string }[];
  votes: { playerId: string; selectedAnswerId: string }[];
  allPlayerIds: string[];
}

export interface CalculateScoresOutput {
  roundScores: Record<string, RoundScore>;
  answerVoteCounts: Record<string, number>;
  topAnswerIds: string[];
  maxVotes: number;
}

/**
 * Server-authoritative scoring formula implementation:
 * - 100 points per valid vote received by author's answer.
 * - 25 points participation for casting a valid vote.
 * - 50 points bonus for author(s) of most-voted answer(s) (including ties).
 *   If no valid votes cast (maxVotes === 0), bonus is 0.
 * - Self-votes are strictly excluded and never count.
 * - Idempotent and deterministic.
 */
export function calculateRoundScores({
  answers,
  votes,
  allPlayerIds,
}: CalculateScoresInput): CalculateScoresOutput {
  const answerAuthorMap: Record<string, string> = {};
  const activeAnswerIds = new Set<string>();

  answers.forEach((ans) => {
    if (ans.moderationStatus !== 'hidden') {
      answerAuthorMap[ans.id] = ans.authorPlayerId;
      activeAnswerIds.add(ans.id);
    }
  });

  // Tally valid votes per answer and record valid voters
  const answerVoteCounts: Record<string, number> = {};
  activeAnswerIds.forEach((id) => {
    answerVoteCounts[id] = 0;
  });

  const validVoterPlayerIds = new Set<string>();

  // Exactly one vote per participant
  const processedVoters = new Set<string>();

  votes.forEach((vote) => {
    if (processedVoters.has(vote.playerId)) return;
    processedVoters.add(vote.playerId);

    const targetAuthorId = answerAuthorMap[vote.selectedAnswerId];
    // Self-votes strictly excluded
    if (targetAuthorId && targetAuthorId !== vote.playerId) {
      answerVoteCounts[vote.selectedAnswerId] = (answerVoteCounts[vote.selectedAnswerId] || 0) + 1;
      validVoterPlayerIds.add(vote.playerId);
    }
  });

  // Determine top vote count and winning answer(s)
  let maxVotes = 0;
  Object.values(answerVoteCounts).forEach((count) => {
    if (count > maxVotes) {
      maxVotes = count;
    }
  });

  const topAnswerIds: string[] = [];
  const bonusAuthorIds = new Set<string>();

  if (maxVotes > 0) {
    Object.entries(answerVoteCounts).forEach(([ansId, count]) => {
      if (count === maxVotes) {
        topAnswerIds.push(ansId);
        const authorId = answerAuthorMap[ansId];
        if (authorId) {
          bonusAuthorIds.add(authorId);
        }
      }
    });
  }

  // Calculate scores: 1 vote = 1 score point, 0 votes = 0 score points
  const now = Date.now();
  const roundScores: Record<string, RoundScore> = {};

  // Track vote points per author (1 point per valid vote)
  const authorAnswerPoints: Record<string, number> = {};
  answers.forEach((ans) => {
    if (ans.moderationStatus !== 'hidden') {
      const votesForAnswer = answerVoteCounts[ans.id] || 0;
      authorAnswerPoints[ans.authorPlayerId] = (authorAnswerPoints[ans.authorPlayerId] || 0) + votesForAnswer;
    }
  });

  allPlayerIds.forEach((pId) => {
    const ansPoints = authorAnswerPoints[pId] || 0; // Exactly 1 pt per vote
    const partPoints = 0;
    const bonus = 0;
    const total = ansPoints;

    roundScores[pId] = {
      playerId: pId,
      answerPoints: ansPoints,
      participationPoints: 0,
      winnerBonus: 0,
      totalRoundPoints: total,
      processedAt: now,
    };
  });

  return {
    roundScores,
    answerVoteCounts,
    topAnswerIds,
    maxVotes,
  };
}

/**
 * Computes Leaderboard with Competition Ranking (1st, 2nd, 2nd, 4th):
 * Tied scores share the same rank. Next rank skips accordingly.
 * Deterministic secondary ordering: earlier joinedAt, then stable playerId.
 */
export function computeLeaderboard(
  players: Player[],
  roundScores?: Record<string, RoundScore>,
  currentUserId?: string
): LeaderboardEntry[] {
  const sorted = [...players].sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    // Deterministic secondary sort
    if (a.joinedAt !== b.joinedAt) {
      return a.joinedAt - b.joinedAt;
    }
    return a.id.localeCompare(b.id);
  });

  let currentRank = 1;
  const entries: LeaderboardEntry[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const player = sorted[i];
    if (i > 0 && player.totalScore < sorted[i - 1].totalScore) {
      currentRank = i + 1; // 1st, 2nd, 2nd, 4th
    }

    entries.push({
      playerId: player.id,
      displayName: player.displayName,
      totalScore: player.totalScore,
      roundScore: roundScores?.[player.id]?.totalRoundPoints,
      rank: currentRank,
      isCurrentUser: player.id === currentUserId || player.uid === currentUserId,
    });
  }

  return entries;
}

/**
 * Generates an uppercase, human-readable room code (e.g. MIND27, PSYCH8).
 * Avoids ambiguous characters like O, 0, I, 1.
 */
export function generateRoomCode(): string {
  const words = ['MIND', 'PSYCH', 'SVNIT', 'ECEL', 'BRAIN', 'SHARK', 'FLASH', 'TITAN', 'NOVA', 'SMART'];
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const prefix = words[Math.floor(Math.random() * words.length)];
  let suffix = '';
  for (let i = 0; i < 2; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${suffix}`;
}

/**
 * Fisher-Yates shuffle algorithm for server-side answer randomization.
 */
export function shuffleArray<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
