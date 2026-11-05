import { MapSchema, Schema, type } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string") displayName = "OPERATOR";
  @type("number") x = 0;
  @type("number") z = 0;
  @type("number") yaw = 0;
  @type("number") health = 100;
  @type("number") ammo = 30;
  @type("number") reserveAmmo = 120;
  @type("number") eliminations = 0;
}

export class TargetState extends Schema {
  @type("number") id = 0;
  @type("number") x = 0;
  @type("number") z = 0;
  @type("number") health = 100;
  @type("boolean") active = true;
}

export class FieldTestState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: TargetState }) targets = new MapSchema<TargetState>();
  @type("number") elapsedSeconds = 0;
}
