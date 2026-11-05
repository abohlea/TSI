import * as pc from 'playcanvas';

export interface LoadedOperator {
  entity: pc.Entity;
  clips: string[];
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
        const name = track.name;
        anim.assignAnimation(name, track);
        clips.push(name);
      }
      if (clips.includes('Idle') && anim.baseLayer) anim.baseLayer.play('Idle');

      parent.children.forEach((child) => {
        if (child.name !== 'ar-01-rifle') child.enabled = false;
      });
      parent.addChild(operator);
      resolve({ entity: operator, clips });
    });
  });
}
