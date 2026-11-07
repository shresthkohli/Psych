import { collection, doc, getCountFromServer, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Room, ServiceResult } from '../types/game';
import { validateMaxPlayers, validateTotalRounds } from '../lib/questionRules';

/** HOST: Changes the target number of rounds. Validation lives in questionRules. */
export async function updateTotalRounds(roomId: string, totalRounds: number): Promise<ServiceResult> {
  if (!db) throw new Error('Firestore not initialized.');
  const roomRef = doc(db, 'rooms', roomId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return { success: false, error: 'Room not found.' };
  const error = validateTotalRounds(totalRounds, snap.data() as Omit<Room, 'id'>);
  if (error) return { success: false, error };
  await updateDoc(roomRef, { 'settings.totalRounds': totalRounds, updatedAt: Date.now() });
  return { success: true };
}

/** HOST: Changes the soft player limit. Validation lives in questionRules. */
export async function updateMaxPlayers(roomId: string, maxPlayers: number): Promise<ServiceResult> {
  if (!db) throw new Error('Firestore not initialized.');
  const countSnap = await getCountFromServer(collection(db, 'rooms', roomId, 'players'));
  const error = validateMaxPlayers(maxPlayers, countSnap.data().count);
  if (error) return { success: false, error };
  await updateDoc(doc(db, 'rooms', roomId), { 'settings.maxPlayers': maxPlayers, updatedAt: Date.now() });
  return { success: true };
}

