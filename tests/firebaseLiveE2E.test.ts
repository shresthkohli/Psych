import { describe, it, expect } from 'vitest';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  deleteDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
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

const firebaseConfig = {
  apiKey: "AIzaSyBdk_GjSlEUL0Ug0_8hXUrYKq-jgRevK0k",
  authDomain: "psych-ecell-svnit.firebaseapp.com",
  projectId: "psych-ecell-svnit",
  storageBucket: "psych-ecell-svnit.firebasestorage.app",
  messagingSenderId: "550693453723",
  appId: "1:550693453723:web:f673fdb63baa07c84d2b3e",
};

describe('PSYCH Live End-to-End Game Lifecycle on Production Firebase', () => {
  it('runs complete live game loop with room creation, joins, answers, votes, and scoring', async () => {
    // 1. Host creates room
    const hostAuth = getAuth();
    const hostCred = await signInAnonymously(hostAuth);
    const hostUid = hostCred.user.uid;
    const hostSecret = `secret_${Date.now()}`;

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
      { id: 'q1', text: 'Describe E-Cell SVNIT in the most fun way possible.' },
      { id: 'q2', text: 'What happens at RMS after 9 PM?' },
    ];

    const { roomId, roomCode } = await createRoom(
      hostUid,
      hostSecret,
      'Live SVNIT E2E Championship',
      'E-Cell SVNIT',
      settings,
      sampleQuestions
    );

    expect(roomId).toBeDefined();
    expect(roomCode).toMatch(/^[A-Z0-9]+$/);
    console.log(`Created live room ${roomCode} (ID: ${roomId})`);

    // 2. Fetch room by code
    const fetchedRoom = await getRoomByCode(roomCode);
    expect(fetchedRoom).toBeDefined();
    expect(fetchedRoom?.status).toBe('LOBBY');
    expect(fetchedRoom?.currentRoundNumber).toBe(1);

    // 3. Host player joins
    const hostPlayer = await joinRoom(roomId, hostUid, 'Host Shresth (SVNIT)', hostUid);
    expect(hostPlayer.displayName).toBe('Host Shresth (SVNIT)');

    // 4. Host starts Round 1
    const roundId = fetchedRoom?.currentRoundId || 'round_1';
    await startRound(roomId, roundId, 60);

    const roomAfterStart = await getRoomByCode(roomCode);
    expect(roomAfterStart?.status).toBe('ANSWERING');

    // 5. Host submits an answer
    const ans1 = await submitAnswer(
      roomId,
      roundId,
      hostUid,
      'E-Cell SVNIT is where sleep is optional, tea is fuel, and every conversation sounds like a Shark Tank pitch!',
      settings
    );
    expect(ans1.success).toBe(true);

    // 6. Host ends answering phase -> transitions to VOTING
    await transitionToVoting(roomId, roundId, 45);

    const roomInVoting = await getRoomByCode(roomCode);
    expect(roomInVoting?.status).toBe('VOTING');

    // 7. Voting Phase:
    // Host tries to vote for their own answer (self-vote must fail!)
    const selfVote = await submitVote(roomId, roundId, hostUid, hostUid);
    expect(selfVote.success).toBe(false);
    expect(selfVote.error).toContain('cannot vote for your own answer');

    // 8. Tally votes & calculate scores atomically
    await calculateScoresAndTransitionToResults(roomId, roundId);

    const roomInResults = await getRoomByCode(roomCode);
    expect(roomInResults?.status).toBe('RESULTS');

    // 9. Advance to Round 2
    await advanceToNextRound(roomId, 2, settings.totalRounds);
    const roomInRound2 = await getRoomByCode(roomCode);
    expect(roomInRound2?.currentRoundNumber).toBe(2);
    expect(roomInRound2?.status).toBe('LOBBY');

    // 10. Advance past final round -> GAME_FINISHED
    await advanceToNextRound(roomId, 3, settings.totalRounds);
    const roomFinished = await getRoomByCode(roomCode);
    expect(roomFinished?.status).toBe('GAME_FINISHED');

    console.log('Live E2E Multiplayer test passed with complete state flow on Firebase!');
  }, 30000);
});
