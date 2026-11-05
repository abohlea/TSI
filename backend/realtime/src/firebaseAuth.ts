import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export interface FirebasePlayerIdentity {
  playerId: string;
}

export function getFirebaseAdminApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is required for production Firebase authentication.');
  }

  const existing = getApps().find((app) => app.name === 'tsi-realtime-auth');
  if (existing) return existing;

  return initializeApp(
    {
      credential: applicationDefault(),
      projectId
    },
    'tsi-realtime-auth'
  );
}

/**
 * Verifies a Firebase Authentication ID token, including revocation status.
 * Credentials must be provided by the server runtime (ADC/workload identity),
 * never by the browser or a checked-in service-account key.
 */
export async function verifyFirebasePlayerToken(idToken: string): Promise<FirebasePlayerIdentity> {
  if (idToken.length < 100 || idToken.length > 8192) {
    throw new Error('Invalid Firebase ID token length.');
  }

  const decoded = await getAuth(getFirebaseAdminApp()).verifyIdToken(idToken, true);
  if (!decoded.uid || decoded.aud !== process.env.FIREBASE_PROJECT_ID) {
    throw new Error('Firebase ID token project or subject is invalid.');
  }

  return { playerId: decoded.uid };
}
