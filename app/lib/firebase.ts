import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import type { FirebaseError } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// App Check'i başlat
if (typeof window !== 'undefined') {
  // Debug token'ı sadece development ortamında etkinleştir
  if (process.env.NODE_ENV === 'development') {
    // @ts-expect-error - Firebase App Check debug token is not recognized in global scope
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.FIREBASE_APPCHECK_DEBUG_TOKEN;
  }

  try {
    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!),
      isTokenAutoRefreshEnabled: true
    });
    console.log('App Check initialized successfully');
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    console.error('Error initializing App Check:', firebaseError.message);
  }
}

export const db = getFirestore(app);
export const auth = getAuth(app);

// Oturum kalıcılığını ayarla
setPersistence(auth, browserLocalPersistence)
  .catch((error: FirebaseError) => {
    console.error('Auth persistence error:', error.message);
  }); 