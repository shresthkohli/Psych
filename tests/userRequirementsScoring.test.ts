import { describe, it, expect } from 'vitest';
import { calculateRoundScores, computeLeaderboard } from '../src/lib/gameLogic';
import { Player, Answer, Vote } from '../src/types/game';

describe('User Requirements Verification: 1 Vote = 1 Point & Equal Vote Parity', () => {
  it('guarantees identical total score when two players receive the same number of votes across different rounds', () => {
    // 3 Players
    const players: Player[] = [
      { id: 'player_A', uid: 'uid_A', displayName: 'Player A', totalScore: 0, connectedStatus: 'online', joinedAt: 1000, lastSeenAt: 1000 },
      { id: 'player_B', uid: 'uid_B', displayName: 'Player B', totalScore: 0, connectedStatus: 'online', joinedAt: 1001, lastSeenAt: 1001 },
      { id: 'player_C', uid: 'uid_C', displayName: 'Player C', totalScore: 0, connectedStatus: 'online', joinedAt: 1002, lastSeenAt: 1002 },
    ];
    const allPlayerIds = players.map(p => p.id);

    // --- ROUND 1 ---
    // Answers
    const round1Answers: Answer[] = [
      { id: 'ans_A1', authorPlayerId: 'player_A', answerText: 'Answer A1', normalizedWordCount: 10, submittedAt: 2000, moderationStatus: 'active' },
      { id: 'ans_B1', authorPlayerId: 'player_B', answerText: 'Answer B1', normalizedWordCount: 10, submittedAt: 2000, moderationStatus: 'active' },
      { id: 'ans_C1', authorPlayerId: 'player_C', answerText: 'Answer C1', normalizedWordCount: 10, submittedAt: 2000, moderationStatus: 'active' },
    ];

    // Votes: Player B and Player C vote for Player A (Player A gets 2 votes). Player A votes for Player C.
    const round1Votes: Vote[] = [
      { playerId: 'player_B', selectedAnswerId: 'ans_A1', createdAt: 3000, updatedAt: 3000 },
      { playerId: 'player_C', selectedAnswerId: 'ans_A1', createdAt: 3000, updatedAt: 3000 },
      { playerId: 'player_A', selectedAnswerId: 'ans_C1', createdAt: 3000, updatedAt: 3000 },
    ];

    const round1Results = calculateRoundScores({
      answers: round1Answers,
      votes: round1Votes,
      allPlayerIds,
    });

    // Verify Round 1 vote counts
    expect(round1Results.answerVoteCounts['ans_A1']).toBe(2);
    expect(round1Results.answerVoteCounts['ans_B1']).toBe(0);
    expect(round1Results.answerVoteCounts['ans_C1']).toBe(1);

    // Verify Round 1 points: EXACTLY 1 point per vote
    expect(round1Results.roundScores['player_A'].totalRoundPoints).toBe(2);
    expect(round1Results.roundScores['player_B'].totalRoundPoints).toBe(0);
    expect(round1Results.roundScores['player_C'].totalRoundPoints).toBe(1);

    // Apply Round 1 scores to players
    players.forEach(p => {
      p.totalScore += round1Results.roundScores[p.id].totalRoundPoints;
    });

    expect(players.find(p => p.id === 'player_A')?.totalScore).toBe(2);
    expect(players.find(p => p.id === 'player_B')?.totalScore).toBe(0);
    expect(players.find(p => p.id === 'player_C')?.totalScore).toBe(1);

    // --- ROUND 2 ---
    // Answers
    const round2Answers: Answer[] = [
      { id: 'ans_A2', authorPlayerId: 'player_A', answerText: 'Answer A2', normalizedWordCount: 10, submittedAt: 4000, moderationStatus: 'active' },
      { id: 'ans_B2', authorPlayerId: 'player_B', answerText: 'Answer B2', normalizedWordCount: 10, submittedAt: 4000, moderationStatus: 'active' },
      { id: 'ans_C2', authorPlayerId: 'player_C', answerText: 'Answer C2', normalizedWordCount: 10, submittedAt: 4000, moderationStatus: 'active' },
    ];

    // Votes: Player A and Player C vote for Player B (Player B gets 2 votes). Player B votes for Player C.
    // Notice: In round 1, Player A got 2 votes and 0 in round 2.
    // In round 2, Player B got 2 votes and 0 in round 1.
    const round2Votes: Vote[] = [
      { playerId: 'player_A', selectedAnswerId: 'ans_B2', createdAt: 5000, updatedAt: 5000 },
      { playerId: 'player_C', selectedAnswerId: 'ans_B2', createdAt: 5000, updatedAt: 5000 },
      { playerId: 'player_B', selectedAnswerId: 'ans_C2', createdAt: 5000, updatedAt: 5000 },
    ];

    const round2Results = calculateRoundScores({
      answers: round2Answers,
      votes: round2Votes,
      allPlayerIds,
    });

    // Verify Round 2 vote counts
    expect(round2Results.answerVoteCounts['ans_A2']).toBe(0);
    expect(round2Results.answerVoteCounts['ans_B2']).toBe(2);
    expect(round2Results.answerVoteCounts['ans_C2']).toBe(1);

    // Verify Round 2 points
    expect(round2Results.roundScores['player_A'].totalRoundPoints).toBe(0);
    expect(round2Results.roundScores['player_B'].totalRoundPoints).toBe(2);
    expect(round2Results.roundScores['player_C'].totalRoundPoints).toBe(1);

    // Apply Round 2 scores
    players.forEach(p => {
      p.totalScore += round2Results.roundScores[p.id].totalRoundPoints;
    });

    // CRITICAL USER TEST:
    // "when we tested the website, one player got 2 votes in the first round and the other player got 2 votes in the second rounds but at the end of the second round they both had different number of votes. and also, for now each vote contributes 100 or more points to a response but I want only 1 point added per vote irrespective of the round and 0 points for 0 votes."
    const scoreA = players.find(p => p.id === 'player_A')?.totalScore;
    const scoreB = players.find(p => p.id === 'player_B')?.totalScore;
    const scoreC = players.find(p => p.id === 'player_C')?.totalScore;

    expect(scoreA).toBe(2); // 2 + 0 = 2
    expect(scoreB).toBe(2); // 0 + 2 = 2
    expect(scoreC).toBe(2); // 1 + 1 = 2
    expect(scoreA).toBe(scoreB); // EQUAL SCORE!

    // Verify leaderboard ties: all 3 share rank 1
    const leaderboard = computeLeaderboard(players, round2Results.roundScores);
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[1].rank).toBe(1);
    expect(leaderboard[2].rank).toBe(1);
    expect(leaderboard.find(e => e.playerId === 'player_B')?.roundScore).toBe(2);
    expect(leaderboard.find(e => e.playerId === 'player_A')?.roundScore).toBe(0);
  });
});
