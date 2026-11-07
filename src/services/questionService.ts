import { collection, doc, onSnapshot, runTransaction, Unsubscribe, DocumentReference } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Room, Round, QuestionDoc, ServiceResult } from '../types/game';
import {
  getAddQuestionBlockReason,
  getQuestionCount,
  isQuestionEditable,
  validateQuestionText,
  QUESTION_ALREADY_ASKED_MSG,
} from '../lib/questionRules';

/** The ONLY place that builds question document ids. */
export const questionDocId = (roundNumber: number): string => `q_${roundNumber}`;

export function questionDocRef(roomId: string, roundNumber: number): DocumentReference {
  if (!db) throw new Error('Firestore not initialized.');
  return doc(db, 'rooms', roomId, 'questions', questionDocId(roundNumber));
}

/** HOST: Adds the next question. Rules (cap, status) come from questionRules. Raises totalRounds if needed. */
export async function addQuestion(roomId: string, text: string): Promise<ServiceResult> {
  if (!db) throw new Error('Firestore not initialized.');
  const database = db;
  const v = validateQuestionText(text);
  if (!v.valid) return { success: false, error: v.error };

  const roomRef = doc(database, 'rooms', roomId);
  try {
    await runTransaction(database, async (tx) => {
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) throw new Error('Room not found.');
      const room = roomSnap.data() as Omit<Room, 'id'>;

      const blockReason = getAddQuestionBlockReason(room);
      if (blockReason) throw new Error(blockReason);

      const newNumber = getQuestionCount(room) + 1;

      // If the new question belongs to the round waiting in the lobby, keep that round doc in sync.
      const roundRef = doc(database, 'rooms', roomId, 'rounds', room.currentRoundId ?? `round_${room.currentRoundNumber}`);
      const needsRoundSync = room.status === 'LOBBY' && newNumber === room.currentRoundNumber;
      const roundSnap = needsRoundSync ? await tx.get(roundRef) : null;

      const now = Date.now();
      tx.set(questionDocRef(roomId, newNumber), {
        roundNumber: newNumber,
        text: v.clean,
        createdAt: now,
        updatedAt: now,
      });
      tx.update(
        roomRef,
        newNumber > room.settings.totalRounds
          ? { questionCount: newNumber, 'settings.totalRounds': newNumber, updatedAt: now }
          : { questionCount: newNumber, updatedAt: now }
      );
      if (roundSnap && roundSnap.exists() && (roundSnap.data() as Round).status === 'LOBBY') {
        tx.update(roundRef, { question: v.clean });
      }
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to add question.' };
  }
}

/** HOST: Edits a question that has not been asked yet. */
export async function editQuestion(roomId: string, roundNumber: number, text: string): Promise<ServiceResult> {
  if (!db) throw new Error('Firestore not initialized.');
  const database = db;
  const v = validateQuestionText(text);
  if (!v.valid) return { success: false, error: v.error };

  const roomRef = doc(database, 'rooms', roomId);
  const qRef = questionDocRef(roomId, roundNumber);
  try {
    await runTransaction(database, async (tx) => {
      // ALL reads first
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) throw new Error('Room not found.');
      const room = roomSnap.data() as Omit<Room, 'id'>;
      const qSnap = await tx.get(qRef);
      if (!qSnap.exists()) throw new Error('Question not found.');
      if (!isQuestionEditable(roundNumber, room.currentRoundNumber, room.status)) {
        throw new Error(QUESTION_ALREADY_ASKED_MSG);
      }
      let roundRef: DocumentReference | null = null;
      let roundExists = false;
      if (roundNumber === room.currentRoundNumber) {
        roundRef = doc(database, 'rooms', roomId, 'rounds', `round_${roundNumber}`);
        const roundSnap = await tx.get(roundRef);
        roundExists = roundSnap.exists();
        if (roundExists && (roundSnap.data() as Round).status !== 'LOBBY') {
          throw new Error(QUESTION_ALREADY_ASKED_MSG);
        }
      }
      // THEN writes
      tx.update(qRef, { text: v.clean, updatedAt: Date.now() });
      if (roundRef && roundExists) tx.update(roundRef, { question: v.clean });
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to edit question.' };
  }
}

/** Realtime list of questions sorted by round number. */
export function subscribeToQuestions(roomId: string, callback: (questions: QuestionDoc[]) => void): Unsubscribe {
  if (!db) return () => {};
  return onSnapshot(collection(db, 'rooms', roomId, 'questions'), (snap) => {
    const list = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<QuestionDoc, 'id'>) }))
      .sort((a, b) => a.roundNumber - b.roundNumber);
    callback(list);
  });
}

