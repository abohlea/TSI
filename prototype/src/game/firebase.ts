import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  signInWithPopup,
  type Auth
} from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined
};

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

let authEmulatorConfigured = false;

function firebaseAuth(): Auth {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase Web App non configurée : renseigne les variables VITE_FIREBASE_*.');
  }
  const app = getApps().length ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  const emulatorHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST as string | undefined;
  if (emulatorHost && !authEmulatorConfigured) {
    connectAuthEmulator(auth, `http://${emulatorHost}`, { disableWarnings: true });
    authEmulatorConfigured = true;
  }
  return auth;
}

export function hasFirebaseUser(): boolean {
  return isFirebaseConfigured() && firebaseAuth().currentUser !== null;
}

export async function signInWithGoogle(): Promise<void> {
  const auth = firebaseAuth();
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function getFirebaseIdToken(): Promise<string> {
  const user = firebaseAuth().currentUser;
  if (!user) throw new Error('Connecte-toi avec Firebase avant de rejoindre le serveur.');
  return user.getIdToken();
}
