/**
 * TSI combat presentation event catalogue.
 *
 * This maps gameplay presentation events to future authored VFX/SFX assets.
 * It intentionally contains identifiers only: no placeholder noise, synthetic
 * explosions, or unlicensed media are embedded in the build.
 */
export type CombatPresentationEvent =
  | 'weapon-fired'
  | 'weapon-reloaded'
  | 'surface-impact'
  | 'explosion-small'
  | 'explosion-large'
  | 'player-footstep'
  | 'player-landed'
  | 'player-effort'
  | 'combat-callout'
  | 'objective-confirmed'
  | 'player-eliminated';

export interface PresentationCue {
  readonly vfx: readonly string[];
  readonly sfx: readonly string[];
  readonly voice?: readonly string[];
  readonly maxConcurrent?: number;
  readonly accessibilityTag?: 'flash' | 'camera-shake' | 'voice' | 'none';
}

export const TSI_PRESENTATION_CUES: Readonly<Record<CombatPresentationEvent, PresentationCue>> = {
  'weapon-fired': {
    vfx: ['TSI-VFX-MUZZLE-001', 'TSI-VFX-TRACER-OPTIONAL-001'],
    sfx: ['TSI-SFX-WPN-NEAR-001', 'TSI-SFX-WPN-FAR-001'],
    maxConcurrent: 12,
    accessibilityTag: 'flash'
  },
  'weapon-reloaded': {
    vfx: [],
    sfx: ['TSI-SFX-WPN-MANIPULATION-001'],
    maxConcurrent: 4,
    accessibilityTag: 'none'
  },
  'surface-impact': {
    vfx: ['TSI-VFX-IMPACT-SURFACE-001'],
    sfx: ['TSI-SFX-IMPACT-SURFACE-001'],
    maxConcurrent: 20,
    accessibilityTag: 'none'
  },
  'explosion-small': {
    vfx: ['TSI-VFX-EXPLOSION-SMALL-001', 'TSI-VFX-DUST-BURST-001'],
    sfx: ['TSI-SFX-EXPLOSION-SMALL-001'],
    maxConcurrent: 4,
    accessibilityTag: 'camera-shake'
  },
  'explosion-large': {
    vfx: ['TSI-VFX-EXPLOSION-LARGE-001', 'TSI-VFX-SMOKE-ROLL-001', 'TSI-VFX-DEBRIS-DECOR-001'],
    sfx: ['TSI-SFX-EXPLOSION-LARGE-001', 'TSI-SFX-EXPLOSION-TAIL-001'],
    maxConcurrent: 2,
    accessibilityTag: 'camera-shake'
  },
  'player-footstep': {
    vfx: [],
    sfx: ['TSI-SFX-FOOTSTEP-SURFACE-001'],
    maxConcurrent: 8,
    accessibilityTag: 'none'
  },
  'player-landed': {
    vfx: ['TSI-VFX-DUST-FOOT-001'],
    sfx: ['TSI-SFX-LANDING-001'],
    maxConcurrent: 4,
    accessibilityTag: 'none'
  },
  'player-effort': {
    vfx: [],
    sfx: [],
    voice: ['TSI-VO-EFFORT-001'],
    maxConcurrent: 2,
    accessibilityTag: 'voice'
  },
  'combat-callout': {
    vfx: [],
    sfx: ['TSI-SFX-RADIO-CHIRP-001'],
    voice: ['TSI-VO-COMBAT-CALLOUT-001'],
    maxConcurrent: 3,
    accessibilityTag: 'voice'
  },
  'objective-confirmed': {
    vfx: ['TSI-VFX-OBJECTIVE-CONFIRM-001'],
    sfx: ['TSI-SFX-UI-OBJECTIVE-001'],
    maxConcurrent: 2,
    accessibilityTag: 'none'
  },
  'player-eliminated': {
    vfx: ['TSI-VFX-ELIMINATION-READABILITY-001'],
    sfx: ['TSI-SFX-ELIMINATION-CONFIRM-001'],
    voice: ['TSI-VO-ELIMINATION-001'],
    maxConcurrent: 4,
    accessibilityTag: 'none'
  }
};

export interface PresentationOptions {
  readonly reducedFlashes: boolean;
  readonly reducedCameraShake: boolean;
}

export function getPresentationCue(
  event: CombatPresentationEvent,
  options: PresentationOptions
): PresentationCue {
  const cue = TSI_PRESENTATION_CUES[event];
  if (options.reducedFlashes && cue.accessibilityTag === 'flash') {
    return { ...cue, vfx: cue.vfx.filter((id) => !id.includes('MUZZLE')) };
  }
  if (options.reducedCameraShake && cue.accessibilityTag === 'camera-shake') {
    return { ...cue, accessibilityTag: 'none' };
  }
  return cue;
}
