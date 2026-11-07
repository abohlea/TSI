import * as pc from 'playcanvas';

export type OperatorAction = 'attack' | 'hit' | 'reload' | 'death';

export interface LoadedOperator {
  entity: pc.Entity;
  clips: string[];
  setLocomotion(moving: boolean, sprinting: boolean): void;
  playAction(action: OperatorAction): boolean;
  /** Restore locomotion after a server-confirmed respawn. */
  revive(): void;
}

export function loadCc0Operator(app: pc.Application, parent: pc.Entity): Promise<LoadedOperator> {
  return new Promise((resolve, reject) => {
    app.assets.loadFromUrl('/assets/cc0/ArmySniper.glb', 'container', (error, asset) => {
      if (error || !asset?.resource) {
        reject(error ?? new Error('ArmySniper GLB could not be loaded'));
        return;
      }

      const operator = asset.resource.instantiateRenderEntity({ castShadows: true, receiveShadows: true });
      operator.name = 'tsi-cc0-operator-army-sniper';
      operator.setLocalPosition(0, 0, 0);
      operator.setLocalScale(1, 1, 1);
      operator.addComponent('anim', { activate: true });

      const anim = operator.anim;
      if (!anim) {
        reject(new Error('PlayCanvas animation component was not created'));
        return;
      }

      const clips: string[] = [];
      for (const animation of asset.resource.animations) {
        const track = animation.resource;
        if (!track || !(track instanceof pc.AnimTrack)) continue;
        anim.assignAnimation(track.name, track);
        clips.push(track.name);
      }

      const normalized = clips.map((name) => ({
        name,
        key: name.toLowerCase().replace(/[^a-z0-9]/g, '')
      }));
      const findClip = (...aliases: string[]): string | undefined => {
        for (const alias of aliases) {
          const exact = normalized.find((clip) => clip.key === alias);
          if (exact) return exact.name;
        }
        for (const alias of aliases) {
          const partial = normalized.find((clip) => clip.key.includes(alias));
          if (partial) return partial.name;
        }
        return undefined;
      };

      const idleClip = findClip('idle', 'stand', 'breath');
      const walkClip = findClip('walk', 'walking');
      const runClip = findClip('run', 'sprint', 'running');
      const actionClips: Record<OperatorAction, string | undefined> = {
        attack: findClip('attack', 'shoot', 'fire', 'rifleaim'),
        hit: findClip('hit', 'damage', 'hurt', 'impact'),
        reload: findClip('reload', 'reloading', 'magazine'),
        death: findClip('death', 'die', 'dead', 'dying')
      };
      let moving = false;
      let sprinting = false;
      let activeClip: string | undefined;
      let actionTimer = 0;
      let dead = false;

      const play = (name: string | undefined): void => {
        if (!name || name === activeClip || !anim.baseLayer) return;
        anim.baseLayer.transition(name, 0.12);
        activeClip = name;
      };
      const playLocomotion = (): void => {
        if (dead || actionTimer > 0) return;
        play(sprinting && runClip ? runClip : moving && walkClip ? walkClip : idleClip ?? walkClip ?? runClip);
      };
      const setLocomotion = (nextMoving: boolean, nextSprinting: boolean): void => {
        moving = nextMoving;
        sprinting = nextSprinting && nextMoving;
        playLocomotion();
      };
      const playAction = (action: OperatorAction): boolean => {
        const clip = actionClips[action];
        if (!clip || !anim.baseLayer) return false;
        if (dead && action !== 'death') return false;
        if (action === 'death') {
          dead = true;
          actionTimer = Number.POSITIVE_INFINITY;
        } else {
          actionTimer = action === 'reload' ? 1.25 : action === 'hit' ? 0.55 : 0.38;
        }
        play(clip);
        return true;
      };

      if (idleClip && anim.baseLayer) {
        anim.baseLayer.play(idleClip);
        activeClip = idleClip;
      }

      parent.children.forEach((child) => {
        if (child.name !== 'ar-01-rifle') child.enabled = false;
      });
      parent.addChild(operator);
      app.on('update', (dt: number) => {
        if (actionTimer <= 0 || !Number.isFinite(actionTimer)) return;
        actionTimer = Math.max(0, actionTimer - dt);
        if (actionTimer === 0) playLocomotion();
      });
      const revive = (): void => {
        dead = false;
        actionTimer = 0;
        activeClip = undefined;
        playLocomotion();
      };

      resolve({ entity: operator, clips, setLocomotion, playAction, revive });
    });
  });
}
