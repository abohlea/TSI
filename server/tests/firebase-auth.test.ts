import assert from "node:assert/strict";
import test from "node:test";
import {
  parseRoomAuthOptions,
  sanitizePlayerDisplayName
} from "../src/firebase/adminAuth.js";

test("room authentication accepts a bounded Firebase ID token and a display name", () => {
  const options = parseRoomAuthOptions({
    idToken: "x".repeat(500),
    displayName: "Delta Operator"
  });

  assert.deepEqual(options, {
    idToken: "x".repeat(500),
    displayName: "Delta Operator"
  });
});

test("room authentication rejects malformed, missing and oversized tokens", () => {
  assert.equal(parseRoomAuthOptions(null), null);
  assert.equal(parseRoomAuthOptions({ idToken: "short" }), null);
  assert.equal(parseRoomAuthOptions({ idToken: "x".repeat(12_001) }), null);
  assert.equal(parseRoomAuthOptions({ idToken: "x".repeat(500), displayName: "x".repeat(65) }), null);
});

test("display names are normalized, bounded and stripped of markup", () => {
  assert.equal(sanitizePlayerDisplayName("  Alpha <script>  "), "Alpha script");
  assert.equal(sanitizePlayerDisplayName("  Éclaireur  "), "Éclaireur");
  assert.equal(sanitizePlayerDisplayName("!!!"), "OPERATOR");
  assert.equal(sanitizePlayerDisplayName("ABCDEFGHIJKLMNOPQRST"), "ABCDEFGHIJKLMNOP");
});
