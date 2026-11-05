import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyFirebasePlayerToken } from '../src/firebaseAuth.js';

test('rejects undersized Firebase ID tokens before initializing Admin credentials', async () => {
  await assert.rejects(
    verifyFirebasePlayerToken('not-a-token'),
    /Invalid Firebase ID token length/
  );
});

test('rejects oversized Firebase ID tokens before initializing Admin credentials', async () => {
  await assert.rejects(
    verifyFirebasePlayerToken('x'.repeat(8193)),
    /Invalid Firebase ID token length/
  );
});
