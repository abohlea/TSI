import { defineRoom, defineServer } from "colyseus";
import { FieldTestRoom } from "./rooms/FieldTestRoom.js";

if (process.env.NODE_ENV === "production") {
  throw new Error("The TSI Field Test server is local-development only; production startup is blocked.");
}

const token = process.env.TSI_LOCAL_DEV_TOKEN;
if (!token || token.length < 24) {
  throw new Error("Set TSI_LOCAL_DEV_TOKEN to a private random value of at least 24 characters.");
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
