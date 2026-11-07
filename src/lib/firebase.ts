import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getApp, getApps, initializeApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";

// Firebase 12 ships this export in its React Native runtime entry, but its
// browser TypeScript declarations currently omit it (Firebase SDK issue #9316).
const getReactNativePersistence = (
  FirebaseAuth as typeof FirebaseAuth & {
    getReactNativePersistence: (storage: typeof AsyncStorage) => FirebaseAuth.Persistence;
  }
).getReactNativePersistence;
const { getAuth, initializeAuth } = FirebaseAuth;
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

export const firebaseConfigured = hasFirebaseConfig;

const app = hasFirebaseConfig
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

function createAuth() {
  if (!app) return null;
  try {
    if (Platform.OS === "web") return getAuth(app);
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Fast Refresh can initialize Auth more than once.
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = app ? getFirestore(app) : null;

export function requireFirebase() {
  if (!auth || !db) {
    throw new Error(
      "Firebase n'est pas configuré. Ajoutez les variables EXPO_PUBLIC_FIREBASE_* dans votre fichier .env."
    );
  }
  return { auth, db };
}
