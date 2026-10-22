import { auth, signInAnonymously } from '../lib/firebase';
import { User } from 'firebase/auth';

/**
 * Handles anonymous authentication for game participants.
 * Automatically restores or provisions an anonymous Firebase Auth user.
 */
export async function getOrCreateAnonymousUser(): Promise<User | null> {
  if (!auth) return null;
  if (auth.currentUser) {
    return auth.currentUser;
  }
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (error) {
    console.warn('[PSYCH Auth] Anonymous sign-in warning:', error);
    // Return null or let caller handle fallback
    return null;
  }
}

/**
 * Manages persistent client session storage to recover state on reload.
 */
export const sessionStore = {
  getPlayerKey: (roomCode: string) => `psych_player_${roomCode.toUpperCase()}`,
  getHostKey: (roomCode: string) => `psych_host_token_${roomCode.toUpperCase()}`,

  savePlayerSession: (roomCode: string, session: { playerId: string; displayName: string }) => {
    localStorage.setItem(sessionStore.getPlayerKey(roomCode), JSON.stringify(session));
  },

  getPlayerSession: (roomCode: string): { playerId: string; displayName: string } | null => {
    const data = localStorage.getItem(sessionStore.getPlayerKey(roomCode));
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  clearPlayerSession: (roomCode: string) => {
    localStorage.removeItem(sessionStore.getPlayerKey(roomCode));
  },

  saveHostToken: (roomCode: string, token: string) => {
    localStorage.setItem(sessionStore.getHostKey(roomCode), token);
  },

  getHostToken: (roomCode: string): string | null => {
    return localStorage.getItem(sessionStore.getHostKey(roomCode));
  },

  clearHostToken: (roomCode: string) => {
    localStorage.removeItem(sessionStore.getHostKey(roomCode));
  },
};
