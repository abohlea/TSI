import { Client, Callbacks, type Room } from "@colyseus/sdk";
import { Color, Entity, StandardMaterial } from "playcanvas";
import type { Application } from "playcanvas";
import type { ArenaScene } from "./arena";
import { FieldTestState } from "../network/FieldTestState";
import type { NetworkPort } from "./PlayerController";

interface ControllerPort {
  applyServerState(data: unknown): void;
  reconcileServerPosition(x: number, z: number, yaw: number): void;
}

interface FirebaseConnectionConfig {
  serverUrl: string;
  idToken: string;
  displayName: string;
}

function makeRemoteMaterial(color: Color): StandardMaterial {
  const material = new StandardMaterial();
  material.diffuse = color;
  material.update();
  return material;
}

export class TsiFieldTestConnection implements NetworkPort {
  private readonly app: Application;
  private readonly arena: ArenaScene;
  private readonly remotePlayers = new Map<string, Entity>();
  private room: Room<any, FieldTestState> | null = null;
  private sequence = 0;
  private controller: ControllerPort | null = null;

  constructor(app: Application, arena: ArenaScene) {
    this.app = app;
    this.arena = arena;
  }

  async connect(config: FirebaseConnectionConfig, controller: ControllerPort): Promise<void> {
    if (config.idToken.length < 100) {
      throw new Error("Le jeton Firebase ID est absent ou invalide.");
    }

    this.controller = controller;
    const client = new Client(config.serverUrl);
    const room = await client.joinOrCreate<FieldTestState>("field_test", {
      idToken: config.idToken,
      displayName: config.displayName
    });
    this.room = room;

    const callbacks = Callbacks.get(room);
    callbacks.onAdd("players", (player, sessionId) => {
      if (sessionId === room.sessionId) {
        this.controller?.reconcileServerPosition(player.x, player.z, player.yaw);
      } else {
        this.addRemotePlayer(sessionId, player.x, player.z, player.yaw);
      }
      callbacks.listen(player, "x", () => this.updatePlayerView(sessionId, player));
      callbacks.listen(player, "z", () => this.updatePlayerView(sessionId, player));
      callbacks.listen(player, "yaw", () => this.updatePlayerView(sessionId, player));
    });
    callbacks.onRemove("players", (_player, sessionId) => this.removeRemotePlayer(sessionId));

    callbacks.onAdd("targets", (target) => {
      this.applyTarget(target.id, target.x, target.z, target.health, target.active);
      callbacks.listen(target, "x", (value) => this.applyTarget(target.id, value, target.z, target.health, target.active));
      callbacks.listen(target, "z", (value) => this.applyTarget(target.id, target.x, value, target.health, target.active));
      callbacks.listen(target, "health", (value) => this.applyTarget(target.id, target.x, target.z, value, target.active));
      callbacks.listen(target, "active", (value) => this.applyTarget(target.id, target.x, target.z, target.health, value));
    });

    // Apply the initial synchronized state as well as subsequent callbacks.
    room.state.players.forEach((player, sessionId) => {
      if (sessionId === room.sessionId) {
        this.controller?.reconcileServerPosition(player.x, player.z, player.yaw);
      } else {
        this.addRemotePlayer(sessionId, player.x, player.z, player.yaw);
      }
    });
    room.state.targets.forEach((target) => {
      this.applyTarget(target.id, target.x, target.z, target.health, target.active);
    });

    room.onMessage("private", (message: unknown) => this.controller?.applyServerState(message));
    room.onError((_code, message) => console.error("[TSI] Colyseus room error:", message));
    room.onLeave(() => {
      this.room = null;
      this.removeAllRemotePlayers();
    });
  }

  sendInput(moveX: number, moveZ: number, yaw: number): void {
    if (!this.room) return;
    this.sequence += 1;
    this.room.send("input", {
      sequence: this.sequence,
      moveX,
      moveZ,
      yaw
    });
  }

  sendFire(): void {
    this.room?.send("fire");
  }

  sendReload(): void {
    this.room?.send("reload");
  }

  async disconnect(): Promise<void> {
    const current = this.room;
    this.room = null;
    this.removeAllRemotePlayers();
    if (current) await current.leave();
  }

  private addRemotePlayer(sessionId: string, x: number, z: number, yaw: number): void {
    if (this.remotePlayers.has(sessionId)) return;
    const root = new Entity(`remote-player-${sessionId}`);
    root.addComponent("render", { type: "capsule", material: makeRemoteMaterial(new Color(0.16, 0.30, 0.36)) });
    root.setLocalScale(0.75, 1.15, 0.75);
    root.setPosition(x, 1.0, z);
    root.setEulerAngles(0, yaw, 0);
    this.app.root.addChild(root);
    this.remotePlayers.set(sessionId, root);
  }

  private updatePlayerView(
    sessionId: string,
    player: { x: number; z: number; yaw: number }
  ): void {
    if (sessionId === this.room?.sessionId) {
      this.controller?.reconcileServerPosition(player.x, player.z, player.yaw);
      return;
    }
    const remote = this.remotePlayers.get(sessionId);
    if (!remote) {
      this.addRemotePlayer(sessionId, player.x, player.z, player.yaw);
      return;
    }
    remote.setPosition(player.x, 1.0, player.z);
    remote.setEulerAngles(0, player.yaw, 0);
  }

  private applyTarget(id: number, x: number, z: number, health: number, active: boolean): void {
    if (!Number.isInteger(id) || id < 1 || id > this.arena.targets.length) return;
    const target = this.arena.targets[id - 1];
    target.health = health;
    target.root.setPosition(x, 0, z);
    target.root.enabled = active;
  }

  private removeRemotePlayer(sessionId: string): void {
    const entity = this.remotePlayers.get(sessionId);
    if (entity) {
      entity.destroy();
      this.remotePlayers.delete(sessionId);
    }
  }

  private removeAllRemotePlayers(): void {
    for (const sessionId of this.remotePlayers.keys()) this.removeRemotePlayer(sessionId);
  }
}
