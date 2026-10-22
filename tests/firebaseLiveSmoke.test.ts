import { describe, it, expect } from 'vitest';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBdk_GjSlEUL0Ug0_8hXUrYKq-jgRevK0k",
  authDomain: "psych-ecell-svnit.firebaseapp.com",
  projectId: "psych-ecell-svnit",
  storageBucket: "psych-ecell-svnit.firebasestorage.app",
  messagingSenderId: "550693453723",
  appId: "1:550693453723:web:f673fdb63baa07c84d2b3e",
};

describe('Live Firebase Backend Smoke Test', () => {
  it('connects to real Firebase project and verifies Auth and Firestore', async () => {
    const app = initializeApp(firebaseConfig, 'smoke-test-app');
    const auth = getAuth(app);
    const db = getFirestore(app);

    try {
      // 1. Test Anonymous Auth
      const userCred = await signInAnonymously(auth);
      expect(userCred.user).toBeDefined();
      expect(userCred.user.isAnonymous).toBe(true);
      console.log('Successfully signed in anonymously with UID:', userCred.user.uid);

      // 2. Test Firestore Write / Read
      const testRef = doc(db, 'rooms', 'smoke_test_room');
      await setDoc(testRef, {
        roomCode: 'TEST99',
        hostUid: userCred.user.uid,
        status: 'LOBBY',
        createdAt: Date.now(),
      });

      const snap = await getDoc(testRef);
      expect(snap.exists()).toBe(true);
      expect(snap.data()?.roomCode).toBe('TEST99');
      console.log('Successfully wrote and read document from live Firestore!');

      // Cleanup
      await deleteDoc(testRef);
    } catch (err: any) {
      console.error('Live smoke test error:', err.code, err.message);
      throw err;
    }
  });
});
