import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';

const PROJECT_ID = 'demo-tsi-rules';
let environment: RulesTestEnvironment;

before(async () => {
  const rules = await readFile(new URL('../../../firestore.rules', import.meta.url), 'utf8');
  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules }
  });

  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/alice'), { displayName: 'Alice', accountStatus: 'active' });
    await setDoc(doc(db, 'users/bob'), { displayName: 'Bob', accountStatus: 'active' });
    await setDoc(doc(db, 'playerProfiles/alice'), { publicName: 'Alice', level: 4 });
    await setDoc(doc(db, 'inventories/alice/items/skin-01'), { itemDefinitionId: 'skin-01', quantity: 1 });
    await setDoc(doc(db, 'progression/alice'), { level: 4, experience: 1200 });
    await setDoc(doc(db, 'seasons/season-01'), { status: 'active' });
    await setDoc(doc(db, 'matchSummaries/match-alice'), {
      participantUids: ['alice'],
      winnerUid: 'alice',
      resultVersion: 1
    });
    await setDoc(doc(db, 'matchSummaries/match-bob'), {
      participantUids: ['bob'],
      winnerUid: 'bob',
      resultVersion: 1
    });
    await setDoc(doc(db, 'reports/report-01'), {
      reporterUid: 'alice',
      targetUid: 'bob',
      category: 'cheating'
    });
    await setDoc(doc(db, 'auditEvents/event-01'), { actorUid: 'system', action: 'seed' });
  });
});

after(async () => {
  await environment.cleanup();
});

test('a player can read their own private account document', async () => {
  const db = environment.authenticatedContext('alice').firestore();
  await assertSucceeds(getDoc(doc(db, 'users/alice')));
});

test('a player cannot read another player private account document', async () => {
  const db = environment.authenticatedContext('alice').firestore();
  await assertFails(getDoc(doc(db, 'users/bob')));
});

test('clients cannot create or change protected account fields', async () => {
  const db = environment.authenticatedContext('alice').firestore();
  await assertFails(setDoc(doc(db, 'users/new-user'), { displayName: 'New User' }));
  await assertFails(updateDoc(doc(db, 'users/alice'), { accountStatus: 'banned' }));
});

test('authenticated clients can read a public profile but cannot modify it', async () => {
  const db = environment.authenticatedContext('bob').firestore();
  await assertSucceeds(getDoc(doc(db, 'playerProfiles/alice')));
  await assertFails(updateDoc(doc(db, 'playerProfiles/alice'), { level: 999 }));
});

test('private inventory and progression are readable only by their owner', async () => {
  const aliceDb = environment.authenticatedContext('alice').firestore();
  const bobDb = environment.authenticatedContext('bob').firestore();

  await assertSucceeds(getDoc(doc(aliceDb, 'inventories/alice/items/skin-01')));
  await assertFails(getDoc(doc(bobDb, 'inventories/alice/items/skin-01')));
  await assertSucceeds(getDoc(doc(aliceDb, 'progression/alice')));
  await assertFails(updateDoc(doc(aliceDb, 'progression/alice'), { experience: 999999 }));
});

test('clients cannot query match summaries without constraining the participant', async () => {
  const db = environment.authenticatedContext('alice').firestore();
  const broadQuery = query(collection(db, 'matchSummaries'), limit(20));
  await assertFails(getDocs(broadQuery));
});

test('a participant can query their own match summaries with a bounded query', async () => {
  const db = environment.authenticatedContext('alice').firestore();
  const ownMatches = query(
    collection(db, 'matchSummaries'),
    where('participantUids', 'array-contains', 'alice'),
    limit(20)
  );
  const result = await assertSucceeds(getDocs(ownMatches));
  assert.equal(result.size, 1);
  assert.equal(result.docs[0]?.id, 'match-alice');
});

test('clients cannot read or forge another player match result', async () => {
  const db = environment.authenticatedContext('alice').firestore();
  await assertFails(getDoc(doc(db, 'matchSummaries/match-bob')));
  await assertFails(setDoc(doc(db, 'matchSummaries/forged-match'), {
    participantUids: ['alice'],
    winnerUid: 'alice'
  }));
});

test('season configuration is readable but immutable by clients', async () => {
  const db = environment.authenticatedContext('alice').firestore();
  await assertSucceeds(getDoc(doc(db, 'seasons/season-01')));
  await assertFails(updateDoc(doc(db, 'seasons/season-01'), { status: 'modified-by-client' }));
});

test('reports and audit events remain inaccessible to clients', async () => {
  const db = environment.authenticatedContext('alice').firestore();
  await assertFails(getDoc(doc(db, 'reports/report-01')));
  await assertFails(setDoc(doc(db, 'reports/fake-report'), { category: 'cheating' }));
  await assertFails(getDoc(doc(db, 'auditEvents/event-01')));
});

test('all reads and writes are denied to unauthenticated clients', async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'seasons/season-01')));
  await assertFails(getDoc(doc(db, 'playerProfiles/alice')));
  await assertFails(setDoc(doc(db, 'users/anonymous'), { displayName: 'Anonymous' }));
});
