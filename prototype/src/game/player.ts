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
  updateAnimation(deltaTime: number, moving: boolean, sprinting: boolean): void;
  triggerShot(): void;
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

  // Hierarchical limb pivots: feet, knee pads and forearms now follow the gait.
  const armLeft = new pc.Entity('arm-left-pivot');
  armLeft.setLocalPosition(-0.43, 1.48, -0.02);
  root.addChild(armLeft);
  part(armLeft, 'upper-arm-left', 'capsule', new pc.Vec3(0, -0.27, 0), new pc.Vec3(0.2, 0.56, 0.2), armor);
  part(armLeft, 'forearm-left', 'capsule', new pc.Vec3(0, -0.62, -0.015), new pc.Vec3(0.17, 0.38, 0.18), fabric);
  part(armLeft, 'elbow-pad-left', 'box', new pc.Vec3(0, -0.43, -0.14), new pc.Vec3(0.21, 0.18, 0.08), dark);
  part(armLeft, 'forearm-guard-left', 'box', new pc.Vec3(0, -0.62, -0.14), new pc.Vec3(0.18, 0.2, 0.07), dark);
  part(armLeft, 'glove-left', 'sphere', new pc.Vec3(0, -0.86, -0.06), new pc.Vec3(0.19, 0.15, 0.18), rubber);

  const armRight = new pc.Entity('arm-right-pivot');
  armRight.setLocalPosition(0.43, 1.48, -0.02);
  root.addChild(armRight);
  part(armRight, 'upper-arm-right', 'capsule', new pc.Vec3(0, -0.27, 0), new pc.Vec3(0.2, 0.56, 0.2), armor);
  part(armRight, 'forearm-right', 'capsule', new pc.Vec3(0, -0.62, -0.015), new pc.Vec3(0.17, 0.38, 0.18), fabric);
  part(armRight, 'elbow-pad-right', 'box', new pc.Vec3(0, -0.43, -0.14), new pc.Vec3(0.21, 0.18, 0.08), dark);
  part(armRight, 'forearm-guard-right', 'box', new pc.Vec3(0, -0.62, -0.14), new pc.Vec3(0.18, 0.2, 0.07), dark);
  part(armRight, 'glove-right', 'sphere', new pc.Vec3(0, -0.86, -0.06), new pc.Vec3(0.19, 0.15, 0.18), rubber);

  const legLeft = new pc.Entity('leg-left-pivot');
  legLeft.setLocalPosition(-0.18, 0.78, 0);
  root.addChild(legLeft);
  part(legLeft, 'thigh-left', 'capsule', new pc.Vec3(0, -0.31, 0), new pc.Vec3(0.24, 0.68, 0.25), fabric);
  part(legLeft, 'knee-pad-left', 'box', new pc.Vec3(0, -0.39, -0.17), new pc.Vec3(0.24, 0.18, 0.1), armor);
  part(legLeft, 'shin-left', 'capsule', new pc.Vec3(0, -0.68, 0), new pc.Vec3(0.19, 0.48, 0.2), fabric);
  part(legLeft, 'boot-left', 'box', new pc.Vec3(0, -0.68, -0.08), new pc.Vec3(0.28, 0.2, 0.42), rubber);

  const legRight = new pc.Entity('leg-right-pivot');
  legRight.setLocalPosition(0.18, 0.78, 0);
  root.addChild(legRight);
  part(legRight, 'thigh-right', 'capsule', new pc.Vec3(0, -0.31, 0), new pc.Vec3(0.24, 0.68, 0.25), fabric);
  part(legRight, 'knee-pad-right', 'box', new pc.Vec3(0, -0.39, -0.17), new pc.Vec3(0.24, 0.18, 0.1), armor);
  part(legRight, 'shin-right', 'capsule', new pc.Vec3(0, -0.68, 0), new pc.Vec3(0.19, 0.48, 0.2), fabric);
  part(legRight, 'boot-right', 'box', new pc.Vec3(0, -0.68, -0.08), new pc.Vec3(0.28, 0.2, 0.42), rubber);

  // Head pivot carries the helmet, face protection and communications gear.
  const headPivot = new pc.Entity('head-pivot');
  headPivot.setLocalPosition(0, 1.82, 0);
  root.addChild(headPivot);
  part(headPivot, 'neck', 'cylinder', new pc.Vec3(0, -0.100, 0), new pc.Vec3(0.18, 0.16, 0.18), fabric);
  part(headPivot, 'head', 'sphere', new pc.Vec3(0, 0.120, 0), new pc.Vec3(0.42, 0.48, 0.4), fabric);
  part(headPivot, 'helmet-shell', 'sphere', new pc.Vec3(0, 0.300, 0.015), new pc.Vec3(0.48, 0.34, 0.46), helmet);
  part(headPivot, 'helmet-front-ridge', 'box', new pc.Vec3(0, 0.350, -0.36), new pc.Vec3(0.28, 0.07, 0.08), dark);
  part(headPivot, 'visor-strip', 'box', new pc.Vec3(0, 0.170, -0.2), new pc.Vec3(0.36, 0.08, 0.035), visor);
  part(headPivot, 'visor-left-light', 'sphere', new pc.Vec3(-0.11, 0.180, -0.226), new pc.Vec3(0.055, 0.055, 0.025), glass);
  part(headPivot, 'visor-right-light', 'sphere', new pc.Vec3(0.11, 0.180, -0.226), new pc.Vec3(0.055, 0.055, 0.025), glass);
  part(headPivot, 'earpiece-left', 'cylinder', new pc.Vec3(-0.23, 0.150, 0), new pc.Vec3(0.09, 0.08, 0.08), dark);
  part(headPivot, 'earpiece-right', 'cylinder', new pc.Vec3(0.23, 0.150, 0), new pc.Vec3(0.09, 0.08, 0.08), dark);

  // Layered field equipment: webbing, shoulder straps, pouches and utility gear.
  const webbing = makeMaterial(new pc.Color(0.16, 0.2, 0.18), 0.02, 0.96);
  const canvas = makeMaterial(new pc.Color(0.29, 0.32, 0.25), 0.01, 0.98);
  const buckle = makeMaterial(new pc.Color(0.42, 0.44, 0.39), 0.72, 0.36);
  const lens = makeMaterial(new pc.Color(0.025, 0.16, 0.19), 0.78, 0.16);

  // MOLLE-style front pouches and belt kit.
  for (let index = 0; index < 4; index += 1) {
    const x = -0.24 + index * 0.16;
    part(root, `front-mag-pouch-${index + 1}`, 'box', new pc.Vec3(x, 1.04, -0.31), new pc.Vec3(0.135, 0.22, 0.13), webbing);
    part(root, `front-pouch-flap-${index + 1}`, 'box', new pc.Vec3(x, 1.16, -0.325), new pc.Vec3(0.13, 0.045, 0.14), canvas);
    part(root, `front-pouch-tab-${index + 1}`, 'box', new pc.Vec3(x, 1.13, -0.401), new pc.Vec3(0.035, 0.035, 0.018), buckle);
  }
  for (const side of [-1, 1]) {
    part(root, `shoulder-harness-${side}`, 'box', new pc.Vec3(side * 0.23, 1.52, -0.255), new pc.Vec3(0.105, 0.48, 0.075), webbing).setLocalEulerAngles(0, 0, side * -12);
    part(root, `side-utility-pouch-${side}`, 'box', new pc.Vec3(side * 0.34, 0.77, 0.03), new pc.Vec3(0.18, 0.25, 0.24), canvas);
    part(root, `thigh-drop-pouch-${side}`, 'box', new pc.Vec3(side * 0.2, 0.57, -0.17), new pc.Vec3(0.19, 0.2, 0.12), webbing);
    part(root, `boot-ankle-strap-${side}`, 'box', new pc.Vec3(side * 0.18, 0.16, -0.08), new pc.Vec3(0.29, 0.055, 0.43), webbing);

  }
  part(root, 'rear-pack-main', 'box', new pc.Vec3(0, 1.38, 0.34), new pc.Vec3(0.48, 0.56, 0.3), canvas);
  part(root, 'rear-pack-top', 'sphere', new pc.Vec3(0, 1.68, 0.35), new pc.Vec3(0.43, 0.22, 0.28), webbing);
  part(root, 'rear-pack-front-pocket', 'box', new pc.Vec3(0, 1.28, 0.51), new pc.Vec3(0.34, 0.25, 0.08), webbing);
  part(root, 'radio-screen', 'box', new pc.Vec3(-0.3, 1.28, -0.31), new pc.Vec3(0.11, 0.14, 0.025), dark);
  part(root, 'flag-patch-border', 'box', new pc.Vec3(0.4, 1.49, -0.16), new pc.Vec3(0.14, 0.17, 0.025), dark);
  part(root, 'flag-patch-color', 'box', new pc.Vec3(0.4, 1.49, -0.178), new pc.Vec3(0.105, 0.12, 0.012), orange);
  part(root, 'helmet-side-rail-left', 'box', new pc.Vec3(-0.35, 2.11, 0.02), new pc.Vec3(0.12, 0.055, 0.28), dark);
  part(root, 'helmet-side-rail-right', 'box', new pc.Vec3(0.35, 2.11, 0.02), new pc.Vec3(0.12, 0.055, 0.28), dark);
  part(root, 'night-vision-mount', 'box', new pc.Vec3(0, 2.18, -0.29), new pc.Vec3(0.16, 0.12, 0.13), buckle);
  part(root, 'goggle-left', 'box', new pc.Vec3(-0.105, 2.0, -0.222), new pc.Vec3(0.14, 0.105, 0.055), lens);
  part(root, 'goggle-right', 'box', new pc.Vec3(0.105, 2.0, -0.222), new pc.Vec3(0.14, 0.105, 0.055), lens);
  part(root, 'chin-strap', 'box', new pc.Vec3(0, 1.83, -0.17), new pc.Vec3(0.3, 0.045, 0.045), webbing);
  part(root, 'neck-gaiter', 'cylinder', new pc.Vec3(0, 1.77, 0), new pc.Vec3(0.23, 0.17, 0.23), dark);

  // AR-01 rifle blockout with sight, magazine, stock, handguard and muzzle.
  const weapon = new pc.Entity('ar-01-rifle');
  const weaponRest = new pc.Vec3(0.28, 1.27, -0.46);
  weapon.setLocalPosition(weaponRest);
  root.addChild(weapon);
  part(weapon, 'receiver', 'box', new pc.Vec3(0, 0, 0), new pc.Vec3(0.17, 0.16, 0.62), dark);
  part(weapon, 'upper-receiver', 'box', new pc.Vec3(0, 0.075, -0.04), new pc.Vec3(0.16, 0.055, 0.5), metal);
  part(weapon, 'barrel', 'cylinder', new pc.Vec3(0, 0.015, -0.42), new pc.Vec3(0.045, 0.38, 0.045), helmet).setLocalEulerAngles(90, 0, 0);
  part(weapon, 'muzzle-device', 'cylinder', new pc.Vec3(0, 0.015, -0.68), new pc.Vec3(0.065, 0.12, 0.065), metal).setLocalEulerAngles(90, 0, 0);
  part(weapon, 'handguard', 'box', new pc.Vec3(0, 0, -0.26), new pc.Vec3(0.14, 0.13, 0.34), armor);
  part(weapon, 'stock', 'box', new pc.Vec3(0, 0.005, 0.38), new pc.Vec3(0.13, 0.17, 0.32), dark);
  part(weapon, 'magazine', 'box', new pc.Vec3(0, -0.16, 0.04), new pc.Vec3(0.1, 0.28, 0.16), dark);
  part(weapon, 'magazine-base', 'box', new pc.Vec3(0, -0.31, 0.04), new pc.Vec3(0.12, 0.05, 0.18), metal);
  part(weapon, 'optic-mount', 'box', new pc.Vec3(0, 0.13, -0.02), new pc.Vec3(0.14, 0.035, 0.2), dark);
  part(weapon, 'optic', 'box', new pc.Vec3(0, 0.21, -0.02), new pc.Vec3(0.1, 0.12, 0.13), orange);
  part(weapon, 'optic-glass', 'box', new pc.Vec3(0, 0.215, -0.091), new pc.Vec3(0.07, 0.07, 0.015), glass);
  part(weapon, 'foregrip', 'box', new pc.Vec3(0, -0.12, -0.23), new pc.Vec3(0.09, 0.22, 0.1), rubber);

  const muzzleFlash = part(weapon, 'muzzle-flash', 'sphere', new pc.Vec3(0, 0.015, -0.78), new pc.Vec3(0.16, 0.16, 0.28), orange);
  muzzleFlash.enabled = false;

  let animationTime = 0;
  let muzzleTimer = 0;
  let recoil = 0;

  return {
    root,
    weapon,
    triggerShot() {
      muzzleTimer = 0.055;
      recoil = 1;
      muzzleFlash.enabled = true;
    },
    updateAnimation(deltaTime, moving, sprinting) {
      animationTime += deltaTime;
      const rate = sprinting ? 13.5 : 9.5;
      const amplitude = moving ? (sprinting ? 0.48 : 0.3) : 0.025;
      const swing = Math.sin(animationTime * rate) * amplitude;
      legLeft.setLocalEulerAngles(swing * 38, 0, swing * 3);
      legRight.setLocalEulerAngles(-swing * 38, 0, -swing * 3);
      // Arms counterbalance the legs; the rifle arm stays tighter while running.
      armLeft.setLocalEulerAngles(-swing * (sprinting ? 20 : 14), 0, -5);
      armRight.setLocalEulerAngles(swing * (sprinting ? 8 : 5), 0, 5);
      headPivot.setLocalEulerAngles(moving ? -swing * 1.2 : Math.sin(animationTime * 1.1) * 0.7, 0, moving ? -swing * 0.8 : 0);
      const bob = moving ? Math.abs(Math.sin(animationTime * rate)) * (sprinting ? 0.055 : 0.032) : Math.sin(animationTime * 1.8) * 0.008;
      weapon.setLocalPosition(weaponRest.x, weaponRest.y + bob, weaponRest.z + recoil * 0.075);
      recoil = Math.max(0, recoil - deltaTime * 7.5);
      muzzleTimer = Math.max(0, muzzleTimer - deltaTime);
      if (muzzleTimer === 0) muzzleFlash.enabled = false;
    }
  };
}

/** Detailed remote soldier variant for networked players; final skinned GLB will replace this blockout. */
export function createRemotePlayer(app: pc.Application, playerId: string): pc.Entity {
  const root = new pc.Entity(`remote-operator-${playerId}`);
  let hash = 0;
  for (let index = 0; index < playerId.length; index += 1) hash = (hash * 31 + playerId.charCodeAt(index)) >>> 0;
  const palettes = [
    { cloth: new pc.Color(0.23, 0.29, 0.24), armor: new pc.Color(0.12, 0.18, 0.16), accent: new pc.Color(0.76, 0.34, 0.1) },
    { cloth: new pc.Color(0.34, 0.31, 0.23), armor: new pc.Color(0.19, 0.18, 0.13), accent: new pc.Color(0.78, 0.64, 0.28) },
    { cloth: new pc.Color(0.19, 0.25, 0.3), armor: new pc.Color(0.09, 0.14, 0.2), accent: new pc.Color(0.26, 0.62, 0.72) },
    { cloth: new pc.Color(0.31, 0.27, 0.22), armor: new pc.Color(0.17, 0.15, 0.12), accent: new pc.Color(0.69, 0.43, 0.18) }
  ];
  const palette = palettes[hash % palettes.length];
  const cloth = makeMaterial(palette.cloth, 0.02, 0.96);
  const armor = makeMaterial(palette.armor, 0.28, 0.66);
  const accent = makeMaterial(palette.accent, 0.18, 0.5);
  const dark = makeMaterial(new pc.Color(0.025, 0.035, 0.038), 0.38, 0.68);
  const metal = makeMaterial(new pc.Color(0.32, 0.36, 0.35), 0.72, 0.4);

  // Torso, plate carrier and layered magazine pouches.
  part(root, 'remote-torso', 'capsule', new pc.Vec3(0, 1.15, 0), new pc.Vec3(0.62, 0.95, 0.36), cloth);
  part(root, 'remote-plate-carrier', 'box', new pc.Vec3(0, 1.28, -0.19), new pc.Vec3(0.57, 0.53, 0.14), armor);
  part(root, 'remote-belt', 'box', new pc.Vec3(0, 0.82, 0), new pc.Vec3(0.66, 0.13, 0.4), dark);
  for (let index = 0; index < 3; index += 1) {
    const x = -0.2 + index * 0.2;
    part(root, `remote-mag-pouch-${index}`, 'box', new pc.Vec3(x, 1.08, -0.29), new pc.Vec3(0.16, 0.22, 0.12), dark);
    part(root, `remote-pouch-flap-${index}`, 'box', new pc.Vec3(x, 1.2, -0.3), new pc.Vec3(0.15, 0.05, 0.13), cloth);
  }
  part(root, 'remote-backpack', 'box', new pc.Vec3(0, 1.35, 0.32), new pc.Vec3(0.46, 0.56, 0.28), armor);
  part(root, 'remote-pack-roll', 'sphere', new pc.Vec3(0, 1.66, 0.34), new pc.Vec3(0.4, 0.18, 0.25), cloth);

  // Helmet, face protection, communications and shoulder identification.
  part(root, 'remote-head', 'sphere', new pc.Vec3(0, 1.92, 0), new pc.Vec3(0.42, 0.46, 0.4), cloth);
  part(root, 'remote-balaclava', 'sphere', new pc.Vec3(0, 1.89, -0.1), new pc.Vec3(0.35, 0.34, 0.32), dark);
  part(root, 'remote-helmet', 'sphere', new pc.Vec3(0, 2.1, 0), new pc.Vec3(0.48, 0.32, 0.45), armor);
  part(root, 'remote-goggles', 'box', new pc.Vec3(0, 2.0, -0.205), new pc.Vec3(0.36, 0.1, 0.055), accent);
  part(root, 'remote-ear-protection', 'cylinder', new pc.Vec3(-0.23, 1.98, 0), new pc.Vec3(0.1, 0.1, 0.1), dark);
  part(root, 'remote-radio-antenna', 'cylinder', new pc.Vec3(0.21, 1.68, 0.32), new pc.Vec3(0.018, 0.36, 0.018), metal);
  part(root, 'remote-shoulder-patch', 'box', new pc.Vec3(0.39, 1.48, -0.15), new pc.Vec3(0.14, 0.16, 0.035), accent);

  // Arms, gloves, elbow guards, trousers, knee pads and boots.
  for (const side of [-1, 1]) {
    part(root, `remote-arm-${side}`, 'capsule', new pc.Vec3(side * 0.43, 1.08, -0.01), new pc.Vec3(0.2, 0.57, 0.2), cloth);
    part(root, `remote-shoulder-pad-${side}`, 'sphere', new pc.Vec3(side * 0.42, 1.46, 0), new pc.Vec3(0.29, 0.25, 0.28), armor);
    part(root, `remote-elbow-pad-${side}`, 'box', new pc.Vec3(side * 0.44, 0.98, -0.13), new pc.Vec3(0.2, 0.18, 0.1), dark);
    part(root, `remote-glove-${side}`, 'sphere', new pc.Vec3(side * 0.44, 0.76, -0.04), new pc.Vec3(0.18, 0.15, 0.18), dark);
    part(root, `remote-leg-${side}`, 'capsule', new pc.Vec3(side * 0.18, 0.43, 0), new pc.Vec3(0.24, 0.68, 0.25), cloth);
    part(root, `remote-knee-pad-${side}`, 'box', new pc.Vec3(side * 0.18, 0.4, -0.16), new pc.Vec3(0.24, 0.18, 0.1), armor);
    part(root, `remote-boot-${side}`, 'box', new pc.Vec3(side * 0.18, 0.12, -0.08), new pc.Vec3(0.29, 0.2, 0.42), dark);
    part(root, `remote-thigh-pouch-${side}`, 'box', new pc.Vec3(side * 0.2, 0.59, -0.16), new pc.Vec3(0.17, 0.2, 0.11), armor);
  }

  root.setPosition(0, 0.04, 0);
  app.root.addChild(root);
  return root;
}
