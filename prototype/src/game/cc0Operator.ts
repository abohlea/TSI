import * as pc from 'playcanvas';

export interface LoadedOperator {
  entity: pc.Entity;
  clips: string[];
  setLocomotion(moving: boolean, sprinting: boolean): void;
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

      const findClip = (...aliases: string[]): string | undefined => {
        const normalized = clips.map((name) => ({ name, key: name.toLowerCase().replace(/[^a-z0-9]/g, '') }));
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

      const idleClip = findClip('idle', 'stand');
      const walkClip = findClip('walk', 'walking', 'move');
      const runClip = findClip('run', 'sprint', 'running');
      let activeClip: string | undefined;

      const playLocomotion = (moving: boolean, sprinting: boolean): void => {
        const nextClip = sprinting && runClip
          ? runClip
          : moving && walkClip
            ? walkClip
            : idleClip ?? walkClip ?? runClip;
        if (!nextClip || nextClip === activeClip || !anim.baseLayer) return;
        anim.baseLayer.play(nextClip);
        activeClip = nextClip;
      };

      if (idleClip && anim.baseLayer) {
        anim.baseLayer.play(idleClip);
        activeClip = idleClip;
      }

      parent.children.forEach((child) => {
        if (child.name !== 'ar-01-rifle') child.enabled = false;
      });
      parent.addChild(operator);
      resolve({ entity: operator, clips, setLocomotion: playLocomotion });
    });
  });
}
