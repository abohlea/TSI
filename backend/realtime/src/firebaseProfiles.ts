import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getFirebaseAdminApp } from './firebaseAuth.js';

export interface ProvisionedPlayerProfile {
  uid: string;
  publicName: string;
  level: number;
}

/**
 * Creates the private account, public profile and progression documents once.
 * Existing player data is never overwritten by a login/ticket refresh.
 */
export async function provisionPlayerProfile(uid: string): Promise<ProvisionedPlayerProfile> {
  if (!uid || uid.length > 128) throw new Error('Invalid Firebase player UID.');

  const db = getFirestore(getFirebaseAdminApp());
  const userRef = db.doc(`users/${uid}`);
  const profileRef = db.doc(`playerProfiles/${uid}`);
  const progressionRef = db.doc(`progression/${uid}`);

  const publicName = `Operator-${uid.slice(0, 6)}`;
  await db.runTransaction(async (transaction) => {
    const [user, profile, progression] = await Promise.all([
      transaction.get(userRef),
      transaction.get(profileRef),
      transaction.get(progressionRef)
    ]);

    if (user.exists && user.get('accountStatus') !== 'active') {
      throw new Error('TSI account is not active.');
    }

    const createdAt = FieldValue.serverTimestamp();
    if (!user.exists) {
      transaction.create(userRef, {
        uid,
        accountStatus: 'active',
        createdAt
      });
    }
    if (!profile.exists) {
      transaction.create(profileRef, {
        uid,
        publicName,
        level: 1,
        avatar: null,
        createdAt
      });
    }
    if (!progression.exists) {
      transaction.create(progressionRef, {
        level: 1,
        experience: 0,
        updatedAt: createdAt
      });
    }
  });

  return { uid, publicName, level: 1 };
}
