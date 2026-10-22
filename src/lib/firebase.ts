import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  Auth,
  User,
  connectAuthEmulator,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
  serverTimestamp,
} from 'firebase/firestore';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== 'AIzaSyDemoPlaceholderKey123456789'
  );
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app);

  // Connect to Local Emulators if configured or in emulator mode
  if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    const host = window.location.hostname || 'localhost';
    try {
      connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
      connectFirestoreEmulator(db, host, 8080);
      connectFunctionsEmulator(functions, host, 5001);
      console.log('[PSYCH Firebase] Connected to Local Firebase Emulators on host:', host);
    } catch {
      // Ignored if already connected
    }
  }
} catch (err) {
  console.warn('[PSYCH Firebase] Firebase initialization status:', err);
}

export { app, auth, db, functions, signInAnonymously, onAuthStateChanged, serverTimestamp };
export type { User };
