/** Escudos colecionáveis no mapa — tier 1 (pior) até 8 (mítico). */

export type ShieldTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type ShieldRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'superior'
  | 'epic'
  | 'legendary'
  | 'ancient'
  | 'mythic';

export interface ShieldDef {
  tier: ShieldTier;
  rarity: ShieldRarity;
  name: string;
  /** Redução de dano recebido (0-1). */
  damageReduce: number;
  /** Cor da aura (Phaser hex). */
  auraColor: number;
  /** Peso no spawn aleatório (maior = mais comum). */
  spawnWeight: number;
  texture: string;
}

export const SHIELDS: Record<ShieldTier, ShieldDef> = {
  1: {
    tier: 1,
    rarity: 'common',
    name: 'Escudo de Madeira',
    damageReduce: 0.06,
    auraColor: 0x8a8f98, // cinza
    spawnWeight: 40,
    texture: 'shield_1',
  },
  2: {
    tier: 2,
    rarity: 'uncommon',
    name: 'Escudo de Bronze',
    damageReduce: 0.1,
    auraColor: 0xc4c9d1, // cinza claro
    spawnWeight: 28,
    texture: 'shield_2',
  },
  3: {
    tier: 3,
    rarity: 'rare',
    name: 'Escudo de Ferro',
    damageReduce: 0.14,
    auraColor: 0x3d9e5f, // verde
    spawnWeight: 18,
    texture: 'shield_3',
  },
  4: {
    tier: 4,
    rarity: 'superior',
    name: 'Escudo de Aço',
    damageReduce: 0.18,
    auraColor: 0x3b82f6, // azul
    spawnWeight: 10,
    texture: 'shield_4',
  },
  5: {
    tier: 5,
    rarity: 'epic',
    name: 'Escudo Rúnico',
    damageReduce: 0.22,
    auraColor: 0xa855f7, // roxo
    spawnWeight: 6,
    texture: 'shield_5',
  },
  6: {
    tier: 6,
    rarity: 'legendary',
    name: 'Escudo Dourado',
    damageReduce: 0.28,
    auraColor: 0xf5c542, // dourado
    spawnWeight: 3.5,
    texture: 'shield_6',
  },
  7: {
    tier: 7,
    rarity: 'ancient',
    name: 'Escudo Ancestral',
    damageReduce: 0.34,
    auraColor: 0xff7a18, // laranja
    spawnWeight: 1.8,
    texture: 'shield_7',
  },
  8: {
    tier: 8,
    rarity: 'mythic',
    name: 'Escudo Mítico',
    damageReduce: 0.42,
    auraColor: 0xff1e2d, // vermelho mítico
    spawnWeight: 0.7,
    texture: 'shield_8',
  },
};

/** Cor CSS da aura (#rrggbb). */
export function shieldAuraCss(tier: ShieldTier): string {
  return `#${SHIELDS[tier].auraColor.toString(16).padStart(6, '0')}`;
}

export const SHIELD_TIERS = Object.keys(SHIELDS).map(Number) as ShieldTier[];

export function isShieldTier(v: unknown): v is ShieldTier {
  return typeof v === 'number' && v >= 1 && v <= 8 && v in SHIELDS;
}

export function pickWeightedShieldTier(): ShieldTier {
  const total = SHIELD_TIERS.reduce((s, t) => s + SHIELDS[t].spawnWeight, 0);
  let roll = Math.random() * total;
  for (const tier of SHIELD_TIERS) {
    roll -= SHIELDS[tier].spawnWeight;
    if (roll <= 0) return tier;
  }
  return 1;
}

export function shieldDamageMul(tier: ShieldTier | null | undefined): number {
  if (!tier) return 1;
  return 1 - SHIELDS[tier].damageReduce;
}
