// Firebase client initialization (client-side only)
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { firebaseConfig } from './config';

let app: FirebaseApp | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (typeof window === 'undefined') {
    throw new Error('Firebase client can only be used in the browser');
  }

  if (!app && getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else if (!app) {
    app = getApps()[0];
  }

  return app;
}
