import { describe, it, expect } from 'vitest';
import {
  countWords,
  validateAnswerWords,
  validateVote,
  calculateRoundScores,
  computeLeaderboard,
  generateRoomCode,
  shuffleArray,
} from '../src/lib/gameLogic';
import { Player } from '../src/types/game';

describe('gameLogic: countWords & validateAnswerWords', () => {
  it('counts words accurately handling extra spaces and newlines', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
    expect(countWords('\n\n\t   ')).toBe(0);
    expect(countWords('Hello world')).toBe(2);
    expect(countWords('   Describe   E-Cell   at   SVNIT   \n\nnow!  ')).toBe(5);
  });

  it('validates answer within bounds', () => {
    // 0 words
    const emptyRes = validateAnswerWords('', 1, 50);
    expect(emptyRes.valid).toBe(false);

    // 5 words with min 10
    const tooShort = validateAnswerWords('One two three four five', 10, 50);
    expect(tooShort.valid).toBe(false);
    expect(tooShort.error).toContain('Add 5 more words');

    // 55 words with max 50
    const longText = Array(55).fill('word').join(' ');
    const tooLong = validateAnswerWords(longText, 1, 50);
    expect(tooLong.valid).toBe(false);
    expect(tooLong.error).toContain('Exceeds word limit by 5 words');

    // Exactly 30 words with min 30 and max 50
    const perfectText = Array(30).fill('word').join(' ');
    const validRes = validateAnswerWords(perfectText, 30, 50);
    expect(validRes.valid).toBe(true);
    expect(validRes.wordCount).toBe(30);
  });
});

describe('gameLogic: validateVote', () => {
  const answerAuthorMap = {
    ans1: 'player1',
    ans2: 'player2',
    ans3: 'player3',
  };

  it('prohibits self-voting', () => {
    const res = validateVote('player1', 'ans1', answerAuthorMap);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('You cannot vote for your own answer!');
  });

  it('allows voting for other players answers', () => {
    const res = validateVote('player1', 'ans2', answerAuthorMap);
    expect(res.valid).toBe(true);
  });

  it('rejects voting for unknown answers', () => {
    const res = validateVote('player1', 'ans999', answerAuthorMap);
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Answer does not exist or has been removed.');
  });
});

describe('gameLogic: calculateRoundScores (1 vote = 1 point)', () => {
  it('correctly awards 1 point per vote and 0 points for 0 votes', () => {
    // Player A writes answer1, Player B writes answer2, Player C writes answer3
    const answers = [
      { id: 'ans1', authorPlayerId: 'pA' },
      { id: 'ans2', authorPlayerId: 'pB' },
      { id: 'ans3', authorPlayerId: 'pC' },
    ];

    // pB, pC, pD vote for ans1 (3 votes)
    // pA votes for ans2 (1 vote)
    // pE does not vote
    const votes = [
      { playerId: 'pB', selectedAnswerId: 'ans1' },
      { playerId: 'pC', selectedAnswerId: 'ans1' },
      { playerId: 'pD', selectedAnswerId: 'ans1' },
      { playerId: 'pA', selectedAnswerId: 'ans2' },
    ];

    const allPlayerIds = ['pA', 'pB', 'pC', 'pD', 'pE'];

    const result = calculateRoundScores({ answers, votes, allPlayerIds });

    // pA: 3 votes = 3 points
    expect(result.roundScores['pA']).toEqual({
      playerId: 'pA',
      answerPoints: 3,
      participationPoints: 0,
      winnerBonus: 0,
      totalRoundPoints: 3,
      processedAt: expect.any(Number),
    });

    // pB: 1 vote = 1 point
    expect(result.roundScores['pB']).toEqual({
      playerId: 'pB',
      answerPoints: 1,
      participationPoints: 0,
      winnerBonus: 0,
      totalRoundPoints: 1,
      processedAt: expect.any(Number),
    });

    // pC: 0 votes = 0 points
    expect(result.roundScores['pC'].totalRoundPoints).toBe(0);

    // pD: no answer submitted = 0 points
    expect(result.roundScores['pD'].totalRoundPoints).toBe(0);

    // pE: no answer, did not vote = 0 points
    expect(result.roundScores['pE'].totalRoundPoints).toBe(0);
  });

  it('correctly identifies tied top answers with equal votes', () => {
    const answers = [
      { id: 'ans1', authorPlayerId: 'pA' },
      { id: 'ans2', authorPlayerId: 'pB' },
    ];

    // Both get 2 votes
    const votes = [
      { playerId: 'pB', selectedAnswerId: 'ans1' },
      { playerId: 'pC', selectedAnswerId: 'ans1' },
      { playerId: 'pA', selectedAnswerId: 'ans2' },
      { playerId: 'pD', selectedAnswerId: 'ans2' },
    ];

    const allPlayerIds = ['pA', 'pB', 'pC', 'pD'];
    const result = calculateRoundScores({ answers, votes, allPlayerIds });

    expect(result.topAnswerIds).toEqual(['ans1', 'ans2']);
    expect(result.maxVotes).toBe(2);
    expect(result.roundScores['pA'].totalRoundPoints).toBe(2);
    expect(result.roundScores['pB'].totalRoundPoints).toBe(2);
  });

  it('awards 0 points if no valid votes are cast', () => {
    const answers = [
      { id: 'ans1', authorPlayerId: 'pA' },
      { id: 'ans2', authorPlayerId: 'pB' },
    ];
    const votes: { playerId: string; selectedAnswerId: string }[] = [];
    const allPlayerIds = ['pA', 'pB'];

    const result = calculateRoundScores({ answers, votes, allPlayerIds });
    expect(result.maxVotes).toBe(0);
    expect(result.roundScores['pA'].totalRoundPoints).toBe(0);
    expect(result.roundScores['pB'].totalRoundPoints).toBe(0);
  });

  it('discards illegal self-votes during score tallying', () => {
    const answers = [
      { id: 'ans1', authorPlayerId: 'pA' },
      { id: 'ans2', authorPlayerId: 'pB' },
    ];
    // pA tries to vote for ans1 (self-vote)
    const votes = [
      { playerId: 'pA', selectedAnswerId: 'ans1' },
      { playerId: 'pB', selectedAnswerId: 'ans1' },
    ];
    const allPlayerIds = ['pA', 'pB'];

    const result = calculateRoundScores({ answers, votes, allPlayerIds });
    // ans1 should only receive 1 vote (from pB), self-vote from pA is ignored
    expect(result.answerVoteCounts['ans1']).toBe(1);
    // pA gets 1 point for pB's vote
    expect(result.roundScores['pA'].totalRoundPoints).toBe(1);
  });
});

describe('gameLogic: computeLeaderboard (1st, 2nd, 2nd, 4th)', () => {
  it('assigns correct competition ranks with ties', () => {
    const players: Player[] = [
      { id: 'p1', uid: 'u1', displayName: 'Alpha', totalScore: 500, connectedStatus: 'online', joinedAt: 100, lastSeenAt: 100 },
      { id: 'p2', uid: 'u2', displayName: 'Beta', totalScore: 350, connectedStatus: 'online', joinedAt: 110, lastSeenAt: 110 },
      { id: 'p3', uid: 'u3', displayName: 'Gamma', totalScore: 350, connectedStatus: 'online', joinedAt: 120, lastSeenAt: 120 },
      { id: 'p4', uid: 'u4', displayName: 'Delta', totalScore: 200, connectedStatus: 'online', joinedAt: 130, lastSeenAt: 130 },
      { id: 'p5', uid: 'u5', displayName: 'Epsilon', totalScore: 0, connectedStatus: 'online', joinedAt: 140, lastSeenAt: 140 },
    ];

    const leaderboard = computeLeaderboard(players);

    expect(leaderboard[0].rank).toBe(1); // 500
    expect(leaderboard[0].displayName).toBe('Alpha');

    expect(leaderboard[1].rank).toBe(2); // 350
    expect(leaderboard[1].displayName).toBe('Beta');

    expect(leaderboard[2].rank).toBe(2); // 350 tied
    expect(leaderboard[2].displayName).toBe('Gamma');

    expect(leaderboard[3].rank).toBe(4); // 200 (skips 3rd!)
    expect(leaderboard[3].displayName).toBe('Delta');

    expect(leaderboard[4].rank).toBe(5); // 0
  });
});

describe('gameLogic: room code & shuffle', () => {
  it('generates uppercase room code without ambiguous 0/O/1/I', () => {
    const code = generateRoomCode();
    expect(code.length).toBeGreaterThanOrEqual(6);
    expect(code).toMatch(/^[A-Z0-9]+$/);
    expect(code).not.toContain('0');
    expect(code).not.toContain('1');
  });

  it('shuffles array without modifying original or dropping elements', () => {
    const original = ['A', 'B', 'C', 'D', 'E'];
    const shuffled = shuffleArray(original);
    expect(shuffled.sort()).toEqual(original.sort());
  });
});
