import "dotenv/config";
import { defineRoom, defineServer } from "colyseus";
import { FieldTestRoom } from "./rooms/FieldTestRoom.js";

if (process.env.NODE_ENV === "production") {
  throw new Error("The TSI Field Test server is local-development only; production startup is blocked.");
}

if (!process.env.FIREBASE_PROJECT_ID?.trim()) {
  throw new Error("Set FIREBASE_PROJECT_ID to the shared Firebase project or emulator project ID.");
}
if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error("Set FIREBASE_AUTH_EMULATOR_HOST for local development; do not use production Auth credentials in this test server.");
}
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error("Set FIRESTORE_EMULATOR_HOST for local development; do not write test profiles to production Firestore.");
}

const port = Number.parseInt(process.env.PORT ?? "2567", 10);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("PORT must be an integer between 1024 and 65535.");
}

const server = defineServer({
  rooms: {
    field_test: defineRoom(FieldTestRoom)
  }
});

await server.listen(port, "127.0.0.1");
console.log(`[TSI] Local Field Test server listening at ws://127.0.0.1:${port}`);
