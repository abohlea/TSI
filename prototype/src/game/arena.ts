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
  surfaces: { ground: pc.StandardMaterial; concrete: pc.StandardMaterial };
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
  const timber = material(new pc.Color(0.24, 0.16, 0.095), { roughness: 0.96 });
  const sandbag = material(new pc.Color(0.43, 0.39, 0.27), { roughness: 0.99 });
  const hazard = material(new pc.Color(0.78, 0.31, 0.07), { roughness: 0.78 });

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
    for (const side of [-1, 1]) {
      primitive(root, `facade-window-${side}`, 'box', new pc.Vec3(side * building.w * 0.27, 1.65, -building.d / 2 - 0.045), new pc.Vec3(1.25, 1.05, 0.07), dark);
      primitive(root, `window-glass-${side}`, 'box', new pc.Vec3(side * building.w * 0.27, 1.65, -building.d / 2 - 0.09), new pc.Vec3(1.05, 0.82, 0.025), targetSurface);
      primitive(root, `corner-pillar-${side}`, 'box', new pc.Vec3(side * (building.w / 2 - 0.18), 0, building.d / 2 + 0.12), new pc.Vec3(0.28, building.h, 0.28), dark);
    }
    primitive(root, 'roof-vent', 'box', new pc.Vec3(0, building.h / 2 + 0.42, 0), new pc.Vec3(1.5, 0.55, 1.2), dark);
    obstacles.push({
      minX: building.x - building.w / 2 - 0.8, maxX: building.x + building.w / 2 + 0.8,
      minZ: building.z - building.d / 2 - 0.8, maxZ: building.z + building.d / 2 + 0.8
    });
  });

  // Mixed-height cover lanes: sandbags, timber crates, jersey barriers and concrete blocks.
  const coverLayouts = [
    { x: -12, z: -8, w: 3.2, h: 0.85, d: 1.05, surface: sandbag, name: 'sandbag' },
    { x: 12, z: -8, w: 2.2, h: 1.45, d: 1.35, surface: timber, name: 'crate' },
    { x: -16.2, z: -15.2, w: 3.8, h: 1.15, d: 0.9, surface: concrete, name: 'jersey' },
    { x: 16.2, z: -15.2, w: 2.4, h: 1.8, d: 1.25, surface: dark, name: 'hard-cover' },
    { x: -20.4, z: -22.4, w: 3.4, h: 0.85, d: 1.0, surface: sandbag, name: 'sandbag' },
    { x: 20.4, z: -22.4, w: 2.0, h: 1.4, d: 1.5, surface: timber, name: 'crate' },
    { x: -12, z: -29.6, w: 2.8, h: 1.5, d: 1.1, surface: concrete, name: 'block' },
    { x: 12, z: -29.6, w: 3.6, h: 0.9, d: 1.0, surface: sandbag, name: 'sandbag' },
    { x: -21, z: -37, w: 3.2, h: 1.25, d: 1.0, surface: hazard, name: 'barrier' },
    { x: 21, z: -37, w: 2.3, h: 1.55, d: 1.3, surface: timber, name: 'crate' },
    { x: -8, z: -44, w: 3.6, h: 0.9, d: 1.0, surface: sandbag, name: 'sandbag' },
    { x: 8, z: -44, w: 3.6, h: 0.9, d: 1.0, surface: sandbag, name: 'sandbag' }
  ];
  coverLayouts.forEach((cover, index) => {
    primitive(app.root, `cover-${cover.name}-${index + 1}`, 'box',
      new pc.Vec3(cover.x, cover.h / 2, cover.z),
      new pc.Vec3(cover.w, cover.h, cover.d), cover.surface);
    if (cover.name === 'crate') {
      primitive(app.root, `crate-band-${index + 1}`, 'box',
        new pc.Vec3(cover.x, cover.h * 0.58, cover.z - cover.d / 2 - 0.025),
        new pc.Vec3(cover.w * 0.92, 0.09, 0.05), dark);
    }
    obstacles.push({
      minX: cover.x - cover.w / 2 - 0.22, maxX: cover.x + cover.w / 2 + 0.22,
      minZ: cover.z - cover.d / 2 - 0.22, maxZ: cover.z + cover.d / 2 + 0.22
    });
  });

  // Non-blocking battlefield dressing, placed outside the central firing lane.
  for (let index = 0; index < 10; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const x = side * (29 + (index % 3) * 3.5);
    const z = -5 - Math.floor(index / 2) * 10.2;
    primitive(app.root, `field-rubble-${index + 1}`, 'box',
      new pc.Vec3(x, 0.22, z),
      new pc.Vec3(1.2 + (index % 3) * 0.35, 0.42, 0.85), index % 2 ? concrete : dark)
      .setLocalEulerAngles(0, index * 17, index % 3 === 0 ? 8 : 0);
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

  return { targets, obstacles, surfaces: { ground, concrete } };
}

type Cc0TextureSet = { name: string; files: Array<{ map: string; file: string }> };

interface Cc0TextureManifest {
  textures?: Cc0TextureSet[];
}

export function applyCc0ArenaMaterials(app: pc.Application, arena: ArenaApi): void {
  void fetch('/assets/cc0/manifest.json')
    .then((response) => {
      if (!response.ok) throw new Error(`Asset manifest unavailable: ${response.status}`);
      return response.json() as Promise<Cc0TextureManifest>;
    })
    .then((manifest) => {
      const textures = manifest.textures ?? [];
      const groundSet = textures.find((item) => /asphalt|gravel|ground|dirt|road/i.test(item.name)) ?? textures[0];
      const wallSet = textures.find((item) => /concrete|brick|stone/i.test(item.name)) ?? textures[1];
      const applyMap = (set: Cc0TextureSet | undefined, target: pc.StandardMaterial, tiling: number) => {
        const maps = [
          { file: set?.files.find((item) => /diff|albedo|color/i.test(item.map)), kind: 'diffuse' as const },
          { file: set?.files.find((item) => /normal|nor_gl|nor_dx|bump/i.test(item.map)), kind: 'normal' as const }
        ];
        for (const entry of maps) {
          if (!entry.file) continue;
          app.assets.loadFromUrl(entry.file.file, 'texture', (error, asset) => {
            if (error || !asset?.resource) {
              console.warn('Unable to load CC0 PBR texture:', entry.file?.file, error);
              return;
            }
            const texture = asset.resource as pc.Texture;
            if (entry.kind === 'diffuse') {
              target.diffuseMap = texture;
              target.diffuseMapTiling = new pc.Vec2(tiling, tiling);
            } else {
              target.normalMap = texture;
              target.normalMapTiling = new pc.Vec2(tiling, tiling);
            }
            target.update();
          });
        }
      };
      applyMap(groundSet, arena.surfaces.ground, 9);
      applyMap(wallSet, arena.surfaces.concrete, 2.5);
    })
    .catch((error: unknown) => console.warn('CC0 arena material manifest unavailable:', error));
}
