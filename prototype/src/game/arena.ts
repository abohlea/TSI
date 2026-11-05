import * as pc from 'playcanvas';

export interface ArenaObstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface PracticeTarget {
  targetId: string;
  entity: pc.Entity;
  health: number;
  active: boolean;
  respawnAt: number;
  readonly radius: number;
}

export interface ArenaApi {
  targets: PracticeTarget[];
  obstacles: ArenaObstacle[];
}

function material(color: pc.Color, options: { metalness?: number; roughness?: number; emissive?: pc.Color } = {}): pc.StandardMaterial {
  const result = new pc.StandardMaterial();
  result.diffuse = color;
  result.metalness = options.metalness ?? 0.05;
  result.gloss = 1 - (options.roughness ?? 0.82);
  if (options.emissive) result.emissive = options.emissive;
  result.update();
  return result;
}

function primitive(
  parent: pc.Entity,
  name: string,
  type: 'box' | 'capsule' | 'cylinder' | 'sphere' | 'plane',
  position: pc.Vec3,
  scale: pc.Vec3,
  surface: pc.StandardMaterial
): pc.Entity {
  const entity = new pc.Entity(name);
  entity.addComponent('render', { type, material: surface, castShadows: true, receiveShadows: true });
  entity.setLocalPosition(position);
  entity.setLocalScale(scale);
  parent.addChild(entity);
  return entity;
}

function createTarget(app: pc.Application, position: pc.Vec3, index: number, surfaces: Record<string, pc.StandardMaterial>): PracticeTarget {
  const root = new pc.Entity(`practice-target-${index + 1}`);
  root.setPosition(position);
  app.root.addChild(root);
  primitive(root, 'target-body', 'cylinder', new pc.Vec3(0, 0.95, 0), new pc.Vec3(0.5, 1.55, 0.5), surfaces.target);
  primitive(root, 'target-head', 'sphere', new pc.Vec3(0, 1.92, 0), new pc.Vec3(0.48, 0.48, 0.48), surfaces.accent);
  primitive(root, 'target-base', 'cylinder', new pc.Vec3(0, 0.12, 0), new pc.Vec3(0.9, 0.18, 0.9), surfaces.dark);
  return { targetId: `target-${index + 1}`, entity: root, health: 100, active: true, respawnAt: 0, radius: 0.95 };
}

export function createArena(app: pc.Application): ArenaApi {
  const ground = material(new pc.Color(0.17, 0.22, 0.21));
  const concrete = material(new pc.Color(0.29, 0.34, 0.34), { roughness: 0.94 });
  const dark = material(new pc.Color(0.055, 0.085, 0.095), { metalness: 0.35, roughness: 0.65 });
  const orange = material(new pc.Color(1, 0.34, 0.075), { metalness: 0.28, roughness: 0.42, emissive: new pc.Color(0.15, 0.025, 0.005) });
  const targetSurface = material(new pc.Color(0.16, 0.42, 0.48), { metalness: 0.42, roughness: 0.48 });
  const lane = material(new pc.Color(0.7, 0.72, 0.62));

  primitive(app.root, 'training-ground', 'box', new pc.Vec3(0, -0.35, -2), new pc.Vec3(110, 0.7, 110), ground);
  primitive(app.root, 'central-lane', 'box', new pc.Vec3(0, 0.012, -18), new pc.Vec3(16, 0.025, 58), lane);
  primitive(app.root, 'lane-mark-left', 'box', new pc.Vec3(-7.7, 0.025, -18), new pc.Vec3(0.15, 0.03, 58), orange);
  primitive(app.root, 'lane-mark-right', 'box', new pc.Vec3(7.7, 0.025, -18), new pc.Vec3(0.15, 0.03, 58), orange);

  const obstacles: ArenaObstacle[] = [];
  const buildings = [
    { x: -20, z: -12, w: 12, d: 16, h: 7 },
    { x: 20, z: -14, w: 13, d: 17, h: 9 },
    { x: -25, z: -39, w: 17, d: 12, h: 8 },
    { x: 26, z: -40, w: 16, d: 13, h: 10 },
    { x: -37, z: -4, w: 8, d: 18, h: 6 },
    { x: 37, z: -4, w: 8, d: 18, h: 6 }
  ];
  buildings.forEach((building, index) => {
    const root = new pc.Entity(`structure-${index + 1}`);
    root.setPosition(building.x, building.h / 2, building.z);
    app.root.addChild(root);
    primitive(root, 'building-mass', 'box', new pc.Vec3(0, 0, 0), new pc.Vec3(building.w, building.h, building.d), concrete);
    primitive(root, 'roof-trim', 'box', new pc.Vec3(0, building.h / 2 + 0.08, 0), new pc.Vec3(building.w + 0.25, 0.16, building.d + 0.25), dark);
    primitive(root, 'signal-panel', 'box', new pc.Vec3(0, 0.5, building.d / 2 + 0.035), new pc.Vec3(1.8, 0.7, 0.08), orange);
    // Facade details: recessed entrance, lintel, windows, sills and corner columns.
    const facade = material(new pc.Color(0.22, 0.27, 0.27), { roughness: 0.96 });
    const glass = material(new pc.Color(0.035, 0.17, 0.2), { metalness: 0.38, roughness: 0.28 });
    const trim = material(new pc.Color(0.43, 0.46, 0.42), { roughness: 0.88 });
    const doorWidth = Math.min(1.7, building.w * 0.22);
    primitive(root, 'entrance-door', 'box', new pc.Vec3(0, -building.h * 0.29, building.d / 2 + 0.055), new pc.Vec3(doorWidth, building.h * 0.42, 0.11), dark);
    primitive(root, 'entrance-lintel', 'box', new pc.Vec3(0, -building.h * 0.075, building.d / 2 + 0.08), new pc.Vec3(doorWidth + 0.28, 0.16, 0.16), trim);
    primitive(root, 'entrance-step', 'box', new pc.Vec3(0, -building.h / 2 + 0.08, building.d / 2 + 0.24), new pc.Vec3(doorWidth + 0.5, 0.16, 0.55), facade);
    const windowY = Math.min(building.h * 0.18, 1.55);
    for (const side of [-1, 1]) {
      const windowX = side * building.w * 0.29;
      primitive(root, `front-window-${side}`, 'box', new pc.Vec3(windowX, windowY, building.d / 2 + 0.045), new pc.Vec3(Math.min(1.55, building.w * 0.2), 1.15, 0.075), glass);
      primitive(root, `window-frame-${side}`, 'box', new pc.Vec3(windowX, windowY, building.d / 2 + 0.09), new pc.Vec3(Math.min(1.72, building.w * 0.22), 1.3, 0.055), trim);
      primitive(root, `window-sill-${side}`, 'box', new pc.Vec3(windowX, windowY - 0.68, building.d / 2 + 0.12), new pc.Vec3(Math.min(1.85, building.w * 0.24), 0.12, 0.2), facade);
      primitive(root, `corner-pillar-${side}`, 'box', new pc.Vec3(side * (building.w / 2 - 0.22), 0, building.d / 2 + 0.07), new pc.Vec3(0.28, building.h - 0.25, 0.18), facade);
    }
    primitive(root, 'roof-parapet-front', 'box', new pc.Vec3(0, building.h / 2 + 0.24, building.d / 2 - 0.08), new pc.Vec3(building.w + 0.2, 0.32, 0.24), facade);
    primitive(root, 'roof-vent', 'box', new pc.Vec3(building.w * 0.28, building.h / 2 + 0.22, 0), new pc.Vec3(1.1, 0.38, 0.85), dark);
    obstacles.push({
      minX: building.x - building.w / 2 - 0.8, maxX: building.x + building.w / 2 + 0.8,
      minZ: building.z - building.d / 2 - 0.8, maxZ: building.z + building.d / 2 + 0.8
    });
  });

  for (let index = 0; index < 12; index += 1) {
    const x = (index % 2 === 0 ? -1 : 1) * (12 + Math.floor(index / 2) * 4.2);
    const z = -8 - Math.floor(index / 2) * 7.2;
    primitive(app.root, `cover-block-${index + 1}`, 'box', new pc.Vec3(x, 0.75, z), new pc.Vec3(2.1, 1.5, 1.2), dark);
    obstacles.push({ minX: x - 1.35, maxX: x + 1.35, minZ: z - 0.95, maxZ: z + 0.95 });
  }

  // Defensive wall sections and sandbag emplacements around the training lanes.
  const wallSurface = material(new pc.Color(0.31, 0.34, 0.32), { roughness: 0.98 });
  const sandbagSurface = material(new pc.Color(0.43, 0.39, 0.29), { roughness: 1 });
  const metalSurface = material(new pc.Color(0.12, 0.16, 0.16), { metalness: 0.58, roughness: 0.72 });
  const wallRuns = [
    { x: -34, z: -22, length: 17, rotation: 0 },
    { x: 34, z: -25, length: 20, rotation: 0 },
    { x: 0, z: -52, length: 26, rotation: 90 }
  ];
  wallRuns.forEach((wall, index) => {
    const root = new pc.Entity(`defensive-wall-${index + 1}`);
    root.setPosition(wall.x, 0, wall.z);
    root.setEulerAngles(0, wall.rotation, 0);
    app.root.addChild(root);
    primitive(root, 'wall-core', 'box', new pc.Vec3(0, 1.05, 0), new pc.Vec3(wall.length, 2.1, 0.62), wallSurface);
    primitive(root, 'wall-top-cap', 'box', new pc.Vec3(0, 2.13, 0), new pc.Vec3(wall.length + 0.22, 0.14, 0.78), dark);
    for (let segment = 0; segment < Math.floor(wall.length / 2); segment += 1) {
      const x = -wall.length / 2 + 1 + segment * 2;
      primitive(root, `wall-panel-seam-${segment}`, 'box', new pc.Vec3(x, 1.05, -0.32), new pc.Vec3(0.055, 2.0, 0.025), trim);
      primitive(root, `wall-support-${segment}`, 'box', new pc.Vec3(x, 0.55, 0.38), new pc.Vec3(0.16, 1.1, 0.24), metalSurface);
    }
    obstacles.push({
      minX: wall.x - (wall.rotation === 90 ? 0.65 : wall.length / 2 + 0.55),
      maxX: wall.x + (wall.rotation === 90 ? 0.65 : wall.length / 2 + 0.55),
      minZ: wall.z - (wall.rotation === 90 ? wall.length / 2 + 0.55 : 0.65),
      maxZ: wall.z + (wall.rotation === 90 ? wall.length / 2 + 0.55 : 0.65)
    });
  });

  const sandbagPositions = [
    { x: -12, z: -16 }, { x: 12, z: -16 }, { x: -18, z: -31 }, { x: 18, z: -31 }
  ];
  sandbagPositions.forEach((position, index) => {
    const root = new pc.Entity(`sandbag-emplacement-${index + 1}`);
    root.setPosition(position.x, 0, position.z);
    app.root.addChild(root);
    for (let row = 0; row < 2; row += 1) {
      for (let bag = 0; bag < 4 - row; bag += 1) {
        primitive(root, `sandbag-${row}-${bag}`, 'capsule',
          new pc.Vec3((bag - 1.5 + row * 0.5) * 0.62, 0.28 + row * 0.42, 0),
          new pc.Vec3(0.58, 0.34, 0.38), sandbagSurface);
      }
    }
    obstacles.push({ minX: position.x - 1.55, maxX: position.x + 1.55, minZ: position.z - 0.65, maxZ: position.z + 0.65 });
  });

  // Roadside concrete jersey barriers.
  for (let index = 0; index < 5; index += 1) {
    const x = -24 + index * 12;
    primitive(app.root, `road-barrier-${index + 1}`, 'box', new pc.Vec3(x, 0.48, -3), new pc.Vec3(4.4, 0.96, 0.72), wallSurface);
    primitive(app.root, `road-barrier-stripe-${index + 1}`, 'box', new pc.Vec3(x, 0.5, -3.38), new pc.Vec3(0.42, 0.72, 0.035), orange);
    obstacles.push({ minX: x - 2.35, maxX: x + 2.35, minZ: -3.55, maxZ: -2.45 });
  }

  for (let index = 0; index < 8; index += 1) {
    const x = index < 4 ? -43 : 43;
    const z = -48 + (index % 4) * 16;
    primitive(app.root, `beacon-${index + 1}`, 'cylinder', new pc.Vec3(x, 1.8, z), new pc.Vec3(0.28, 3.6, 0.28), dark);
    primitive(app.root, `beacon-light-${index + 1}`, 'sphere', new pc.Vec3(x, 3.75, z), new pc.Vec3(0.38, 0.38, 0.38), orange);
  }

  const targetPositions = [
    new pc.Vec3(-5, 0, -22), new pc.Vec3(0, 0, -29), new pc.Vec3(5, 0, -22),
    new pc.Vec3(-13, 0, -37), new pc.Vec3(13, 0, -37), new pc.Vec3(0, 0, -48)
  ];
  const targets = targetPositions.map((position, index) => createTarget(app, position, index, {
    target: targetSurface, accent: orange, dark
  }));

  for (let index = 0; index < 18; index += 1) {
    const x = -42 + index * 4.95;
    primitive(app.root, `perimeter-post-${index + 1}`, 'box', new pc.Vec3(x, 1.1, -57), new pc.Vec3(0.25, 2.2, 0.25), dark);
  }

  return { targets, obstacles };
}
