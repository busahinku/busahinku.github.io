// Firebase Authentication utilities
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';
import { getFirebaseApp } from './client';
import type { User } from './types';

let auth: Auth | undefined;

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const app = getFirebaseApp();
    auth = getAuth(app);
  }
  return auth;
}

export async function signInWithGoogle(): Promise<User | null> {
  try {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return mapFirebaseUser(result.user);
  } catch (error) {
    console.error('Error signing in with Google:', error);
    return null;
  }
}

export async function signOut(): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
  }
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    callback(firebaseUser ? mapFirebaseUser(firebaseUser) : null);
  });
  return unsubscribe;
}

export function getCurrentUser(): User | null {
  const auth = getFirebaseAuth();
  return auth.currentUser ? mapFirebaseUser(auth.currentUser) : null;
}

function mapFirebaseUser(user: FirebaseUser): User {
  return {
    uid: user.uid,
    displayName: user.displayName || 'Anonymous',
    photoURL: user.photoURL,
    email: user.email || '',
  };
}
