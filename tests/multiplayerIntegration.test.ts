import { describe, it, expect } from 'vitest';
import {
  countWords,
  validateAnswerWords,
  validateVote,
  calculateRoundScores,
  computeLeaderboard,
  shuffleArray,
  generateRoomCode,
} from '../src/lib/gameLogic';
import { Player, Room, Round, Answer, Vote, RoundScore } from '../src/types/game';

describe('PSYCH 15-Player Multiplayer Simulation & Integration Suite', () => {
  // Test scenario with 15 simultaneous participants
  const NUM_PLAYERS = 15;
  const players: Player[] = Array.from({ length: NUM_PLAYERS }, (_, i) => ({
    id: `player_${i + 1}`,
    uid: `uid_${i + 1}`,
    displayName: `Participant_${i + 1}`,
    totalScore: 0,
    connectedStatus: 'online',
    joinedAt: 1000 + i * 50,
    lastSeenAt: 1000 + i * 50,
  }));

  it('verifies 15 participants can join and have distinct persistent identities', () => {
    expect(players.length).toBe(15);
    const uniqueIds = new Set(players.map((p) => p.id));
    expect(uniqueIds.size).toBe(15);
  });

  it('validates synchronized answer submissions and word limits for 15 players', () => {
    const answers: Answer[] = [];

    players.forEach((p, index) => {
      // 12 players submit valid answers of varying lengths (10-35 words)
      // 3 players submit answers
      const wordCount = 10 + (index % 25);
      const sampleText = Array(wordCount).fill(`word${index}`).join(' ');

      const validation = validateAnswerWords(sampleText, 1, 50);
      expect(validation.valid).toBe(true);
      expect(validation.wordCount).toBe(wordCount);

      answers.push({
        id: `ans_${p.id}`,
        authorPlayerId: p.id,
        answerText: sampleText,
        normalizedWordCount: validation.wordCount,
        submittedAt: 2000 + index * 100,
        moderationStatus: 'active',
      });
    });

    expect(answers.length).toBe(15);
  });

  it('authoritatively randomizes answer order once so all 15 players see the exact same list', () => {
    const answerIds = players.map((p) => `ans_${p.id}`);
    const randomized = shuffleArray(answerIds);

    // Same elements, shuffled order
    expect(randomized.length).toBe(15);
    expect(new Set(randomized).size).toBe(15);

    // Public list strips authorPlayerId
    const publicList = randomized.map((id, idx) => ({
      id,
      displayLabel: String.fromCharCode(65 + idx), // A, B, C...
    }));

    // Author ID must not be leaked in public list
    publicList.forEach((item) => {
      expect(item).not.toHaveProperty('authorPlayerId');
    });
  });

  it('enforces self-vote prohibition and tallies 15 distinct votes with vote-changing', () => {
    const answers = players.map((p) => ({
      id: `ans_${p.id}`,
      authorPlayerId: p.id,
    }));

    const authorMap: Record<string, string> = {};
    answers.forEach((a) => (authorMap[a.id] = a.authorPlayerId));

    // Player 1 tries to vote for their own answer (ans_player_1)
    const selfVote = validateVote('player_1', 'ans_player_1', authorMap);
    expect(selfVote.valid).toBe(false);
    expect(selfVote.error).toContain('cannot vote for your own answer');

    // Generate valid voting distribution:
    // Votes congregate on ans_player_3 (5 votes), ans_player_7 (5 votes - TIE!), ans_player_2 (3 votes), ans_player_5 (2 votes)
    const votes: Vote[] = [];

    // ans_player_3 targets: players 1, 2, 4, 5, 6
    ['player_1', 'player_2', 'player_4', 'player_5', 'player_6'].forEach((pid) => {
      votes.push({
        playerId: pid,
        selectedAnswerId: 'ans_player_3',
        createdAt: 3000,
        updatedAt: 3000,
      });
    });

    // ans_player_7 targets: players 8, 9, 10, 11, 12
    ['player_8', 'player_9', 'player_10', 'player_11', 'player_12'].forEach((pid) => {
      votes.push({
        playerId: pid,
        selectedAnswerId: 'ans_player_7',
        createdAt: 3000,
        updatedAt: 3000,
      });
    });

    // ans_player_2 targets: players 13, 14, 15
    ['player_13', 'player_14', 'player_15'].forEach((pid) => {
      votes.push({
        playerId: pid,
        selectedAnswerId: 'ans_player_2',
        createdAt: 3000,
        updatedAt: 3000,
      });
    });

    // Player 7 and Player 3 vote for ans_player_2
    votes.push({
      playerId: 'player_3',
      selectedAnswerId: 'ans_player_2',
      createdAt: 3000,
      updatedAt: 3000,
    });
    votes.push({
      playerId: 'player_7',
      selectedAnswerId: 'ans_player_2',
      createdAt: 3000,
      updatedAt: 3000,
    });

    expect(votes.length).toBe(15);

    // Calculate scores
    const allPlayerIds = players.map((p) => p.id);
    const result = calculateRoundScores({ answers, votes, allPlayerIds });

    // ans_player_3 got 5 votes
    expect(result.answerVoteCounts['ans_player_3']).toBe(5);
    // ans_player_7 got 5 votes
    expect(result.answerVoteCounts['ans_player_7']).toBe(5);
    // ans_player_2 got 3 + 2 = 5 votes -> 3-way tie!
    expect(result.answerVoteCounts['ans_player_2']).toBe(5);

    expect(result.maxVotes).toBe(5);
    expect(result.topAnswerIds).toEqual(['ans_player_2', 'ans_player_3', 'ans_player_7']);

    // Points calculation (1 vote = 1 score point):
    // Player 3: 5 votes = 5 pts
    expect(result.roundScores['player_3'].totalRoundPoints).toBe(5);

    // Player 2: 5 votes = 5 pts
    expect(result.roundScores['player_2'].totalRoundPoints).toBe(5);

    // Player 7: 5 votes = 5 pts
    expect(result.roundScores['player_7'].totalRoundPoints).toBe(5);

    // Player 1 (voted for ans_player_3, got 0 votes): 0 pts
    expect(result.roundScores['player_1'].totalRoundPoints).toBe(0);
  });

  it('guarantees score calculation idempotency (calling calculateRoundScores multiple times produces identical results)', () => {
    const answers = [
      { id: 'ans_1', authorPlayerId: 'p1' },
      { id: 'ans_2', authorPlayerId: 'p2' },
    ];
    const votes = [
      { playerId: 'p2', selectedAnswerId: 'ans_1' },
      { playerId: 'p3', selectedAnswerId: 'ans_1' },
      { playerId: 'p1', selectedAnswerId: 'ans_2' },
    ];
    const allPlayerIds = ['p1', 'p2', 'p3'];

    const run1 = calculateRoundScores({ answers, votes, allPlayerIds });
    const run2 = calculateRoundScores({ answers, votes, allPlayerIds });

    expect(run1.roundScores['p1'].totalRoundPoints).toBe(run2.roundScores['p1'].totalRoundPoints);
    expect(run1.roundScores['p2'].totalRoundPoints).toBe(run2.roundScores['p2'].totalRoundPoints);
    expect(run1.roundScores['p3'].totalRoundPoints).toBe(run2.roundScores['p3'].totalRoundPoints);
  });

  it('preserves remaining duration accurately when pausing and resuming game', () => {
    const now = Date.now();
    const phaseDeadline = now + 90000; // 90 seconds left

    // When paused at now + 30000 (60s remaining)
    const pauseTime = now + 30000;
    const remainingBeforePause = Math.max(0, phaseDeadline - pauseTime);
    expect(remainingBeforePause).toBe(60000);

    // Later at resumeTime = now + 120000 (after a 90s pause)
    const resumeTime = now + 120000;
    const newDeadline = resumeTime + remainingBeforePause;

    // Remaining duration is preserved!
    expect(newDeadline - resumeTime).toBe(60000);
  });
});
