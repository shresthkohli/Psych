import { describe, it, expect } from 'vitest';
import {
  calculateScoresAndTransitionToResults,
  transitionToVoting,
  createRoom,
  joinRoom,
  startRound,
  submitAnswer,
  submitVote,
  getRoomByCode,
} from '../src/services/firestoreService';
import { RoomSettings } from '../src/types/game';
import { getAuth, signInAnonymously } from 'firebase/auth';

describe('Voting Bug Fix & Phase Guard Verification', () => {
  it('prevents premature phase transition to voting when deadline has not passed and not all players submitted', async () => {
    const auth = getAuth();
    const cred = await signInAnonymously(auth);
    const hostUid = cred.user.uid;
    const hostSecret = `sec_guard_${Date.now()}`;

    const settings: RoomSettings = {
      totalRounds: 1,
      answerDuration: 120, // 2 minutes
      votingDuration: 45,
      maxWords: 50,
      minWords: 1,
      allowVoteChanges: true,
      allowAnswerEdits: true,
      showSubmissionsCount: true,
    };

    const { roomId, roomCode } = await createRoom(
      hostUid,
      hostSecret,
      'Guard Test Room',
      'E-Cell SVNIT',
      settings,
      [{ id: 'q1', text: 'Test question?' }]
    );

    // Join 2 players
    await joinRoom(roomId, 'p1', 'Player 1', 'uid_p1');
    await joinRoom(roomId, 'p2', 'Player 2', 'uid_p2');

    // Start round with 120s duration
    await startRound(roomId, 'round_1', 120);

    // Only 1 player submits
    await submitAnswer(roomId, 'round_1', 'p1', 'Player 1 test answer', settings);

    // Attempt premature transition without force (simulating stale timer or client clock skew)
    await transitionToVoting(roomId, 'round_1', 45, false);

    // Room must STILL be in ANSWERING phase because force=false, only 1/2 submitted, and deadline is 120s away!
    const roomSnap = await getRoomByCode(roomCode);
    expect(roomSnap?.status).toBe('ANSWERING');

    // Now player 2 submits -> all players submitted -> auto advances to VOTING
    await submitAnswer(roomId, 'round_1', 'p2', 'Player 2 test answer', settings);

    const roomAfterAllSubmitted = await getRoomByCode(roomCode);
    expect(roomAfterAllSubmitted?.status).toBe('VOTING');
  }, 60000);

  it('prevents premature scoring transition to results when voting deadline has not elapsed and not all players voted', async () => {
    const auth = getAuth();
    const cred = await signInAnonymously(auth);
    const hostUid = cred.user.uid;
    const hostSecret = `sec_score_guard_${Date.now()}`;

    const settings: RoomSettings = {
      totalRounds: 1,
      answerDuration: 60,
      votingDuration: 60, // 60s
      maxWords: 50,
      minWords: 1,
      allowVoteChanges: true,
      allowAnswerEdits: true,
      showSubmissionsCount: true,
    };

    const { roomId, roomCode } = await createRoom(
      hostUid,
      hostSecret,
      'Voting Guard Room',
      'E-Cell SVNIT',
      settings,
      [{ id: 'q1', text: 'Another test question?' }]
    );

    await joinRoom(roomId, 'v1', 'Voter 1', 'uid_v1');
    await joinRoom(roomId, 'v2', 'Voter 2', 'uid_v2');

    await startRound(roomId, 'round_1', 60);
    await submitAnswer(roomId, 'round_1', 'v1', 'Voter 1 answer', settings);
    await submitAnswer(roomId, 'round_1', 'v2', 'Voter 2 answer', settings);

    // Transition to voting
    await transitionToVoting(roomId, 'round_1', 60, true);

    const roomInVoting = await getRoomByCode(roomCode);
    expect(roomInVoting?.status).toBe('VOTING');

    // Only 1 voter votes
    await submitVote(roomId, 'round_1', 'v1', 'v2');

    // Attempt premature calculation without force (simulating stale countdown expiry effect)
    await calculateScoresAndTransitionToResults(roomId, 'round_1', false);

    // Room must STILL be in VOTING because only 1 of 2 players voted and deadline is 60s away!
    const roomStillVoting = await getRoomByCode(roomCode);
    expect(roomStillVoting?.status).toBe('VOTING');

    // Now second player votes -> all players voted -> transitions to RESULTS
    await submitVote(roomId, 'round_1', 'v2', 'v1');

    const roomAfterAllVoted = await getRoomByCode(roomCode);
    expect(roomAfterAllVoted?.status).toBe('RESULTS');
  }, 60000);
});
