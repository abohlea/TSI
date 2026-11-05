import * as pc from 'playcanvas';

function makeMaterial(color: pc.Color, metalness = 0.1, roughness = 0.72): pc.StandardMaterial {
  const material = new pc.StandardMaterial();
  material.diffuse = color;
  material.metalness = metalness;
  material.roughness = roughness;
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
}

export function createPlayer(app: pc.Application): PlayerRig {
  const root = new pc.Entity('tsi-player-root');
  root.setPosition(0, 0.04, 4);
  app.root.addChild(root);

  const armor = makeMaterial(new pc.Color(0.12, 0.19, 0.22), 0.34, 0.58);
  const fabric = makeMaterial(new pc.Color(0.23, 0.29, 0.27), 0.03, 0.94);
  const helmet = makeMaterial(new pc.Color(0.075, 0.11, 0.13), 0.48, 0.42);
  const visor = makeMaterial(new pc.Color(0.05, 0.42, 0.49), 0.62, 0.25);
  const orange = makeMaterial(new pc.Color(1, 0.29, 0.055), 0.25, 0.42);
  const dark = makeMaterial(new pc.Color(0.035, 0.045, 0.05), 0.62, 0.38);

  part(root, 'torso', 'capsule', new pc.Vec3(0, 1.18, 0), new pc.Vec3(0.62, 0.95, 0.36), armor);
  part(root, 'chest-plate', 'box', new pc.Vec3(0, 1.28, -0.19), new pc.Vec3(0.54, 0.42, 0.12), fabric);
  part(root, 'shoulder-left', 'sphere', new pc.Vec3(-0.39, 1.48, 0), new pc.Vec3(0.28, 0.28, 0.28), fabric);
  part(root, 'shoulder-right', 'sphere', new pc.Vec3(0.39, 1.48, 0), new pc.Vec3(0.28, 0.28, 0.28), fabric);
  part(root, 'arm-left', 'capsule', new pc.Vec3(-0.43, 1.08, -0.02), new pc.Vec3(0.2, 0.56, 0.2), armor);
  part(root, 'arm-right', 'capsule', new pc.Vec3(0.43, 1.08, -0.02), new pc.Vec3(0.2, 0.56, 0.2), armor);
  part(root, 'leg-left', 'capsule', new pc.Vec3(-0.18, 0.45, 0), new pc.Vec3(0.24, 0.68, 0.25), fabric);
  part(root, 'leg-right', 'capsule', new pc.Vec3(0.18, 0.45, 0), new pc.Vec3(0.24, 0.68, 0.25), fabric);
  part(root, 'boot-left', 'box', new pc.Vec3(-0.18, 0.12, -0.08), new pc.Vec3(0.28, 0.2, 0.42), dark);
  part(root, 'boot-right', 'box', new pc.Vec3(0.18, 0.12, -0.08), new pc.Vec3(0.28, 0.2, 0.42), dark);
  part(root, 'neck', 'cylinder', new pc.Vec3(0, 1.72, 0), new pc.Vec3(0.18, 0.16, 0.18), fabric);
  part(root, 'head', 'sphere', new pc.Vec3(0, 1.94, 0), new pc.Vec3(0.42, 0.48, 0.4), fabric);
  part(root, 'helmet-shell', 'sphere', new pc.Vec3(0, 2.12, 0.015), new pc.Vec3(0.48, 0.34, 0.46), helmet);
  part(root, 'visor-strip', 'box', new pc.Vec3(0, 1.99, -0.2), new pc.Vec3(0.36, 0.08, 0.035), visor);
  part(root, 'shoulder-mark', 'box', new pc.Vec3(0.4, 1.49, -0.13), new pc.Vec3(0.12, 0.15, 0.045), orange);

  const weapon = new pc.Entity('ar-01-rifle');
  weapon.setLocalPosition(0.28, 1.27, -0.46);
  root.addChild(weapon);
  part(weapon, 'receiver', 'box', new pc.Vec3(0, 0, 0), new pc.Vec3(0.17, 0.16, 0.62), dark);
  part(weapon, 'barrel', 'cylinder', new pc.Vec3(0, 0.015, -0.42), new pc.Vec3(0.045, 0.38, 0.045), helmet).setLocalEulerAngles(90, 0, 0);
  part(weapon, 'handguard', 'box', new pc.Vec3(0, 0, -0.26), new pc.Vec3(0.14, 0.13, 0.34), armor);
  part(weapon, 'magazine', 'box', new pc.Vec3(0, -0.16, 0.04), new pc.Vec3(0.1, 0.28, 0.16), dark);
  part(weapon, 'optic', 'box', new pc.Vec3(0, 0.13, -0.02), new pc.Vec3(0.1, 0.1, 0.18), orange);

  return { root, weapon };
}
