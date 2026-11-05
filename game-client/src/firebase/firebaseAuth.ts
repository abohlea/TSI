import { getApp, getApps, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously
} from "firebase/auth";

export interface FirebaseGameIdentity {
  uid: string;
  idToken: string;
}

function requiredConfig(name: string, value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`Configuration Firebase manquante : ${name}.`);
  }
  return normalized;
}

export async function acquireFirebaseGameIdentity(): Promise<FirebaseGameIdentity> {
  const config = {
    apiKey: requiredConfig("VITE_FIREBASE_API_KEY", import.meta.env.VITE_FIREBASE_API_KEY),
    authDomain: requiredConfig("VITE_FIREBASE_AUTH_DOMAIN", import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
    projectId: requiredConfig("VITE_FIREBASE_PROJECT_ID", import.meta.env.VITE_FIREBASE_PROJECT_ID),
    appId: requiredConfig("VITE_FIREBASE_APP_ID", import.meta.env.VITE_FIREBASE_APP_ID)
  };

  const app = getApps().some((candidate) => candidate.name === "tsi-client")
    ? getApp("tsi-client")
    : initializeApp(config, "tsi-client");

  const auth = getAuth(app);
  const emulatorUrl = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL?.trim();

  if (emulatorUrl) {
    connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
  }

  const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
  const idToken = await user.getIdToken(true);

  return { uid: user.uid, idToken };
}
