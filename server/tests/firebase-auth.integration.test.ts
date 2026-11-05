import assert from "node:assert/strict";
import { after, test } from "node:test";
import { deleteApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { authenticateFirebasePlayer } from "../src/firebase/adminAuth.js";

const projectId = process.env.FIREBASE_PROJECT_ID;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;

test("Firebase Auth ID token provisions only server-owned Firestore documents", async () => {
  assert.equal(projectId, "demo-tsi-local", "Use the isolated demo Firebase project.");
  assert.ok(authHost, "FIREBASE_AUTH_EMULATOR_HOST must point to the Auth Emulator.");

  const response = await fetch(
    "http://" + authHost + "/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true })
    }
  );

  const signUp = await response.json() as {
    localId?: string;
    idToken?: string;
    error?: { message?: string };
  };

  assert.equal(response.ok, true, signUp.error?.message ?? "Auth Emulator anonymous sign-in failed.");
  assert.ok(signUp.localId);
  assert.ok(signUp.idToken);

  const identity = await authenticateFirebasePlayer(signUp.idToken, "TSI Test Ops");
  assert.equal(identity.uid, signUp.localId);
  assert.equal(identity.displayName, "TSI Test Ops");

  const app = getApps().find((candidate) => candidate.name === "tsi-server");
  assert.ok(app, "Firebase Admin app should be initialized by authentication.");
  const db = getFirestore(app);

  const [account, profile, progression] = await Promise.all([
    db.doc("users/" + identity.uid).get(),
    db.doc("playerProfiles/" + identity.uid).get(),
    db.doc("progression/" + identity.uid).get()
  ]);

  assert.equal(account.get("accountStatus"), "active");
  assert.equal(account.get("displayName"), "TSI Test Ops");
  assert.equal(profile.get("publicName"), "TSI Test Ops");
  assert.equal(profile.get("level"), 1);
  assert.equal(progression.get("level"), 1);
  assert.equal(progression.get("experience"), 0);
});

after(async () => {
  const app = getApps().find((candidate) => candidate.name === "tsi-server");
  if (app) await deleteApp(app);
});
