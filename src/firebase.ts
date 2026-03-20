import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'game-of-prompts-490805',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:535187374566:web:b9dd7401df5ba3e46c5627',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAY6LFxK8kEE2oCsrJd2wtyLo2ekPCylg8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'game-of-prompts-490805.firebaseapp.com',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-97abaf63-756a-4632-8742-d69e1b7aca52',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'game-of-prompts-490805.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '535187374566',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
