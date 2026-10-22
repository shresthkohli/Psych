import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  runTransaction,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Room,
  RoomSettings,
  Player,
  Round,
  Answer,
  Vote,
  RoundScore,
  GameEventLog,
  GamePhase,
} from '../types/game';
import {
  countWords,
  validateAnswerWords,
  calculateRoundScores,
  shuffleArray,
  generateRoomCode,
} from '../lib/gameLogic';

/**
 * Creates a new game room in Firestore.
 */
export async function createRoom(
  hostUid: string,
  hostSecret: string,
  roomName: string,
  eventLabel: string,
  settings: RoomSettings,
  questions: { id: string; text: string }[]
): Promise<{ roomId: string; roomCode: string }> {
  if (!db) throw new Error('Firestore is not initialized.');

  const roomCode = generateRoomCode();
  const roomRef = doc(collection(db, 'rooms'));
  const roomId = roomRef.id;
  const now = Date.now();

  const roomData: Omit<Room, 'id'> = {
    roomCode,
    roomName: roomName || 'PSYCH Live',
    eventLabel: eventLabel || 'E-Cell SVNIT',
    hostUid,
    hostSecret,
    status: 'LOBBY',
    currentRoundNumber: 1,
    phaseStartedAt: now,
    phaseDeadline: now,
    settings,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(roomRef, roomData);

  // Store configured questions in subcollection
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qRef = doc(db, 'rooms', roomId, 'questions', `q_${i + 1}`);
    await setDoc(qRef, {
      roundNumber: i + 1,
      text: q.text,
      createdAt: now,
    });
  }

  // Create initial Round 1 doc
  const initialQuestion = questions[0]?.text || 'who is SVNIT to you?';
  const round1Ref = doc(db, 'rooms', roomId, 'rounds', 'round_1');
  const round1Data: Omit<Round, 'id'> = {
    roundNumber: 1,
    question: initialQuestion,
    status: 'LOBBY',
    phaseStartedAt: now,
    phaseDeadline: now,
    eligiblePlayerCount: 0,
    submissionCount: 0,
    voteCount: 0,
    randomizedAnswerIds: [],
    resultsRevealed: false,
    scoringProcessed: false,
    createdAt: now,
  };
  await setDoc(round1Ref, round1Data);

  // Update room with currentRoundId
  await updateDoc(roomRef, {
    currentRoundId: 'round_1',
  });

  return { roomId, roomCode };
}

/**
 * Finds a room by uppercase room code.
 */
export async function getRoomByCode(roomCode: string): Promise<Room | null> {
  if (!db) return null;
  const q = query(collection(db, 'rooms'), where('roomCode', '==', roomCode.toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { id: docSnap.id, ...(docSnap.data() as Omit<Room, 'id'>) };
}

/**
 * Joins a player to a room. Idempotent: restores existing player if ID matches.
 */
export async function joinRoom(
  roomId: string,
  playerId: string,
  displayName: string,
  uid: string
): Promise<Player> {
  if (!db) throw new Error('Firestore not initialized.');

  const playerRef = doc(db, 'rooms', roomId, 'players', playerId);
  const existing = await getDoc(playerRef);
  const now = Date.now();

  if (existing.exists()) {
    // Reconnection: update online status and display name if changed
    await updateDoc(playerRef, {
      displayName: displayName.trim() || existing.data().displayName,
      connectedStatus: 'online',
      lastSeenAt: now,
    });
    return { id: playerId, ...(existing.data() as Omit<Player, 'id'>) };
  }

  const newPlayer: Omit<Player, 'id'> = {
    uid,
    displayName: displayName.trim(),
    totalScore: 0,
    connectedStatus: 'online',
    joinedAt: now,
    lastSeenAt: now,
  };

  await setDoc(playerRef, newPlayer);
  return { id: playerId, ...newPlayer };
}

/**
 * Submits an answer for the current round. Server-authoritative validation.
 */
export async function submitAnswer(
  roomId: string,
  roundId: string,
  playerId: string,
  answerText: string,
  settings: RoomSettings
): Promise<{ success: boolean; wordCount: number; error?: string }> {
  if (!db) throw new Error('Firestore not initialized.');

  const validation = validateAnswerWords(answerText, settings.minWords, settings.maxWords);
  if (!validation.valid) {
    return { success: false, wordCount: validation.wordCount, error: validation.error };
  }

  // Check authoritative round status & deadline
  const roundRef = doc(db, 'rooms', roomId, 'rounds', roundId);
  const roundSnap = await getDoc(roundRef);
  if (!roundSnap.exists()) {
    return { success: false, wordCount: validation.wordCount, error: 'Round not found.' };
  }

  const roundData = roundSnap.data() as Round;
  if (roundData.status !== 'ANSWERING') {
    return { success: false, wordCount: validation.wordCount, error: 'Submissions are closed for this round.' };
  }

  // Grace period of 1.5 seconds for network latency
  if (Date.now() > roundData.phaseDeadline + 1500) {
    return { success: false, wordCount: validation.wordCount, error: 'Deadline has passed.' };
  }

  const answerRef = doc(db, 'rooms', roomId, 'rounds', roundId, 'answers', playerId);
  const now = Date.now();

  const answerDoc: Omit<Answer, 'id'> = {
    authorPlayerId: playerId,
    answerText: answerText.trim(),
    normalizedWordCount: validation.wordCount,
    submittedAt: now,
    moderationStatus: 'active',
  };

  await setDoc(answerRef, answerDoc);

  // Update submission count and submittedPlayerIds
  const allAnswersSnap = await getDocs(collection(db, 'rooms', roomId, 'rounds', roundId, 'answers'));
  const submittedPlayerIds: string[] = [];
  allAnswersSnap.forEach((d) => submittedPlayerIds.push(d.id));

  const playersSnap = await getDocs(collection(db, 'rooms', roomId, 'players'));

  await updateDoc(roundRef, {
    submissionCount: allAnswersSnap.size,
    submittedPlayerIds,
  });

  // AUTO ADVANCE: If all players have submitted answers, advance immediately to VOTING
  if (playersSnap.size > 0 && allAnswersSnap.size >= playersSnap.size) {
    try {
      await transitionToVoting(roomId, roundId, settings.votingDuration);
    } catch (e) {
      console.warn('Auto transition to voting note:', e);
    }
  }

  return { success: true, wordCount: validation.wordCount };
}

/**
 * Submits a vote for an answer. Prohibits self-voting and checks deadline.
 */
export async function submitVote(
  roomId: string,
  roundId: string,
  voterPlayerId: string,
  selectedAnswerId: string
): Promise<{ success: boolean; error?: string }> {
  if (!db) throw new Error('Firestore not initialized.');

  const roundRef = doc(db, 'rooms', roomId, 'rounds', roundId);
  const roundSnap = await getDoc(roundRef);
  if (!roundSnap.exists()) {
    return { success: false, error: 'Round not found.' };
  }

  const roundData = roundSnap.data() as Round;
  if (roundData.status !== 'VOTING') {
    return { success: false, error: 'Voting is not currently active.' };
  }

  if (Date.now() > roundData.phaseDeadline + 1500) {
    return { success: false, error: 'Voting deadline has passed.' };
  }

  // Check self-vote using private answer record
  const selectedAnswerRef = doc(db, 'rooms', roomId, 'rounds', roundId, 'answers', selectedAnswerId);
  const ansSnap = await getDoc(selectedAnswerRef);
  if (!ansSnap.exists()) {
    return { success: false, error: 'Selected answer does not exist.' };
  }

  const ansData = ansSnap.data() as Answer;
  if (ansData.authorPlayerId === voterPlayerId) {
    return { success: false, error: 'You cannot vote for your own answer!' };
  }

  const voteRef = doc(db, 'rooms', roomId, 'rounds', roundId, 'votes', voterPlayerId);
  const now = Date.now();
  const existingVote = await getDoc(voteRef);

  if (existingVote.exists()) {
    await updateDoc(voteRef, {
      selectedAnswerId,
      updatedAt: now,
    });
  } else {
    await setDoc(voteRef, {
      playerId: voterPlayerId,
      selectedAnswerId,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Update vote count and votedPlayerIds
  const allVotesSnap = await getDocs(collection(db, 'rooms', roomId, 'rounds', roundId, 'votes'));
  const votedPlayerIds: string[] = [];
  allVotesSnap.forEach((d) => votedPlayerIds.push(d.id));

  const playersSnap = await getDocs(collection(db, 'rooms', roomId, 'players'));

  await updateDoc(roundRef, {
    voteCount: allVotesSnap.size,
    votedPlayerIds,
  });

  // AUTO ADVANCE: If all players have voted, advance immediately to RESULTS
  if (playersSnap.size > 0 && allVotesSnap.size >= playersSnap.size) {
    try {
      await calculateScoresAndTransitionToResults(roomId, roundId);
    } catch (e) {
      console.warn('Auto transition to results note:', e);
    }
  }

  return { success: true };
}

/**
 * HOST: Starts the answering phase for a round with authoritative deadline.
 */
export async function startRound(
  roomId: string,
  roundId: string,
  durationSeconds: number
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized.');

  const now = Date.now();
  const deadline = now + durationSeconds * 1000;

  const roomRef = doc(db, 'rooms', roomId);
  const roundRef = doc(db, 'rooms', roomId, 'rounds', roundId);

  // Count eligible players
  const playersSnap = await getDocs(collection(db, 'rooms', roomId, 'players'));

  await updateDoc(roundRef, {
    status: 'ANSWERING',
    phaseStartedAt: now,
    phaseDeadline: deadline,
    eligiblePlayerCount: playersSnap.size,
    submittedPlayerIds: [],
    votedPlayerIds: [],
    submissionCount: 0,
    voteCount: 0,
  });

  await updateDoc(roomRef, {
    status: 'ANSWERING',
    phaseStartedAt: now,
    phaseDeadline: deadline,
    updatedAt: now,
  });
}

/**
 * HOST / AUTOMATION: Ends answering phase, locks submissions, shuffles answers, transitions to VOTING.
 */
export async function transitionToVoting(
  roomId: string,
  roundId: string,
  durationSeconds: number
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized.');

  const roundRef = doc(db, 'rooms', roomId, 'rounds', roundId);
  const roundSnap = await getDoc(roundRef);
  if (!roundSnap.exists()) return;
  const roundData = roundSnap.data() as Round;
  if (roundData.status !== 'ANSWERING') {
    return; // Already transitioned
  }

  const answersSnap = await getDocs(collection(db, 'rooms', roomId, 'rounds', roundId, 'answers'));
  const activeAnswerIds: string[] = [];

  answersSnap.forEach((doc) => {
    const data = doc.data() as Answer;
    if (data.moderationStatus !== 'hidden') {
      activeAnswerIds.push(doc.id);
    }
  });

  // Randomize answer order once on backend
  const randomizedOrder = shuffleArray(activeAnswerIds);

  const now = Date.now();
  const deadline = now + durationSeconds * 1000;

  const roomRef = doc(db, 'rooms', roomId);

  await updateDoc(roundRef, {
    status: 'VOTING',
    phaseStartedAt: now,
    phaseDeadline: deadline,
    randomizedAnswerIds: randomizedOrder,
    votedPlayerIds: [],
    voteCount: 0,
  });

  await updateDoc(roomRef, {
    status: 'VOTING',
    phaseStartedAt: now,
    phaseDeadline: deadline,
    updatedAt: now,
  });
}

/**
 * HOST / AUTOMATION: Tallies votes, calculates scores idempotently, and reveals results.
 * IMPORTANT: All getDocs calls MUST be outside runTransaction. Inside a transaction,
 * only transaction.get() calls are allowed. getDocs inside a transaction is not
 * atomic and causes stale reads + silent failures.
 */
export async function calculateScoresAndTransitionToResults(
  roomId: string,
  roundId: string
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized.');

  const roundRef = doc(db, 'rooms', roomId, 'rounds', roundId);
  const roomRef = doc(db, 'rooms', roomId);

  // === STEP 1: Pre-read all data OUTSIDE the transaction ===
  // Check idempotency before doing any heavy work
  const roundCheckSnap = await getDoc(roundRef);
  if (!roundCheckSnap.exists()) return;
  const roundCheckData = roundCheckSnap.data() as Round;
  if (roundCheckData.scoringProcessed) {
    // Already scored, just ensure room status is RESULTS
    await updateDoc(roomRef, { status: 'RESULTS', updatedAt: Date.now() });
    return;
  }

  // Read answers, votes, and players OUTSIDE transaction (non-transactional reads are fine here
  // because we protect against double-execution via scoringProcessed flag in the transaction below)
  const answersSnap = await getDocs(collection(db, 'rooms', roomId, 'rounds', roundId, 'answers'));
  const answers: { id: string; authorPlayerId: string; moderationStatus?: string }[] = [];
  answersSnap.forEach((d) => {
    const data = d.data() as Answer;
    answers.push({
      id: d.id,
      authorPlayerId: data.authorPlayerId,
      moderationStatus: data.moderationStatus,
    });
  });

  const votesSnap = await getDocs(collection(db, 'rooms', roomId, 'rounds', roundId, 'votes'));
  const votes: { playerId: string; selectedAnswerId: string }[] = [];
  votesSnap.forEach((d) => {
    const data = d.data() as Vote;
    votes.push({
      playerId: data.playerId || d.id,
      selectedAnswerId: data.selectedAnswerId,
    });
  });

  const playersSnap = await getDocs(collection(db, 'rooms', roomId, 'players'));
  const allPlayerIds: string[] = [];
  playersSnap.forEach((d) => allPlayerIds.push(d.id));

  // Calculate scores from the pre-read data
  const calculated = calculateRoundScores({ answers, votes, allPlayerIds });

  // === STEP 2: Run atomic transaction for all writes ===
  await runTransaction(db, async (transaction) => {
    // Re-check the idempotency guard INSIDE the transaction to prevent race conditions
    const roundDoc = await transaction.get(roundRef);
    if (!roundDoc.exists()) throw new Error('Round not found');

    const roundData = roundDoc.data() as Round;
    if (roundData.scoringProcessed) {
      // Another concurrent call already processed scores — abort safely
      return;
    }

    // Read current player scores inside transaction (only transaction.get allowed here)
    const playerRefs: Record<string, ReturnType<typeof doc>> = {};
    const playerSnaps: Record<string, any> = {};
    for (const playerId of allPlayerIds) {
      const pRef = doc(db, 'rooms', roomId, 'players', playerId);
      playerRefs[playerId] = pRef;
      playerSnaps[playerId] = await transaction.get(pRef);
    }

    // Write voteCount to each answer document
    for (const [ansId, count] of Object.entries(calculated.answerVoteCounts)) {
      const ansRef = doc(db, 'rooms', roomId, 'rounds', roundId, 'answers', ansId);
      transaction.update(ansRef, { voteCount: count });
    }

    // Write round score doc + update player cumulative totalScore
    for (const [playerId, score] of Object.entries(calculated.roundScores)) {
      const scoreRef = doc(db, 'rooms', roomId, 'rounds', roundId, 'scores', playerId);
      transaction.set(scoreRef, score);

      const pSnap = playerSnaps[playerId];
      if (pSnap && pSnap.exists()) {
        const curTotal = (pSnap.data() as Player).totalScore || 0;
        transaction.update(playerRefs[playerId], {
          totalScore: curTotal + score.totalRoundPoints,
          lastSeenAt: Date.now(),
        });
      }
    }

    const now = Date.now();
    // Mark round as scored and transition to RESULTS
    transaction.update(roundRef, {
      status: 'RESULTS',
      resultsRevealed: true,
      scoringProcessed: true,
      phaseStartedAt: now,
    });

    transaction.update(roomRef, {
      status: 'RESULTS',
      updatedAt: now,
    });
  });
}


/**
 * HOST: Pauses the game, freezing the timer and saving remaining duration.
 */
export async function pauseGame(roomId: string): Promise<void> {
  if (!db) return;
  const roomRef = doc(db, 'rooms', roomId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return;

  const room = snap.data() as Room;
  if (room.status === 'PAUSED') return;

  const now = Date.now();
  const remaining = Math.max(0, room.phaseDeadline - now);

  await updateDoc(roomRef, {
    status: 'PAUSED',
    previousPhase: room.status,
    remainingDurationBeforePause: remaining,
    updatedAt: now,
  });
}

/**
 * HOST: Resumes the paused game, setting a fresh deadline from remaining duration.
 */
export async function resumeGame(roomId: string): Promise<void> {
  if (!db) return;
  const roomRef = doc(db, 'rooms', roomId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return;

  const room = snap.data() as Room;
  if (room.status !== 'PAUSED') return;

  const remaining = room.remainingDurationBeforePause || 60000;
  const now = Date.now();
  const newDeadline = now + remaining;
  const restoredPhase = room.previousPhase || 'ANSWERING';

  await updateDoc(roomRef, {
    status: restoredPhase,
    phaseStartedAt: now,
    phaseDeadline: newDeadline,
    remainingDurationBeforePause: 0,
    updatedAt: now,
  });

  if (room.currentRoundId) {
    const roundRef = doc(db, 'rooms', roomId, 'rounds', room.currentRoundId);
    await updateDoc(roundRef, {
      status: restoredPhase,
      phaseStartedAt: now,
      phaseDeadline: newDeadline,
    });
  }
}

/**
 * HOST: Advances to the next round or finishes game if rounds exhausted.
 */
export async function advanceToNextRound(
  roomId: string,
  nextRoundNumber: number,
  totalRounds: number
): Promise<void> {
  if (!db) return;
  const roomRef = doc(db, 'rooms', roomId);

  if (nextRoundNumber > totalRounds) {
    await updateDoc(roomRef, {
      status: 'GAME_FINISHED',
      updatedAt: Date.now(),
    });
    return;
  }

  // Fetch question for next round
  const qRef = doc(db, 'rooms', roomId, 'questions', `q_${nextRoundNumber}`);
  const qSnap = await getDoc(qRef);
  const questionText = qSnap.exists()
    ? qSnap.data().text
    : `Round ${nextRoundNumber} Question`;

  const nextRoundId = `round_${nextRoundNumber}`;
  const now = Date.now();

  const roundData: Omit<Round, 'id'> = {
    roundNumber: nextRoundNumber,
    question: questionText,
    status: 'LOBBY',
    phaseStartedAt: now,
    phaseDeadline: now,
    eligiblePlayerCount: 0,
    submissionCount: 0,
    voteCount: 0,
    randomizedAnswerIds: [],
    resultsRevealed: false,
    scoringProcessed: false,
    createdAt: now,
  };

  await setDoc(doc(db, 'rooms', roomId, 'rounds', nextRoundId), roundData);

  await updateDoc(roomRef, {
    currentRoundNumber: nextRoundNumber,
    currentRoundId: nextRoundId,
    status: 'LOBBY',
    updatedAt: now,
  });
}

/**
 * Real-time subscriptions for UI synchronization.
 */
export function subscribeToRoom(roomId: string, callback: (room: Room | null) => void): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(doc(db, 'rooms', roomId), (snap) => {
    if (!snap.exists()) {
      callback(null);
    } else {
      callback({ id: snap.id, ...(snap.data() as Omit<Room, 'id'>) });
    }
  });
}

export function subscribeToPlayers(roomId: string, callback: (players: Player[]) => void): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(collection(db, 'rooms', roomId, 'players'), (snap) => {
    const players: Player[] = [];
    snap.forEach((d) => players.push({ id: d.id, ...(d.data() as Omit<Player, 'id'>) }));
    callback(players);
  });
}

export function subscribeToRound(roomId: string, roundId: string, callback: (round: Round | null) => void): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(doc(db, 'rooms', roomId, 'rounds', roundId), (snap) => {
    if (!snap.exists()) {
      callback(null);
    } else {
      callback({ id: snap.id, ...(snap.data() as Omit<Round, 'id'>) });
    }
  });
}

export function subscribeToAnswers(
  roomId: string,
  roundId: string,
  callback: (answers: Answer[]) => void
): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(collection(db, 'rooms', roomId, 'rounds', roundId, 'answers'), (snap) => {
    const answers: Answer[] = [];
    snap.forEach((d) => answers.push({ id: d.id, ...(d.data() as Omit<Answer, 'id'>) }));
    callback(answers);
  });
}

export function subscribeToScores(
  roomId: string,
  roundId: string,
  callback: (scores: Record<string, RoundScore>) => void
): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(collection(db, 'rooms', roomId, 'rounds', roundId, 'scores'), (snap) => {
    const scores: Record<string, RoundScore> = {};
    snap.forEach((d) => {
      scores[d.id] = d.data() as RoundScore;
    });
    callback(scores);
  });
}

export function subscribeToUserAnswer(
  roomId: string,
  roundId: string,
  playerId: string,
  callback: (answer: Answer | null) => void
): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(doc(db, 'rooms', roomId, 'rounds', roundId, 'answers', playerId), (snap) => {
    if (!snap.exists()) {
      callback(null);
    } else {
      callback({ id: snap.id, ...(snap.data() as Omit<Answer, 'id'>) });
    }
  });
}

export function subscribeToUserVote(
  roomId: string,
  roundId: string,
  playerId: string,
  callback: (vote: Vote | null) => void
): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(doc(db, 'rooms', roomId, 'rounds', roundId, 'votes', playerId), (snap) => {
    if (!snap.exists()) {
      callback(null);
    } else {
      callback(snap.data() as Vote);
    }
  });
}
