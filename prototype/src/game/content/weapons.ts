/**
 * TSI weapon catalogue — client presentation/prototype data.
 *
 * IMPORTANT: These values are placeholders for feel/tuning tests only.
 * Competitive damage, ammo, fire cadence and hit validation MUST be owned
 * and validated by the authoritative Colyseus server.
 */
export type WeaponFamily = 'assault-rifle' | 'pistol' | 'marksman' | 'shotgun';

export interface WeaponDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly family: WeaponFamily;
  readonly magazineSize: number;
  readonly reserveAmmo: number;
  readonly roundsPerMinute: number;
  readonly reloadSeconds: number;
  readonly equipSeconds: number;
  readonly maxPresentationDistance: number;
  readonly presentation: {
    readonly muzzleFlash: string;
    readonly fireNear: string;
    readonly fireFar: string;
    readonly reload: string;
    readonly impactDefault: string;
  };
}

export const TSI_WEAPONS = {
  'TSI-WPN-AR-01': {
    id: 'TSI-WPN-AR-01',
    displayName: 'Vektor AR',
    family: 'assault-rifle',
    magazineSize: 30,
    reserveAmmo: 120,
    roundsPerMinute: 620,
    reloadSeconds: 2.25,
    equipSeconds: 0.42,
    maxPresentationDistance: 180,
    presentation: {
      muzzleFlash: 'TSI-VFX-MUZZLE-AR-001',
      fireNear: 'TSI-SFX-WPN-AR-NEAR-001',
      fireFar: 'TSI-SFX-WPN-AR-FAR-001',
      reload: 'TSI-SFX-WPN-RELOAD-AR-001',
      impactDefault: 'TSI-SFX-IMPACT-CONCRETE-001'
    }
  },
  'TSI-WPN-PI-01': {
    id: 'TSI-WPN-PI-01',
    displayName: 'Kestrel P9',
    family: 'pistol',
    magazineSize: 15,
    reserveAmmo: 60,
    roundsPerMinute: 360,
    reloadSeconds: 1.55,
    equipSeconds: 0.28,
    maxPresentationDistance: 120,
    presentation: {
      muzzleFlash: 'TSI-VFX-MUZZLE-PI-001',
      fireNear: 'TSI-SFX-WPN-PI-NEAR-001',
      fireFar: 'TSI-SFX-WPN-PI-FAR-001',
      reload: 'TSI-SFX-WPN-RELOAD-PI-001',
      impactDefault: 'TSI-SFX-IMPACT-METAL-001'
    }
  },
  'TSI-WPN-MR-01': {
    id: 'TSI-WPN-MR-01',
    displayName: 'Longview M',
    family: 'marksman',
    magazineSize: 10,
    reserveAmmo: 50,
    roundsPerMinute: 72,
    reloadSeconds: 2.7,
    equipSeconds: 0.58,
    maxPresentationDistance: 260,
    presentation: {
      muzzleFlash: 'TSI-VFX-MUZZLE-MR-001',
      fireNear: 'TSI-SFX-WPN-MR-NEAR-001',
      fireFar: 'TSI-SFX-WPN-MR-FAR-001',
      reload: 'TSI-SFX-WPN-RELOAD-MR-001',
      impactDefault: 'TSI-SFX-IMPACT-DIRT-001'
    }
  },
  'TSI-WPN-SG-01': {
    id: 'TSI-WPN-SG-01',
    displayName: 'Breach-8',
    family: 'shotgun',
    magazineSize: 8,
    reserveAmmo: 40,
    roundsPerMinute: 78,
    reloadSeconds: 2.9,
    equipSeconds: 0.5,
    maxPresentationDistance: 90,
    presentation: {
      muzzleFlash: 'TSI-VFX-MUZZLE-SG-001',
      fireNear: 'TSI-SFX-WPN-SG-NEAR-001',
      fireFar: 'TSI-SFX-WPN-SG-FAR-001',
      reload: 'TSI-SFX-WPN-RELOAD-SG-001',
      impactDefault: 'TSI-SFX-IMPACT-WOOD-001'
    }
  }
} as const satisfies Record<string, WeaponDefinition>;

export type TsiWeaponId = keyof typeof TSI_WEAPONS;

export function getWeaponDefinition(id: string): WeaponDefinition | undefined {
  return Object.values(TSI_WEAPONS).find((weapon) => weapon.id === id);
}

/** Guard used by UI and test tooling; it does not authorize a server-side shot. */
export function validateWeaponCatalogue(): string[] {
  const errors: string[] = [];
  for (const weapon of Object.values(TSI_WEAPONS)) {
    if (!weapon.id.startsWith('TSI-WPN-')) errors.push(`${weapon.id}: invalid content id`);
    if (weapon.magazineSize <= 0 || weapon.reserveAmmo < 0) errors.push(`${weapon.id}: invalid ammunition values`);
    if (weapon.roundsPerMinute <= 0) errors.push(`${weapon.id}: invalid fire cadence`);
    if (weapon.reloadSeconds <= 0 || weapon.equipSeconds < 0) errors.push(`${weapon.id}: invalid timing`);
    if (!weapon.presentation.muzzleFlash || !weapon.presentation.fireNear || !weapon.presentation.fireFar) {
      errors.push(`${weapon.id}: missing presentation references`);
    }
  }
  return errors;
}
