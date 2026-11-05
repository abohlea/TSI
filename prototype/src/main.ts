import * as pc from 'playcanvas';
import { createArena } from './game/arena';
import { resolvePracticeShot } from './game/combat';
import { GameInput } from './game/input';
import { createPlayer } from './game/player';
import { createHud } from './ui/hud';
import './style.css';

const canvasElement = document.querySelector<HTMLCanvasElement>('#application');
if (!canvasElement) throw new Error('Canvas #application introuvable.');
const canvas: HTMLCanvasElement = canvasElement;

const app = new pc.Application(canvas, {
  graphicsDeviceOptions: {
    antialias: true,
    alpha: false,
    depth: true,
    stencil: false,
    powerPreference: 'high-performance'
  }
});
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.scene.ambientLight = new pc.Color(0.34, 0.39, 0.43);

const camera = new pc.Entity('third-person-camera');
camera.addComponent('camera', {
  clearColor: new pc.Color(0.045, 0.075, 0.095),
  fov: 66,
  nearClip: 0.1,
  farClip: 260
});
app.root.addChild(camera);

const sun = new pc.Entity('training-sun');
sun.addComponent('light', {
  type: 'directional',
  color: new pc.Color(1, 0.82, 0.64),
  intensity: 1.7,
  castShadows: true,
  shadowResolution: 1024
});
sun.setEulerAngles(48, 32, 0);
app.root.addChild(sun);

const fill = new pc.Entity('cool-fill-light');
fill.addComponent('light', {
  type: 'directional',
  color: new pc.Color(0.48, 0.68, 0.82),
  intensity: 0.42,
  castShadows: false
});
fill.setEulerAngles(18, -145, 0);
app.root.addChild(fill);

const arena = createArena(app);
const player = createPlayer(app);
const input = new GameInput(canvas);
const hud = createHud();

const startOverlay = document.getElementById('start-overlay');
const startButton = document.getElementById('start-button');
const touchControls = document.getElementById('touch-controls');
const mobileLike = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820;
if (touchControls && mobileLike) touchControls.classList.add('active');

let active = false;
let yaw = 0;
let pitch = -7;
let ammo = 30;
let reserve = 90;
let kills = 0;
let shotCooldown = 0;
let reloadTimer = 0;
let fpsAccumulator = 0;
let fpsFrames = 0;
const playerRadius = 0.58;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isBlocked(x: number, z: number): boolean {
  if (x < -49 || x > 49 || z < -49 || z > 49) return true;
  return arena.obstacles.some((box) =>
    x > box.minX - playerRadius && x < box.maxX + playerRadius &&
    z > box.minZ - playerRadius && z < box.maxZ + playerRadius
  );
}

function aimPointForPlayer(): pc.Vec3 {
  const position = player.root.getPosition();
  const radians = yaw * Math.PI / 180;
  const forward = new pc.Vec3(-Math.sin(radians), Math.tan(pitch * Math.PI / 180), -Math.cos(radians));
  return position.clone().add(new pc.Vec3(0, 1.55, 0)).add(forward.mulScalar(80));
}

function reload(): void {
  if (reloadTimer > 0 || ammo === 30 || reserve <= 0) return;
  reloadTimer = 1.35;
  hud.toast('RECHARGEMENT…');
}

function fire(): void {
  if (reloadTimer > 0 || shotCooldown > 0) return;
  if (ammo <= 0) {
    hud.toast(reserve > 0 ? 'CHARGEUR VIDE · APPUIE SUR R' : 'PLUS DE MUNITIONS');
    shotCooldown = 0.3;
    return;
  }

  ammo -= 1;
  shotCooldown = 0.115;
  hud.setAmmo(ammo, reserve);
  const cameraPosition = camera.getPosition().clone();
  const direction = aimPointForPlayer().sub(cameraPosition).normalize();
  const shot = resolvePracticeShot(cameraPosition, direction, arena.targets, 34, 90);

  if (shot.hit) {
    hud.showHit();
    if (shot.eliminated) {
      kills += 1;
      hud.setScore(kills, arena.targets.length);
      hud.toast('CIBLE NEUTRALISÉE');
    }
  }
}

function updateTargets(now: number): void {
  for (const target of arena.targets) {
    if (!target.active && target.respawnAt > 0 && now >= target.respawnAt) {
      target.active = true;
      target.health = 100;
      target.respawnAt = 0;
      target.entity.enabled = true;
    }
  }
}

function setStarted(): void {
  active = true;
  startOverlay?.classList.add('hidden');
  if (!mobileLike) void canvas.requestPointerLock?.();
  hud.toast('TERRAIN ACTIF · BONNE CHANCE');
}
startButton?.addEventListener('click', setStarted);

app.on('update', (dt: number) => {
  shotCooldown = Math.max(0, shotCooldown - dt);
  if (reloadTimer > 0) {
    reloadTimer = Math.max(0, reloadTimer - dt);
    if (reloadTimer === 0) {
      const loaded = Math.min(30 - ammo, reserve);
      ammo += loaded;
      reserve -= loaded;
      hud.setAmmo(ammo, reserve);
      hud.toast('RECHARGEMENT TERMINÉ');
    }
  }
  updateTargets(performance.now());

  if (active) {
    const controls = input.read();
    yaw += controls.yawDelta;
    pitch = clamp(pitch + controls.pitchDelta, -27, 13);
    const radians = yaw * Math.PI / 180;
    const forwardX = -Math.sin(radians);
    const forwardZ = -Math.cos(radians);
    const rightX = Math.cos(radians);
    const rightZ = -Math.sin(radians);
    const moveX = rightX * controls.moveX + forwardX * controls.moveY;
    const moveZ = rightZ * controls.moveX + forwardZ * controls.moveY;
    const moveLength = Math.hypot(moveX, moveZ);
    const speed = controls.sprint ? 8.2 : 5.2;

    if (moveLength > 0.01) {
      const stepX = (moveX / moveLength) * speed * dt;
      const stepZ = (moveZ / moveLength) * speed * dt;
      const current = player.root.getPosition().clone();
      const nextX = current.x + stepX;
      const nextZ = current.z + stepZ;
      if (!isBlocked(nextX, current.z)) player.root.setPosition(nextX, current.y, current.z);
      const afterX = player.root.getPosition();
      if (!isBlocked(afterX.x, nextZ)) player.root.setPosition(afterX.x, current.y, nextZ);
    }
    player.root.setEulerAngles(0, yaw, 0);

    if (controls.reload) reload();
    if (controls.shoot) fire();
  }

  const position = player.root.getPosition();
  const radians = yaw * Math.PI / 180;
  const desiredCamera = new pc.Vec3(
    position.x + Math.sin(radians) * 5.5,
    position.y + 2.55,
    position.z + Math.cos(radians) * 5.5
  );
  const currentCamera = camera.getPosition().clone();
  const smoothedCamera = new pc.Vec3().lerp(currentCamera, desiredCamera, 1 - Math.exp(-8 * dt));
  camera.setPosition(smoothedCamera);
  camera.lookAt(aimPointForPlayer());

  fpsAccumulator += dt;
  fpsFrames += 1;
  if (fpsAccumulator >= 0.5) {
    hud.setFps(fpsFrames / fpsAccumulator);
    fpsAccumulator = 0;
    fpsFrames = 0;
  }
});

window.addEventListener('beforeunload', () => input.destroy(), { once: true });
app.start();
