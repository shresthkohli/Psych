import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

admin.initializeApp();
const db = admin.firestore();

/**
 * Fisher-Yates array shuffle.
 */
function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Cloud Function: advanceGamePhase
 * Secure host-authorized state transitions.
 */
export const advanceGamePhase = onCall(async (request) => {
  const { roomId, targetPhase, hostSecret } = request.data;
  if (!roomId || !targetPhase) {
    throw new HttpsError('invalid-argument', 'Missing roomId or targetPhase.');
  }

  const roomRef = db.collection('rooms').doc(roomId);
  const roomDoc = await roomRef.get();
  if (!roomDoc.exists) {
    throw new HttpsError('not-found', 'Room not found.');
  }

  const room = roomDoc.data()!;
  const callerUid = request.auth?.uid;

  // Authorize host
  if (callerUid !== room.hostUid && hostSecret !== room.hostSecret) {
    throw new HttpsError('permission-denied', 'Unauthorized: caller is not room host.');
  }

  const currentRoundId = room.currentRoundId;
  const roundRef = currentRoundId ? roomRef.collection('rounds').doc(currentRoundId) : null;
  const now = Date.now();

  if (targetPhase === 'VOTING' && roundRef) {
    // Collect active answers and randomize order on server
    const answersSnap = await roundRef.collection('answers').get();
    const activeIds: string[] = [];

    answersSnap.forEach((doc) => {
      const data = doc.data();
      if (data.moderationStatus !== 'hidden') {
        activeIds.push(doc.id);
      }
    });

    const randomized = shuffleArray(activeIds);
    const deadline = now + (room.settings?.votingDuration || 90) * 1000;

    await roundRef.update({
      status: 'VOTING',
      phaseStartedAt: now,
      phaseDeadline: deadline,
      randomizedAnswerIds: randomized,
    });

    await roomRef.update({
      status: 'VOTING',
      phaseStartedAt: now,
      phaseDeadline: deadline,
      updatedAt: now,
    });

    return { success: true, phase: 'VOTING', deadline };
  }

  if (targetPhase === 'RESULTS' && roundRef) {
    // Atomic score calculation
    await db.runTransaction(async (transaction) => {
      const rSnap = await transaction.get(roundRef);
      if (!rSnap.exists) throw new Error('Round not found');

      const roundData = rSnap.data()!;
      if (roundData.scoringProcessed) {
        return; // Idempotent guard
      }

      // Read answers
      const answersSnap = await roundRef.collection('answers').get();
      const answerAuthorMap: Record<string, string> = {};
      answersSnap.forEach((d) => {
        const ad = d.data();
        if (ad.moderationStatus !== 'hidden') {
          answerAuthorMap[d.id] = ad.authorPlayerId;
        }
      });

      // Read votes
      const votesSnap = await roundRef.collection('votes').get();
      const answerVoteCounts: Record<string, number> = {};
      Object.keys(answerAuthorMap).forEach((id) => (answerVoteCounts[id] = 0));

      const validVoters = new Set<string>();
      const processedVoters = new Set<string>();

      votesSnap.forEach((d) => {
        const vd = d.data();
        const voterId = vd.playerId || d.id;
        if (processedVoters.has(voterId)) return;
        processedVoters.add(voterId);

        const targetAuthor = answerAuthorMap[vd.selectedAnswerId];
        // Prohibit self-votes
        if (targetAuthor && targetAuthor !== voterId) {
          answerVoteCounts[vd.selectedAnswerId] = (answerVoteCounts[vd.selectedAnswerId] || 0) + 1;
          validVoters.add(voterId);
        }
      });

      // Determine top votes
      let maxVotes = 0;
      Object.values(answerVoteCounts).forEach((count) => {
        if (count > maxVotes) maxVotes = count;
      });

      const bonusAuthors = new Set<string>();
      if (maxVotes > 0) {
        Object.entries(answerVoteCounts).forEach(([ansId, count]) => {
          if (count === maxVotes) {
            const author = answerAuthorMap[ansId];
            if (author) bonusAuthors.add(author);
          }
        });
      }

      // Read players
      const playersSnap = await roomRef.collection('players').get();

      // Write vote counts to answers
      answersSnap.forEach((ad) => {
        const count = answerVoteCounts[ad.id] || 0;
        transaction.update(ad.ref, { voteCount: count });
      });

      // Compute & save scores: 1 vote = 1 point, 0 votes = 0 points
      playersSnap.forEach((pDoc) => {
        const pId = pDoc.id;
        let votePoints = 0;
        answersSnap.forEach((ad) => {
          if (ad.data().authorPlayerId === pId && ad.data().moderationStatus !== 'hidden') {
            votePoints += (answerVoteCounts[ad.id] || 0) * 1;
          }
        });

        const participationPoints = 0;
        const winnerBonus = 0;
        const totalRoundPoints = votePoints;

        const scoreRef = roundRef.collection('scores').doc(pId);
        transaction.set(scoreRef, {
          playerId: pId,
          answerPoints: votePoints,
          participationPoints,
          winnerBonus,
          totalRoundPoints,
          processedAt: now,
        });

        const curTotal = pDoc.data().totalScore || 0;
        transaction.update(pDoc.ref, {
          totalScore: curTotal + totalRoundPoints,
          lastSeenAt: now,
        });
      });

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

    return { success: true, phase: 'RESULTS' };
  }

  // General phase update
  await roomRef.update({
    status: targetPhase,
    updatedAt: now,
  });

  return { success: true, phase: targetPhase };
});
