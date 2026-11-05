import { Application, Color, Entity, StandardMaterial, Vec3 } from 'playcanvas';

export interface TargetDummy {
  root: Entity;
  spawn: Vec3;
  health: number;
  maxHealth: number;
  respawnAt: number;
}

export interface ArenaCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface ArenaScene {
  camera: Entity;
  player: Entity;
  targets: TargetDummy[];
  blockers: ArenaCollider[];
}

function makeMaterial(name: string, color: Color, emissive?: Color): StandardMaterial {
  const material = new StandardMaterial();
  material.name = name;
  material.diffuse = color;
  if (emissive) material.emissive = emissive;
  material.update();
  return material;
}

function addBox(
  parent: Entity,
  name: string,
  position: Vec3,
  scale: Vec3,
  material: StandardMaterial
): Entity {
  const entity = new Entity(name);
  entity.addComponent('render', { type: 'box', material });
  entity.setLocalPosition(position);
  entity.setLocalScale(scale);
  parent.addChild(entity);
  return entity;
}

function addSphere(
  parent: Entity,
  name: string,
  position: Vec3,
  scale: Vec3,
  material: StandardMaterial
): Entity {
  const entity = new Entity(name);
  entity.addComponent('render', { type: 'sphere', material });
  entity.setLocalPosition(position);
  entity.setLocalScale(scale);
  parent.addChild(entity);
  return entity;
}

function buildOperator(
  app: Application,
  name: string,
  position: Vec3,
  materials: Record<string, StandardMaterial>,
  isTarget = false
): Entity {
  const root = new Entity(name);
  root.setPosition(position);
  if (isTarget) root.setEulerAngles(0, 180, 0);
  app.root.addChild(root);

  addBox(root, 'torso', new Vec3(0, 1.28, 0), new Vec3(0.76, 0.92, 0.42), isTarget ? materials.target : materials.armor);
  addBox(root, 'chest-plate', new Vec3(0, 1.42, -0.225), new Vec3(0.54, 0.42, 0.055), isTarget ? materials.targetAccent : materials.orange);
  addSphere(root, 'head', new Vec3(0, 2.02, 0), new Vec3(0.36, 0.40, 0.34), materials.skin);
  addBox(root, 'helmet', new Vec3(0, 2.20, 0), new Vec3(0.42, 0.16, 0.40), materials.dark);
  addBox(root, 'left-arm', new Vec3(-0.48, 1.35, -0.02), new Vec3(0.22, 0.76, 0.24), materials.armor);
  addBox(root, 'right-arm', new Vec3(0.48, 1.35, -0.02), new Vec3(0.22, 0.76, 0.24), materials.armor);
  addBox(root, 'left-leg', new Vec3(-0.20, 0.48, 0), new Vec3(0.26, 0.78, 0.30), materials.dark);
  addBox(root, 'right-leg', new Vec3(0.20, 0.48, 0), new Vec3(0.26, 0.78, 0.30), materials.dark);
  addBox(root, 'rifle', new Vec3(0.25, 1.24, -0.48), new Vec3(0.14, 0.16, 1.05), materials.weapon);
  addBox(root, 'rifle-stock', new Vec3(0.25, 1.25, 0.06), new Vec3(0.16, 0.18, 0.28), materials.dark);
  return root;
}

export function buildArena(app: Application): ArenaScene {
  const materials = {
    ground: makeMaterial('Delta sand', new Color(0.35, 0.34, 0.27)),
    road: makeMaterial('Road asphalt', new Color(0.12, 0.16, 0.18)),
    concrete: makeMaterial('Weathered concrete', new Color(0.35, 0.40, 0.42)),
    concreteDark: makeMaterial('Dark concrete', new Color(0.16, 0.22, 0.25)),
    armor: makeMaterial('Operator armor', new Color(0.10, 0.22, 0.27)),
    orange: makeMaterial('TSI orange', new Color(0.96, 0.30, 0.12)),
    dark: makeMaterial('Operator dark gear', new Color(0.045, 0.075, 0.085)),
    skin: makeMaterial('Operator face', new Color(0.28, 0.17, 0.12)),
    weapon: makeMaterial('Weapon steel', new Color(0.10, 0.12, 0.13)),
    target: makeMaterial('Target red', new Color(0.48, 0.12, 0.09)),
    targetAccent: makeMaterial('Target marker', new Color(1.0, 0.48, 0.10)),
    beacon: makeMaterial('Beacon glow', new Color(0.12, 0.55, 0.62), new Color(0.08, 0.35, 0.42))
  };

  addBox(app.root, 'terrain', new Vec3(0, -0.55, 0), new Vec3(140, 1, 140), materials.ground);
  addBox(app.root, 'main-road', new Vec3(0, 0.015, -12), new Vec3(16, 0.035, 110), materials.road);
  addBox(app.root, 'cross-road', new Vec3(12, 0.02, -18), new Vec3(48, 0.04, 9), materials.road);

  // Low-rise training buildings and readable cover lanes.
  addBox(app.root, 'command-building', new Vec3(-22, 3.5, -22), new Vec3(16, 7, 18), materials.concrete);
  addBox(app.root, 'command-roof', new Vec3(-22, 7.15, -22), new Vec3(17, 0.35, 19), materials.concreteDark);
  addBox(app.root, 'warehouse', new Vec3(23, 4, -36), new Vec3(22, 8, 16), materials.concreteDark);
  addBox(app.root, 'warehouse-roof', new Vec3(23, 8.15, -36), new Vec3(23, 0.35, 17), materials.concrete);
  addBox(app.root, 'control-tower', new Vec3(39, 8, 2), new Vec3(7, 16, 7), materials.concrete);
  addBox(app.root, 'control-tower-cap', new Vec3(39, 16.2, 2), new Vec3(8, 0.5, 8), materials.orange);

  addBox(app.root, 'cover-west', new Vec3(-8, 1.1, -15), new Vec3(9, 2.2, 1.2), materials.concrete);
  addBox(app.root, 'cover-east', new Vec3(12, 1.1, -29), new Vec3(8, 2.2, 1.2), materials.concrete);
  addBox(app.root, 'cover-south', new Vec3(1, 1.0, 2), new Vec3(13, 2, 1.1), materials.concreteDark);
  addBox(app.root, 'crate-a', new Vec3(-15, 0.9, -5), new Vec3(2.2, 1.8, 2.2), materials.orange);
  addBox(app.root, 'crate-b', new Vec3(17, 0.8, -8), new Vec3(2.4, 1.6, 2.4), materials.concreteDark);
  addBox(app.root, 'crate-c', new Vec3(8, 0.7, -42), new Vec3(2.2, 1.4, 2.2), materials.orange);

  // Perimeter markers frame the playable training area.
  for (let i = -2; i <= 2; i += 1) {
    addBox(app.root, `west-marker-${i}`, new Vec3(-55, 1.6, i * 22), new Vec3(1, 3.2, 1), materials.concreteDark);
    addBox(app.root, `east-marker-${i}`, new Vec3(55, 1.6, i * 22), new Vec3(1, 3.2, 1), materials.concreteDark);
  }

  // The signature beacon is visual only in this first local sandbox.
  const beacon = new Entity('front-network-beacon');
  beacon.setPosition(0, 0, -32);
  app.root.addChild(beacon);
  const beaconStem = new Entity('beacon-stem');
  beaconStem.addComponent('render', { type: 'cylinder', material: materials.beacon });
  beaconStem.setLocalPosition(0, 2.0, 0);
  beaconStem.setLocalScale(0.35, 4, 0.35);
  beacon.addChild(beaconStem);
  const beaconHead = new Entity('beacon-head');
  beaconHead.addComponent('render', { type: 'sphere', material: materials.orange });
  beaconHead.setLocalPosition(0, 4.3, 0);
  beaconHead.setLocalScale(0.8, 0.8, 0.8);
  beacon.addChild(beaconHead);

  // Directional daylight and a low ambient fill keep silhouettes readable.
  const sun = new Entity('sun-light');
  sun.addComponent('light', {
    type: 'directional',
    color: new Color(1.0, 0.86, 0.72),
    intensity: 1.45,
    castShadows: false
  });
  sun.setEulerAngles(48, -32, 0);
  app.root.addChild(sun);
  app.scene.ambientLight = new Color(0.30, 0.34, 0.39);

  const camera = new Entity('third-person-camera');
  camera.addComponent('camera', {
    clearColor: new Color(0.36, 0.53, 0.62),
    fov: 68,
    nearClip: 0.1,
    farClip: 220
  });
  app.root.addChild(camera);

  const player = buildOperator(app, 'player-operator', new Vec3(0, 0, 12), materials);
  const targets: TargetDummy[] = [];
  const blockers: ArenaCollider[] = [
    { minX: -30, maxX: -14, minZ: -31, maxZ: -13 },
    { minX: 12, maxX: 34, minZ: -44, maxZ: -28 },
    { minX: 35, maxX: 43, minZ: -2, maxZ: 6 },
    { minX: -12.5, maxX: -3.5, minZ: -15.7, maxZ: -14.3 },
    { minX: 8, maxX: 16, minZ: -29.7, maxZ: -28.3 },
    { minX: -15.8, maxX: -14.2, minZ: -6.1, maxZ: -3.9 },
    { minX: 15.8, maxX: 18.2, minZ: -9.2, maxZ: -6.8 },
    { minX: 6.9, maxX: 9.1, minZ: -43.1, maxZ: -40.9 }
  ];
  const targetSpawns = [
    new Vec3(-8, 0, -20),
    new Vec3(8, 0, -25),
    new Vec3(0, 0, -45),
    new Vec3(26, 0, -18)
  ];

  targetSpawns.forEach((spawn, index) => {
    const root = buildOperator(app, `training-target-${index + 1}`, spawn, materials, true);
    targets.push({ root, spawn: spawn.clone(), health: 100, maxHealth: 100, respawnAt: 0 });
  });

  return { camera, player, targets, blockers };
}
