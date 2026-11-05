import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const APP_NAME = "tsi-server";

export interface AuthenticatedPlayer {
  uid: string;
  displayName: string;
}

export interface RoomAuthOptions {
  idToken: string;
  displayName: string;
}

export function parseRoomAuthOptions(value: unknown): RoomAuthOptions | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  if (
    typeof record.idToken !== "string" ||
    record.idToken.length < 100 ||
    record.idToken.length > 12_000
  ) return null;

  const displayName = typeof record.displayName === "string"
    ? record.displayName
    : "OPERATOR";

  if (displayName.length > 64) return null;
  return { idToken: record.idToken, displayName };
}

export function sanitizePlayerDisplayName(value: string): string {
  const sanitized = value
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 16);

  return sanitized || "OPERATOR";
}

export function getTsiAdminApp() {
  const existing = getApps().find((app) => app.name === APP_NAME);
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is required by the TSI server.");
  }

  const authEmulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  const firestoreEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const usingEmulators = authEmulator || firestoreEmulator;

  if (process.env.NODE_ENV === "production" && usingEmulators) {
    throw new Error("Firebase emulators must never be enabled in production.");
  }

  const options: {
    projectId: string;
    credential?: ReturnType<typeof applicationDefault>;
  } = { projectId };

  // Local Emulator Suite needs no service-account key. Outside emulator mode,
  // use Application Default Credentials (workload identity / attached identity
  // in hosted environments, or GOOGLE_APPLICATION_CREDENTIALS for local admin work).
  if (!usingEmulators || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    options.credential = applicationDefault();
  }

  return initializeApp(options, APP_NAME);
}

async function ensurePlayerDocuments(uid: string, displayName: string): Promise<void> {
  const db = getFirestore(getTsiAdminApp());
  const userRef = db.doc(`users/${uid}`);
  const profileRef = db.doc(`playerProfiles/${uid}`);
  const progressionRef = db.doc(`progression/${uid}`);

  await db.runTransaction(async (transaction) => {
    const [userSnapshot, profileSnapshot, progressionSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(profileRef),
      transaction.get(progressionRef)
    ]);

    if (userSnapshot.exists && userSnapshot.get("accountStatus") !== "active") {
      throw new Error("TSI account is not active.");
    }

    const now = FieldValue.serverTimestamp();

    if (!userSnapshot.exists) {
      transaction.create(userRef, {
        displayName,
        accountStatus: "active",
        createdAt: now,
        updatedAt: now
      });
    }

    if (!profileSnapshot.exists) {
      transaction.create(profileRef, {
        publicName: displayName,
        level: 1,
        createdAt: now,
        updatedAt: now
      });
    }

    if (!progressionSnapshot.exists) {
      transaction.create(progressionRef, {
        level: 1,
        experience: 0,
        createdAt: now,
        updatedAt: now
      });
    }
  });
}

export async function authenticateFirebasePlayer(
  idToken: string,
  requestedDisplayName: string
): Promise<AuthenticatedPlayer> {
  const app = getTsiAdminApp();
  const decoded = await getAuth(app).verifyIdToken(idToken, true);
  const displayName = sanitizePlayerDisplayName(
    requestedDisplayName || decoded.name || "OPERATOR"
  );

  await ensurePlayerDocuments(decoded.uid, displayName);
  return { uid: decoded.uid, displayName };
}
