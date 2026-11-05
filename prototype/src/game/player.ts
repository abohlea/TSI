import * as pc from 'playcanvas';

function makeMaterial(color: pc.Color, metalness = 0.1, roughness = 0.72, emissive?: pc.Color): pc.StandardMaterial {
  const material = new pc.StandardMaterial();
  material.diffuse = color;
  material.metalness = metalness;
  material.gloss = 1 - roughness;
  if (emissive) material.emissive = emissive;
  material.update();
  return material;
}

function part(
  parent: pc.Entity,
  name: string,
  type: 'box' | 'capsule' | 'cylinder' | 'sphere',
  position: pc.Vec3,
  scale: pc.Vec3,
  material: pc.StandardMaterial
): pc.Entity {
  const entity = new pc.Entity(name);
  entity.addComponent('render', { type, material, castShadows: true, receiveShadows: true });
  entity.setLocalPosition(position);
  entity.setLocalScale(scale);
  parent.addChild(entity);
  return entity;
}

export interface PlayerRig {
  root: pc.Entity;
  weapon: pc.Entity;
  setCameraMode(camera: pc.Entity, firstPerson: boolean): void;
  updateAnimation(deltaTime: number, moving: boolean, sprinting: boolean): void;
  triggerShot(): void;
  playReload(): void;
  playHit(): void;
}

export function createPlayer(app: pc.Application): PlayerRig {
  const root = new pc.Entity('tsi-player-root');
  root.setPosition(0, 0.04, 4);
  app.root.addChild(root);

  const armor = makeMaterial(new pc.Color(0.12, 0.19, 0.22), 0.34, 0.58);
  const fabric = makeMaterial(new pc.Color(0.23, 0.29, 0.27), 0.03, 0.94);
  const helmet = makeMaterial(new pc.Color(0.075, 0.11, 0.13), 0.48, 0.42);
  const visor = makeMaterial(new pc.Color(0.05, 0.42, 0.49), 0.62, 0.25);
  const orange = makeMaterial(new pc.Color(1, 0.29, 0.055), 0.25, 0.42, new pc.Color(0.25, 0.055, 0.008));
  const dark = makeMaterial(new pc.Color(0.035, 0.045, 0.05), 0.62, 0.38);
  const rubber = makeMaterial(new pc.Color(0.018, 0.025, 0.028), 0.04, 0.98);
  const glass = makeMaterial(new pc.Color(0.045, 0.32, 0.39), 0.72, 0.2);
  const metal = makeMaterial(new pc.Color(0.32, 0.37, 0.38), 0.8, 0.32);

  // Torso and armored silhouette.
  part(root, 'torso', 'capsule', new pc.Vec3(0, 1.18, 0), new pc.Vec3(0.62, 0.95, 0.36), armor);
  part(root, 'chest-plate', 'box', new pc.Vec3(0, 1.28, -0.19), new pc.Vec3(0.54, 0.42, 0.12), fabric);
  part(root, 'upper-chest-armor', 'box', new pc.Vec3(0, 1.52, -0.18), new pc.Vec3(0.5, 0.17, 0.1), armor);
  part(root, 'utility-belt', 'box', new pc.Vec3(0, 0.82, -0.03), new pc.Vec3(0.62, 0.14, 0.4), dark);
  part(root, 'chest-pouch-left', 'box', new pc.Vec3(-0.2, 1.18, -0.285), new pc.Vec3(0.15, 0.19, 0.09), dark);
  part(root, 'chest-pouch-right', 'box', new pc.Vec3(0.2, 1.18, -0.285), new pc.Vec3(0.15, 0.19, 0.09), dark);
  part(root, 'radio-pack', 'box', new pc.Vec3(0, 1.35, 0.27), new pc.Vec3(0.42, 0.55, 0.2), dark);
  part(root, 'radio-antenna', 'cylinder', new pc.Vec3(0.19, 1.72, 0.3), new pc.Vec3(0.025, 0.38, 0.025), metal);
  part(root, 'shoulder-left', 'sphere', new pc.Vec3(-0.39, 1.48, 0), new pc.Vec3(0.28, 0.28, 0.28), fabric);
  part(root, 'shoulder-right', 'sphere', new pc.Vec3(0.39, 1.48, 0), new pc.Vec3(0.28, 0.28, 0.28), fabric);
  part(root, 'shoulder-mark', 'box', new pc.Vec3(0.4, 1.49, -0.13), new pc.Vec3(0.12, 0.15, 0.045), orange);
  part(root, 'belt-tool', 'box', new pc.Vec3(-0.34, 0.78, -0.02), new pc.Vec3(0.1, 0.22, 0.12), metal);

  // Articulated blockout limbs; pivots allow a first procedural run cycle.
  const armLeft = part(root, 'arm-left', 'capsule', new pc.Vec3(-0.43, 1.08, -0.02), new pc.Vec3(0.2, 0.56, 0.2), armor);
  const armRight = part(root, 'arm-right', 'capsule', new pc.Vec3(0.43, 1.08, -0.02), new pc.Vec3(0.2, 0.56, 0.2), armor);
  const legLeft = part(root, 'leg-left', 'capsule', new pc.Vec3(-0.18, 0.45, 0), new pc.Vec3(0.24, 0.68, 0.25), fabric);
  const legRight = part(root, 'leg-right', 'capsule', new pc.Vec3(0.18, 0.45, 0), new pc.Vec3(0.24, 0.68, 0.25), fabric);
  part(root, 'knee-pad-left', 'box', new pc.Vec3(-0.18, 0.39, -0.17), new pc.Vec3(0.24, 0.18, 0.1), armor);
  part(root, 'knee-pad-right', 'box', new pc.Vec3(0.18, 0.39, -0.17), new pc.Vec3(0.24, 0.18, 0.1), armor);
  part(root, 'boot-left', 'box', new pc.Vec3(-0.18, 0.12, -0.08), new pc.Vec3(0.28, 0.2, 0.42), rubber);
  part(root, 'boot-right', 'box', new pc.Vec3(0.18, 0.12, -0.08), new pc.Vec3(0.28, 0.2, 0.42), rubber);
  part(root, 'forearm-guard-left', 'box', new pc.Vec3(-0.44, 0.95, -0.14), new pc.Vec3(0.19, 0.22, 0.08), dark);
  part(root, 'forearm-guard-right', 'box', new pc.Vec3(0.44, 0.95, -0.14), new pc.Vec3(0.19, 0.22, 0.08), dark);

  // Head, helmet, visor and communications equipment.
  part(root, 'neck', 'cylinder', new pc.Vec3(0, 1.72, 0), new pc.Vec3(0.18, 0.16, 0.18), fabric);
  part(root, 'head', 'sphere', new pc.Vec3(0, 1.94, 0), new pc.Vec3(0.42, 0.48, 0.4), fabric);
  part(root, 'helmet-shell', 'sphere', new pc.Vec3(0, 2.12, 0.015), new pc.Vec3(0.48, 0.34, 0.46), helmet);
  part(root, 'helmet-front-ridge', 'box', new pc.Vec3(0, 2.17, -0.36), new pc.Vec3(0.28, 0.07, 0.08), dark);
  part(root, 'visor-strip', 'box', new pc.Vec3(0, 1.99, -0.2), new pc.Vec3(0.36, 0.08, 0.035), visor);
  part(root, 'visor-left-light', 'sphere', new pc.Vec3(-0.11, 2.0, -0.226), new pc.Vec3(0.055, 0.055, 0.025), glass);
  part(root, 'visor-right-light', 'sphere', new pc.Vec3(0.11, 2.0, -0.226), new pc.Vec3(0.055, 0.055, 0.025), glass);
  part(root, 'earpiece-left', 'cylinder', new pc.Vec3(-0.23, 1.97, 0), new pc.Vec3(0.09, 0.08, 0.08), dark);
  part(root, 'earpiece-right', 'cylinder', new pc.Vec3(0.23, 1.97, 0), new pc.Vec3(0.09, 0.08, 0.08), dark);

  // AR-01 rifle blockout with sight, magazine, stock, handguard and muzzle.
  const weapon = new pc.Entity('ar-01-rifle');
  const weaponRest = new pc.Vec3(0.28, 1.27, -0.46);
  const weaponFpsRest = new pc.Vec3(0.24, -0.27, -0.58);
  let firstPersonView = false;
  weapon.setLocalPosition(weaponRest);
  root.addChild(weapon);
  part(weapon, 'receiver', 'box', new pc.Vec3(0, 0, 0), new pc.Vec3(0.17, 0.16, 0.62), dark);
  part(weapon, 'upper-receiver', 'box', new pc.Vec3(0, 0.075, -0.04), new pc.Vec3(0.16, 0.055, 0.5), metal);
  part(weapon, 'barrel', 'cylinder', new pc.Vec3(0, 0.015, -0.42), new pc.Vec3(0.045, 0.38, 0.045), helmet).setLocalEulerAngles(90, 0, 0);
  part(weapon, 'muzzle-device', 'cylinder', new pc.Vec3(0, 0.015, -0.68), new pc.Vec3(0.065, 0.12, 0.065), metal).setLocalEulerAngles(90, 0, 0);
  part(weapon, 'handguard', 'box', new pc.Vec3(0, 0, -0.26), new pc.Vec3(0.14, 0.13, 0.34), armor);
  // Side armor plates, cooling ribs and a segmented top rail improve silhouette readability.
  for (const side of [-1, 1]) {
    part(weapon, `receiver-side-plate-${side}`, 'box', new pc.Vec3(side * 0.086, 0.005, -0.015), new pc.Vec3(0.012, 0.105, 0.34), metal);
    for (let index = 0; index < 5; index += 1) {
      part(weapon, `handguard-vent-${side}-${index}`, 'box', new pc.Vec3(side * 0.075, 0.008, -0.17 - index * 0.045), new pc.Vec3(0.008, 0.055, 0.018), dark);
    }
  }
  for (let index = 0; index < 7; index += 1) {
    part(weapon, `top-rail-notch-${index}`, 'box', new pc.Vec3(0, 0.105, -0.21 + index * 0.045), new pc.Vec3(0.075, 0.012, 0.012), metal);
  }
  part(weapon, 'stock', 'box', new pc.Vec3(0, 0.005, 0.38), new pc.Vec3(0.13, 0.17, 0.32), dark);
  const magazine = part(weapon, 'magazine', 'box', new pc.Vec3(0, -0.16, 0.04), new pc.Vec3(0.1, 0.28, 0.16), dark);
  const magazineBase = part(weapon, 'magazine-base', 'box', new pc.Vec3(0, -0.31, 0.04), new pc.Vec3(0.12, 0.05, 0.18), metal);
  for (let index = 0; index < 4; index += 1) {
    part(weapon, `magazine-rib-${index}`, 'box', new pc.Vec3(0, -0.105, -0.025 + index * 0.045), new pc.Vec3(0.105, 0.008, 0.012), metal);
  }
  part(weapon, 'optic-mount', 'box', new pc.Vec3(0, 0.13, -0.02), new pc.Vec3(0.14, 0.035, 0.2), dark);
  part(weapon, 'optic', 'box', new pc.Vec3(0, 0.21, -0.02), new pc.Vec3(0.1, 0.12, 0.13), orange);
  part(weapon, 'optic-glass', 'box', new pc.Vec3(0, 0.215, -0.091), new pc.Vec3(0.07, 0.07, 0.015), glass);
  part(weapon, 'foregrip', 'box', new pc.Vec3(0, -0.12, -0.23), new pc.Vec3(0.09, 0.22, 0.1), rubber);
  part(weapon, 'charging-handle', 'box', new pc.Vec3(0.095, 0.085, 0.105), new pc.Vec3(0.045, 0.025, 0.11), metal);
  part(weapon, 'selector-mark', 'box', new pc.Vec3(0.095, 0.015, 0.045), new pc.Vec3(0.012, 0.025, 0.055), orange);
  part(weapon, 'muzzle-ring', 'cylinder', new pc.Vec3(0, 0.015, -0.72), new pc.Vec3(0.073, 0.035, 0.073), orange).setLocalEulerAngles(90, 0, 0);

  const muzzleFlash = part(weapon, 'muzzle-flash', 'sphere', new pc.Vec3(0, 0.015, -0.78), new pc.Vec3(0.16, 0.16, 0.28), orange);
  muzzleFlash.enabled = false;

  let animationTime = 0;
  let muzzleTimer = 0;
  let recoil = 0;
  let reloadTime = 0;
  let hitTime = 0;
  const magazineRest = magazine.getLocalPosition().clone();
  const magazineBaseRest = magazineBase.getLocalPosition().clone();
  const chargingHandle = weapon.findByName('charging-handle') as pc.Entity;
  const magazineRotation = magazine.getLocalEulerAngles().clone();
  const weaponRestRotation = new pc.Vec3(0, 0, 0);

  return {
    root,
    weapon,
    setCameraMode(cameraEntity, firstPerson) {
      firstPersonView = firstPerson;
      if (firstPerson) {
        weapon.reparent(cameraEntity);
        weapon.setLocalPosition(weaponFpsRest);
        weapon.setLocalEulerAngles(-1.5, -2.5, 0);
      } else {
        weapon.reparent(root);
        weapon.setLocalPosition(weaponRest);
        weapon.setLocalEulerAngles(weaponRestRotation);
      }
    },
    triggerShot() {
      muzzleTimer = 0.055;
      recoil = 1;
      muzzleFlash.enabled = true;
    },
    playReload() {
      reloadTime = 1.25;
    },
    playHit() {
      hitTime = 0.35;
    },
    updateAnimation(deltaTime, moving, sprinting) {
      animationTime += deltaTime;
      reloadTime = Math.max(0, reloadTime - deltaTime);
      hitTime = Math.max(0, hitTime - deltaTime);
      const reloadProgress = reloadTime > 0 ? 1 - reloadTime / 1.25 : 0;
      // Three readable reload beats: lower/remove, seat, then settle. This is a
      // procedural placeholder until authored AR01_Reload animation data exists.
      const remove = Math.sin(Math.min(1, reloadProgress / 0.42) * Math.PI * 0.5);
      const insert = reloadProgress >= 0.58
        ? Math.sin(Math.min(1, (reloadProgress - 0.58) / 0.28) * Math.PI * 0.5) : 0;
      const magazineOffset = reloadProgress < 0.42
        ? -remove * 0.28
        : reloadProgress < 0.58 ? -0.28 : -0.28 * (1 - insert);
      magazine.setLocalPosition(magazineRest.x, magazineRest.y + magazineOffset, magazineRest.z);
      magazineBase.setLocalPosition(magazineBaseRest.x, magazineBaseRest.y + magazineOffset, magazineBaseRest.z);
      magazine.setLocalEulerAngles(magazineRotation.x + remove * 12, magazineRotation.y, magazineRotation.z);
      magazineBase.setLocalEulerAngles(remove * 12, 0, 0);
      if (chargingHandle) chargingHandle.setLocalPosition(0.095, 0.085, 0.105 + (reloadTime > 0 && reloadProgress > 0.84 ? 0.045 : 0));
      const rate = sprinting ? 13.5 : 9.5;
      const amplitude = moving ? (sprinting ? 0.48 : 0.3) : 0.025;
      const swing = Math.sin(animationTime * rate) * amplitude;
      legLeft.setLocalEulerAngles(swing * 38, 0, 0);
      legRight.setLocalEulerAngles(-swing * 38, 0, 0);
      const hitFlinch = hitTime > 0 ? Math.sin((hitTime / 0.35) * Math.PI) : 0;
      armLeft.setLocalEulerAngles(-swing * 13 - hitFlinch * 18, 0, -5);
      armRight.setLocalEulerAngles(swing * 13 - hitFlinch * 18, 0, 5);
      const bob = moving ? Math.abs(Math.sin(animationTime * rate)) * (sprinting ? 0.055 : 0.032) : Math.sin(animationTime * 1.8) * 0.008;
      const rest = firstPersonView ? weaponFpsRest : weaponRest;
      weapon.setLocalPosition(rest.x, rest.y + bob * (firstPersonView ? 0.55 : 1), rest.z + recoil * (firstPersonView ? 0.11 : 0.075));
      weapon.setLocalEulerAngles(-1.5 - recoil * 3.2, -2.5, Math.sin(animationTime * rate) * (moving ? 0.8 : 0.12));
      recoil = Math.max(0, recoil - deltaTime * 7.5);
      muzzleTimer = Math.max(0, muzzleTimer - deltaTime);
      if (muzzleTimer === 0) muzzleFlash.enabled = false;
    }
  };
}

/** Simple remote silhouette for the first local network test. Not a final character asset. */
export function createRemotePlayer(app: pc.Application, playerId: string): pc.Entity {
  const root = new pc.Entity(`remote-operator-${playerId}`);
  const armor = makeMaterial(new pc.Color(0.075, 0.32, 0.36), 0.25, 0.62);
  const trim = makeMaterial(new pc.Color(1, 0.38, 0.08), 0.12, 0.45);
  const dark = makeMaterial(new pc.Color(0.025, 0.055, 0.065), 0.4, 0.55);

  part(root, 'remote-torso', 'capsule', new pc.Vec3(0, 1.15, 0), new pc.Vec3(0.62, 0.95, 0.36), armor);
  part(root, 'remote-head', 'sphere', new pc.Vec3(0, 1.92, 0), new pc.Vec3(0.42, 0.46, 0.4), dark);
  part(root, 'remote-helmet', 'sphere', new pc.Vec3(0, 2.1, 0), new pc.Vec3(0.47, 0.32, 0.45), trim);
  part(root, 'remote-leg-left', 'capsule', new pc.Vec3(-0.18, 0.42, 0), new pc.Vec3(0.23, 0.68, 0.24), dark);
  part(root, 'remote-leg-right', 'capsule', new pc.Vec3(0.18, 0.42, 0), new pc.Vec3(0.23, 0.68, 0.24), dark);
  root.setPosition(0, 0.04, 0);
  app.root.addChild(root);
  return root;
}
