import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { getFirestore } from 'firebase-admin/firestore';
import { getFirebaseAdminApp } from '../src/firebaseAuth.js';
import { provisionPlayerProfile } from '../src/firebaseProfiles.js';

test('Firebase player provisioning creates private, public and progression documents idempotently', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST
}, async () => {
  process.env.FIREBASE_PROJECT_ID ??= 'demo-tsi-rules';
  const uid = `profile-test-${randomUUID()}`;
  const db = getFirestore(getFirebaseAdminApp());
  const userRef = db.doc(`users/${uid}`);
  const profileRef = db.doc(`playerProfiles/${uid}`);
  const progressionRef = db.doc(`progression/${uid}`);

  try {
    const first = await provisionPlayerProfile(uid);
    assert.deepEqual(first, { uid, publicName: `Operator-${uid.slice(0, 6)}`, level: 1 });

    const [user, profile, progression] = await Promise.all([
      userRef.get(), profileRef.get(), progressionRef.get()
    ]);
    assert.equal(user.get('accountStatus'), 'active');
    assert.equal(profile.get('level'), 1);
    assert.equal(progression.get('experience'), 0);

    await profileRef.update({ publicName: 'Custom Operator' });
    await progressionRef.update({ experience: 275 });
    await provisionPlayerProfile(uid);

    const [preservedProfile, preservedProgression] = await Promise.all([
      profileRef.get(), progressionRef.get()
    ]);
    assert.equal(preservedProfile.get('publicName'), 'Custom Operator');
    assert.equal(preservedProgression.get('experience'), 275);
  } finally {
    await Promise.all([userRef.delete(), profileRef.delete(), progressionRef.delete()]);
  }
});
