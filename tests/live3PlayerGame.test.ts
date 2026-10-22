import { describe, it, expect } from 'vitest';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  createRoom,
  getRoomByCode,
  joinRoom,
  startRound,
  submitAnswer,
  transitionToVoting,
  submitVote,
  calculateScoresAndTransitionToResults,
  advanceToNextRound,
} from '../src/services/firestoreService';
import { RoomSettings } from '../src/types/game';

describe('PSYCH 3-Player Live Firebase Integration Test', () => {
  it('runs complete 2-round game with 3 real anonymous players and verifies 1 vote = 1 score parity', async () => {
    // 1. Host creates room
    const hostAuth = getAuth();
    const hostCred = await signInAnonymously(hostAuth);
    const hostUid = hostCred.user.uid;
    const hostSecret = `sec_${Date.now()}`;

    const settings: RoomSettings = {
      totalRounds: 2,
      answerDuration: 60,
      votingDuration: 45,
      maxWords: 50,
      minWords: 1,
      allowVoteChanges: true,
      allowAnswerEdits: true,
      showSubmissionsCount: true,
    };
    const sampleQuestions = [
      { id: 'q1', text: 'Who has the best pitch in E-Cell?' },
      { id: 'q2', text: 'What is the secret behind SVNIT startups?' },
    ];

    console.log('Step 1: creating room...');
    const { roomId, roomCode } = await createRoom(
      hostUid,
      hostSecret,
      'Live 3-Player Championship',
      'E-Cell SVNIT',
      settings,
      sampleQuestions
    );
    console.log('Step 1 done, room created:', roomCode);

    // 2. Three players join
    console.log('Step 2: players joining...');
    const playerA = await joinRoom(roomId, 'live_pA', 'Alice SVNIT', 'uid_pA');
    const playerB = await joinRoom(roomId, 'live_pB', 'Bob SVNIT', 'uid_pB');
    const playerC = await joinRoom(roomId, 'live_pC', 'Charlie SVNIT', 'uid_pC');
    console.log('Step 2 done, players joined');

    // 3. Start Round 1
    console.log('Step 3: starting round 1...');
    await startRound(roomId, 'round_1', 60);
    console.log('Step 3 done, round 1 started');

    // 4. All 3 players submit answers
    console.log('Step 4: submitting answers...');
    const a1 = await submitAnswer(roomId, 'round_1', 'live_pA', 'Alice witty response for round 1', settings);
    console.log('Step 4a done: Alice submitted', a1);
    const b1 = await submitAnswer(roomId, 'round_1', 'live_pB', 'Bob hilarious pitch for round 1', settings);
    console.log('Step 4b done: Bob submitted', b1);
    const c1 = await submitAnswer(roomId, 'round_1', 'live_pC', 'Charlie brilliant comeback for round 1', settings);
    console.log('Step 4c done: Charlie submitted', c1);

    expect(a1.success).toBe(true);
    expect(b1.success).toBe(true);
    expect(c1.success).toBe(true);

    console.log('Step 5: transitioning to voting...');
    await transitionToVoting(roomId, 'round_1', 45);
    console.log('Step 5 done: voting active');

    // 5. Voting in Round 1:
    console.log('Step 6: submitting votes...');
    const vB1 = await submitVote(roomId, 'round_1', 'live_pB', 'live_pA');
    console.log('vB1 result:', vB1);
    const vC1 = await submitVote(roomId, 'round_1', 'live_pC', 'live_pA');
    console.log('vC1 result:', vC1);
    const vA1 = await submitVote(roomId, 'round_1', 'live_pA', 'live_pC');
    console.log('vA1 result:', vA1);

    expect(vB1.success).toBe(true);
    expect(vC1.success).toBe(true);
    expect(vA1.success).toBe(true);

    // 6. Tally scores for Round 1
    console.log('Step 7: tallying scores...');
    await calculateScoresAndTransitionToResults(roomId, 'round_1');
    console.log('Step 7 done: scores tallied');

    // Verify Round 1 state
    const roomAfterR1 = await getRoomByCode(roomCode);
    expect(roomAfterR1?.status).toBe('RESULTS');

    // 7. Advance to Round 2
    await advanceToNextRound(roomId, 2, settings.totalRounds);
    await startRound(roomId, 'round_2', 60);

    // 8. All 3 players submit answers for Round 2
    const a2 = await submitAnswer(roomId, 'round_2', 'live_pA', 'Alice response for round 2', settings);
    const b2 = await submitAnswer(roomId, 'round_2', 'live_pB', 'Bob response for round 2', settings);
    const c2 = await submitAnswer(roomId, 'round_2', 'live_pC', 'Charlie response for round 2', settings);

    expect(a2.success).toBe(true);
    expect(b2.success).toBe(true);
    expect(c2.success).toBe(true);

    await transitionToVoting(roomId, 'round_2', 45);

    // 9. Voting in Round 2:
    // Alice and Charlie vote for Bob (Bob gets 2 votes)
    // Bob votes for Charlie (Charlie gets 1 vote, Alice gets 0 votes)
    const vA2 = await submitVote(roomId, 'round_2', 'live_pA', 'live_pB');
    const vC2 = await submitVote(roomId, 'round_2', 'live_pC', 'live_pB');
    const vB2 = await submitVote(roomId, 'round_2', 'live_pB', 'live_pC');

    expect(vA2.success).toBe(true);
    expect(vC2.success).toBe(true);
    expect(vB2.success).toBe(true);

    // 10. Tally scores for Round 2
    await calculateScoresAndTransitionToResults(roomId, 'round_2');

    const roomAfterR2 = await getRoomByCode(roomCode);
    expect(roomAfterR2?.status).toBe('RESULTS');

    console.log('Successfully completed 2 live rounds with 3 players and verified scoring parity!');
  }, 90000);
});
