import * as pc from 'playcanvas';
import { createArena } from './game/arena';
import { resolvePracticeShot } from './game/combat';
import { GameInput } from './game/input';
import { createPlayer, createRemotePlayer } from './game/player';
import { TsiNetworkClient, type NetworkSnapshot } from './game/network';
import { getFirebaseIdToken, hasFirebaseUser, isFirebaseConfigured, signInWithGoogle } from './game/firebase';
import { uploadPlayerAvatar } from './game/playerMedia';
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
const network = new TsiNetworkClient();

const startOverlay = document.getElementById('start-overlay');
const startButton = document.getElementById('start-button');
const connectButton = document.getElementById('connect-button') as HTMLButtonElement | null;
const firebaseLoginButton = document.getElementById('firebase-login-button') as HTMLButtonElement | null;
const avatarUploadButton = document.getElementById('avatar-upload-button') as HTMLButtonElement | null;
const avatarFileInput = document.getElementById('avatar-file-input') as HTMLInputElement | null;
const avatarPreview = document.getElementById('avatar-preview') as HTMLImageElement | null;
const connectionStatus = document.getElementById('connection-status');
const touchControls = document.getElementById('touch-controls');
const mobileLike = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820;
if (touchControls && mobileLike) touchControls.classList.add('active');

const serverUrl = import.meta.env.VITE_TSI_SERVER_URL ?? 'http://localhost:2567';
const localDevToken = import.meta.env.VITE_TSI_LOCAL_DEV_TOKEN ?? '';
if (firebaseLoginButton) firebaseLoginButton.disabled = !isFirebaseConfigured();
if (avatarUploadButton) avatarUploadButton.disabled = !isFirebaseConfigured() || !hasFirebaseUser();
if (connectButton && (!serverUrl || (localDevToken.length < 24 && !isFirebaseConfigured()))) {
  connectButton.disabled = true;
  if (connectionStatus) {
    connectionStatus.textContent = 'Serveur non configuré · voir prototype/.env.example';
  }
}

let active = false;
let yaw = 0;
let pitch = -2.4;
let ammo = 30;
let reserve = 90;
let kills = 0;
let shotCooldown = 0;
let reloadTimer = 0;
let fpsAccumulator = 0;
let fpsFrames = 0;
let networkSendAccumulator = 0;
let serverTargetPosition = { x: 0, z: 0 };
const playerRadius = 0.58;
const remotePlayers = new Map<string, { root: pc.Entity; targetX: number; targetZ: number; targetYaw: number }>();

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
  if (network.connected) {
    network.sendReload();
    hud.toast('DEMANDE DE RECHARGEMENT');
    return;
  }
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
  player.triggerShot();
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

function applyNetworkSnapshot(snapshot: NetworkSnapshot): void {
  const visibleRemoteIds = new Set<string>();

  for (const remote of snapshot.players) {
    if (remote.playerId === network.playerId) {
      serverTargetPosition = { x: remote.x, z: remote.z };
      player.root.enabled = remote.health > 0;
      continue;
    }
    visibleRemoteIds.add(remote.playerId);

    let view = remotePlayers.get(remote.playerId);
    if (!view) {
      const root = createRemotePlayer(app, remote.playerId);
      view = { root, targetX: remote.x, targetZ: remote.z, targetYaw: remote.yaw };
      remotePlayers.set(remote.playerId, view);
    }

    view.targetX = remote.x;
    view.targetZ = remote.z;
    view.targetYaw = remote.yaw;
    view.root.enabled = remote.health > 0;
  }

  for (const targetSnapshot of snapshot.targets) {
    const target = arena.targets.find((candidate) => candidate.targetId === targetSnapshot.targetId);
    if (!target) continue;
    target.health = targetSnapshot.health;
    target.active = targetSnapshot.active;
    target.entity.enabled = targetSnapshot.active;
    target.respawnAt = 0;
  }

  for (const [id, view] of remotePlayers) {
    if (visibleRemoteIds.has(id)) continue;
    view.root.destroy();
    remotePlayers.delete(id);
  }
}

function setStarted(): void {
  active = true;
  startOverlay?.classList.add('hidden');
  if (!mobileLike) void canvas.requestPointerLock?.();
  hud.toast(network.connected ? 'SESSION LOCALE CONNECTÉE' : 'TERRAIN LOCAL ACTIF');
}

startButton?.addEventListener('click', setStarted);

firebaseLoginButton?.addEventListener('click', async () => {
  if (!connectionStatus || !firebaseLoginButton) return;
  firebaseLoginButton.disabled = true;
  try {
    await signInWithGoogle();
    connectionStatus.textContent = 'Compte Firebase connecté · connexion au serveur…';
    if (avatarUploadButton) avatarUploadButton.disabled = false;
    connectButton?.click();
  } catch (error) {
    connectionStatus.textContent = error instanceof Error ? error.message : 'Connexion Firebase impossible.';
    firebaseLoginButton.disabled = false;
  }
});


avatarUploadButton?.addEventListener('click', () => {
  if (!hasFirebaseUser()) {
    if (connectionStatus) connectionStatus.textContent = 'Connecte-toi à Firebase avant de choisir un avatar.';
    return;
  }
  avatarFileInput?.click();
});

avatarFileInput?.addEventListener('change', async () => {
  const file = avatarFileInput.files?.[0];
  if (!file || !connectionStatus || !avatarUploadButton) return;
  avatarUploadButton.disabled = true;
  connectionStatus.textContent = 'Téléversement et vérification de l’avatar…';
  try {
    const avatar = await uploadPlayerAvatar(file, await getFirebaseIdToken());
    if (avatarPreview) {
      avatarPreview.src = avatar.secureUrl;
      avatarPreview.hidden = false;
    }
    connectionStatus.textContent = 'Avatar enregistré sur le profil Firebase.';
    hud.toast('AVATAR ENREGISTRÉ');
  } catch (error) {
    connectionStatus.textContent = error instanceof Error ? error.message : 'Échec du téléversement de l’avatar.';
  } finally {
    avatarUploadButton.disabled = !hasFirebaseUser();
    avatarFileInput.value = '';
  }
});

connectButton?.addEventListener('click', async () => {
  if (!connectionStatus || !connectButton) return;
  connectButton.disabled = true;

  try {
    await network.connect(serverUrl, localDevToken, {
      onStatus(message) {
        connectionStatus.textContent = message;
        if (!network.connected && message.startsWith('Connexion fermée')) {
          connectButton.disabled = false;
        }
      },
      onWelcome(_playerId, spawn) {
        serverTargetPosition = { x: spawn.x, z: spawn.z };
        player.root.setPosition(spawn.x, 0.04, spawn.z);
      },
      onSelf(state) {
        ammo = state.ammo;
        reserve = state.reserve;
        kills = state.score;
        hud.setAmmo(ammo, reserve);
        hud.setScore(kills, arena.targets.length);
      },
      onMatchState(state) {
        if (state.phase === 'countdown') hud.toast('MATCH DANS ' + Math.max(1, Math.ceil(state.remainingMs / 1000)) + ' s');
        else if (state.phase === 'active') hud.toast('MATCH LANCÉ · PREMIER À ' + state.scoreLimit);
      },
      onMatchEnded(state) {
        if (state.winnerUid && state.winnerUid === network.playerId) hud.toast('VICTOIRE · MATCH TERMINÉ');
        else if (state.winnerUid) hud.toast('MATCH TERMINÉ · VAINQUEUR : ' + state.winnerUid.slice(0, 8));
        else hud.toast('MATCH TERMINÉ · ÉGALITÉ');
      },
      onShot(result) {
        if (!result.accepted && result.reason === 'empty') {
          hud.toast('CHARGEUR VIDE · RECHARGE');
          return;
        }
        if (result.accepted) player.triggerShot();
        if (result.hit) hud.showHit();
        if (result.eliminated && result.targetPlayerId) hud.toast('OPÉRATEUR ÉLIMINÉ · VALIDÉ SERVEUR');
        else if (result.eliminated) hud.toast('CIBLE NEUTRALISÉE · VALIDÉE SERVEUR');
      },
      onSnapshot: applyNetworkSnapshot
    }, isFirebaseConfigured() && hasFirebaseUser() ? getFirebaseIdToken : undefined);
    setStarted();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur de connexion au serveur local.';
    connectionStatus.textContent = message;
    connectButton.disabled = false;
    if (firebaseLoginButton && isFirebaseConfigured()) firebaseLoginButton.disabled = false;
    hud.toast('CONNEXION AU SERVEUR IMPOSSIBLE');
  }
});

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

  let movingForAnimation = false;
  let sprintingForAnimation = false;
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
    const normalizedX = moveLength > 1 ? moveX / moveLength : moveX;
    const normalizedZ = moveLength > 1 ? moveZ / moveLength : moveZ;
    const speed = controls.sprint ? 8.2 : 5.2;
    movingForAnimation = moveLength > 0.01;
    sprintingForAnimation = controls.sprint;

    if (moveLength > 0.01) {
      const stepX = normalizedX * speed * dt;
      const stepZ = normalizedZ * speed * dt;
      const current = player.root.getPosition().clone();
      const nextX = current.x + stepX;
      const nextZ = current.z + stepZ;
      if (!isBlocked(nextX, current.z)) player.root.setPosition(nextX, current.y, current.z);
      const afterX = player.root.getPosition();
      if (!isBlocked(afterX.x, nextZ)) player.root.setPosition(afterX.x, current.y, nextZ);
    }
    player.root.setEulerAngles(0, yaw, 0);

    if (controls.reload) reload();
    if (controls.firePressed && network.connected) network.sendFire();
    if (controls.shoot && !network.connected) fire();

    if (network.connected) {
      networkSendAccumulator += dt;
      if (networkSendAccumulator >= 0.05) {
        network.sendInput({
          moveX: normalizedX,
          moveZ: normalizedZ,
          yaw,
          pitch,
          sprint: controls.sprint,
          shoot: controls.shoot
        });
        networkSendAccumulator %= 0.05;
      }
      const correction = 1 - Math.exp(-18 * dt);
      const currentPosition = player.root.getPosition();
      player.root.setPosition(
        currentPosition.x + (serverTargetPosition.x - currentPosition.x) * correction,
        currentPosition.y,
        currentPosition.z + (serverTargetPosition.z - currentPosition.z) * correction
      );
    }
  }

  player.updateAnimation(dt, movingForAnimation, sprintingForAnimation);
  const remoteBlend = 1 - Math.exp(-12 * dt);
  for (const view of remotePlayers.values()) {
    const current = view.root.getPosition();
    const nextX = current.x + (view.targetX - current.x) * remoteBlend;
    const nextZ = current.z + (view.targetZ - current.z) * remoteBlend;
    view.root.setPosition(nextX, 0.04, nextZ);
    view.root.setEulerAngles(0, view.targetYaw, 0);
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

window.addEventListener('beforeunload', () => {
  input.destroy();
  void network.disconnect();
}, { once: true });

app.start();
