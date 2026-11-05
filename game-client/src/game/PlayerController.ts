import { Application, Vec3 } from 'playcanvas';
import type { ArenaScene, TargetDummy } from './arena';

export interface HUDPort {
  setAmmo(current: number, reserve: number): void;
  setStats(kills: number, accuracy: number, status: string): void;
  showToast(message: string): void;
}

export class PlayerController {
  private readonly keys = new Set<string>();
  private readonly canvas: HTMLCanvasElement;
  private readonly joystick: HTMLElement | null;
  private readonly joystickKnob: HTMLElement | null;
  private readonly fireButton: HTMLButtonElement | null;
  private readonly reloadButton: HTMLButtonElement | null;
  private readonly app: Application;
  private readonly scene: ArenaScene;
  private readonly hud: HUDPort;

  private yaw = 0;
  private pitch = 8;
  private touchX = 0;
  private touchY = 0;
  private joystickPointer: number | null = null;
  private joystickCenter = { x: 0, y: 0 };
  private firing = false;
  private ammo = 30;
  private reserve = 120;
  private kills = 0;
  private shots = 0;
  private hits = 0;
  private fireCooldown = 0;
  private reloadTimer = 0;
  private elapsed = 0;
  private disposed = false;

  constructor(app: Application, scene: ArenaScene, canvas: HTMLCanvasElement, hud: HUDPort) {
    this.app = app;
    this.scene = scene;
    this.canvas = canvas;
    this.hud = hud;
    this.joystick = document.getElementById('joystick');
    this.joystickKnob = document.getElementById('joystick-knob');
    this.fireButton = document.getElementById('fire-button') as HTMLButtonElement | null;
    this.reloadButton = document.getElementById('reload-button') as HTMLButtonElement | null;

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    canvas.addEventListener('pointerdown', this.onCanvasPointerDown);
    window.addEventListener('pointerup', this.onGlobalPointerUp);
    this.joystick?.addEventListener('pointerdown', this.onJoystickDown);
    window.addEventListener('pointermove', this.onJoystickMove);
    window.addEventListener('pointerup', this.onJoystickUp);
    this.fireButton?.addEventListener('pointerdown', this.onFireDown);
    this.fireButton?.addEventListener('pointerup', this.onFireUp);
    this.fireButton?.addEventListener('pointercancel', this.onFireUp);
    this.reloadButton?.addEventListener('click', this.reload);
    canvas.addEventListener('contextmenu', this.preventContextMenu);

    this.hud.setAmmo(this.ammo, this.reserve);
    this.hud.setStats(this.kills, 0, 'PRÊT');
    this.app.on('update', this.update);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code);
    if (event.code === 'KeyR' && !event.repeat) this.reload();
    if (event.code === 'Escape') this.firing = false;
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private onBlur = (): void => {
    this.keys.clear();
    this.firing = false;
    this.touchX = 0;
    this.touchY = 0;
    this.updateJoystickVisual();
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (document.pointerLockElement !== this.canvas) return;
    this.yaw -= event.movementX * 0.12;
    this.pitch = Math.max(-18, Math.min(25, this.pitch + event.movementY * 0.08));
  };

  private onPointerLockChange = (): void => {
    if (document.pointerLockElement !== this.canvas) this.firing = false;
  };

  private onCanvasPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    if (matchMedia('(pointer:fine)').matches && document.pointerLockElement !== this.canvas) {
      void this.canvas.requestPointerLock?.();
    }
    this.firing = true;
  };

  private onGlobalPointerUp = (): void => {
    if (this.joystickPointer === null) this.firing = false;
  };

  private onJoystickDown = (event: PointerEvent): void => {
    if (!this.joystick) return;
    event.preventDefault();
    this.joystickPointer = event.pointerId;
    const rect = this.joystick.getBoundingClientRect();
    this.joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    this.joystick.setPointerCapture?.(event.pointerId);
    this.setJoystick(event.clientX, event.clientY);
  };

  private onJoystickMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.joystickPointer) return;
    this.setJoystick(event.clientX, event.clientY);
  };

  private onJoystickUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.joystickPointer) return;
    this.joystickPointer = null;
    this.touchX = 0;
    this.touchY = 0;
    this.updateJoystickVisual();
  };

  private setJoystick(clientX: number, clientY: number): void {
    const dx = clientX - this.joystickCenter.x;
    const dy = clientY - this.joystickCenter.y;
    const max = 39;
    const length = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, max / length);
    this.touchX = (dx * scale) / max;
    this.touchY = (dy * scale) / max;
    this.updateJoystickVisual(dx * scale, dy * scale);
  }

  private updateJoystickVisual(dx = this.touchX * 39, dy = this.touchY * 39): void {
    if (!this.joystickKnob) return;
    this.joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  private onFireDown = (event: PointerEvent): void => {
    event.preventDefault();
    this.firing = true;
    this.fireButton?.setPointerCapture?.(event.pointerId);
  };

  private onFireUp = (): void => {
    this.firing = false;
  };

  private preventContextMenu = (event: Event): void => event.preventDefault();

  private reload = (): void => {
    if (this.reloadTimer > 0 || this.ammo >= 30 || this.reserve <= 0) return;
    this.reloadTimer = 1.45;
    this.firing = false;
    this.hud.setStats(this.kills, this.getAccuracy(), 'RECHARGEMENT');
    this.hud.showToast('RECHARGEMENT EN COURS');
  };

  private getAccuracy(): number {
    return this.shots === 0 ? 0 : Math.round((this.hits / this.shots) * 100);
  }

  private tryFire(): void {
    if (this.reloadTimer > 0 || this.fireCooldown > 0) return;
    if (this.ammo <= 0) {
      this.reload();
      return;
    }

    this.ammo -= 1;
    this.shots += 1;
    this.fireCooldown = 0.135;

    const origin = this.scene.camera.getPosition().clone();
    const direction = this.scene.camera.forward.clone().normalize();
    let closestTarget: TargetDummy | null = null;
    let closestDistance = 90;

    for (const target of this.scene.targets) {
      if (!target.root.enabled) continue;
      const center = target.root.getPosition().clone().add(new Vec3(0, 1.35, 0));
      const toCenter = center.clone().sub(origin);
      const distanceAlongRay = toCenter.dot(direction);
      if (distanceAlongRay <= 0 || distanceAlongRay > closestDistance) continue;
      const nearestPoint = origin.clone().add(direction.clone().mulScalar(distanceAlongRay));
      if (nearestPoint.distance(center) <= 0.95) {
        closestDistance = distanceAlongRay;
        closestTarget = target;
      }
    }

    if (closestTarget) {
      this.hits += 1;
      closestTarget.health = Math.max(0, closestTarget.health - 34);
      this.hud.showToast(closestTarget.health === 0 ? 'CIBLE ÉLIMINÉE' : 'IMPACT CONFIRMÉ');
      if (closestTarget.health === 0) {
        closestTarget.root.enabled = false;
        closestTarget.respawnAt = this.elapsed + 3.2;
        this.kills += 1;
      }
    }

    this.hud.setAmmo(this.ammo, this.reserve);
    this.hud.setStats(this.kills, this.getAccuracy(), 'ENGAGEMENT');
  }

  private update = (dt: number): void => {
    if (this.disposed) return;
    const delta = Math.min(dt, 0.05);
    this.elapsed += delta;
    this.fireCooldown = Math.max(0, this.fireCooldown - delta);

    if (this.reloadTimer > 0) {
      this.reloadTimer = Math.max(0, this.reloadTimer - delta);
      if (this.reloadTimer === 0) {
        const needed = 30 - this.ammo;
        const loaded = Math.min(needed, this.reserve);
        this.ammo += loaded;
        this.reserve -= loaded;
        this.hud.setAmmo(this.ammo, this.reserve);
        this.hud.setStats(this.kills, this.getAccuracy(), 'PRÊT');
        this.hud.showToast('ARME RECHARGÉE');
      }
    }

    this.updateMovement(delta);
    if (this.firing || this.keys.has('Space')) this.tryFire();

    for (const target of this.scene.targets) {
      if (!target.root.enabled && target.respawnAt > 0 && this.elapsed >= target.respawnAt) {
        target.health = target.maxHealth;
        target.respawnAt = 0;
        target.root.setPosition(target.spawn);
        target.root.enabled = true;
      }
    }
  };

  private updateMovement(dt: number): void {
    const forwardInput =
      (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
      (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) -
      this.touchY;
    const strafeInput =
      (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
      (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0) +
      this.touchX;

    const magnitude = Math.hypot(forwardInput, strafeInput);
    if (magnitude > 0.01) {
      const forward = forwardInput / Math.max(1, magnitude);
      const strafe = strafeInput / Math.max(1, magnitude);
      const yawRadians = (this.yaw * Math.PI) / 180;
      const forwardX = Math.sin(yawRadians);
      const forwardZ = -Math.cos(yawRadians);
      const rightX = Math.cos(yawRadians);
      const rightZ = Math.sin(yawRadians);
      const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 1.35 : 1;
      const speed = 7.2 * sprint * dt;
      const position = this.scene.player.getPosition();
      const x = Math.max(-48, Math.min(48, position.x + (forwardX * forward + rightX * strafe) * speed));
      const z = Math.max(-55, Math.min(55, position.z + (forwardZ * forward + rightZ * strafe) * speed));
      this.scene.player.setPosition(x, 0, z);
      this.scene.player.setEulerAngles(0, this.yaw, 0);
    }

    const position = this.scene.player.getPosition();
    const yawRadians = (this.yaw * Math.PI) / 180;
    const forwardX = Math.sin(yawRadians);
    const forwardZ = -Math.cos(yawRadians);
    const cameraX = position.x - forwardX * 6.6;
    const cameraZ = position.z - forwardZ * 6.6;
    this.scene.camera.setPosition(cameraX, position.y + 3.1 + this.pitch * 0.025, cameraZ);
    this.scene.camera.lookAt(
      position.x + forwardX * 2.6,
      position.y + 1.35 - this.pitch * 0.025,
      position.z + forwardZ * 2.6
    );
  }

  destroy(): void {
    this.disposed = true;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.canvas.removeEventListener('pointerdown', this.onCanvasPointerDown);
    window.removeEventListener('pointerup', this.onGlobalPointerUp);
    this.joystick?.removeEventListener('pointerdown', this.onJoystickDown);
    window.removeEventListener('pointermove', this.onJoystickMove);
    window.removeEventListener('pointerup', this.onJoystickUp);
    this.fireButton?.removeEventListener('pointerdown', this.onFireDown);
    this.fireButton?.removeEventListener('pointerup', this.onFireUp);
    this.fireButton?.removeEventListener('pointercancel', this.onFireUp);
    this.reloadButton?.removeEventListener('click', this.reload);
    this.canvas.removeEventListener('contextmenu', this.preventContextMenu);
    this.app.off('update', this.update);
  }
}
