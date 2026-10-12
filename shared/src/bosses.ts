import type { BossAnim, BossType } from './types.js';
import { PLAYER } from './types.js';

export type BossCombat = 'melee' | 'ranged';

export interface BossAnimFrames {
  idle: number;
  walk: number;
  attack: number;
  hurt: number;
  die: number;
}

export interface BossDef {
  type: BossType;
  name: string;
  hp: number;
  damage: number;
  /** Multiplicador vs PLAYER.baseSpeed (1.1 = 10% mais rapido). */
  speedVsPlayer: number;
  wanderSpeed: number;
  radius: number;
  aggroRange: number;
  /** Distancia para bater (melee) ou atirar (ranged). */
  attackRange: number;
  attackCooldownMs: number;
  combat: BossCombat;
  /** Projeteis (so combat=ranged). */
  projectileSpeed?: number;
  projectileTtl?: number;
  projectileRadius?: number;
  /** XP total distribuido entre quem contribuiu no kill. */
  xpReward: number;
  foodReward: number;
  /** Primeiro spawn apos o inicio do servidor. */
  firstSpawnDelayMs: number;
  /** Escala visual no client. */
  scale: number;
  deathAnimMs: number;
  /** Contagem de frames por animacao (client). */
  frames: BossAnimFrames;
}

/**
 * Bosses ativos no jardim (ordem: mais fraco -> mais forte).
 * 1) melee mais rapido  2+) ranged mais lentos, cada um mais duro.
 */
export const BOSS_TYPES: BossType[] = ['wraith', 'minotaur', 'skeleton', 'necromancer'];

export const BOSSES: Record<BossType, BossDef> = {
  wraith: {
    type: 'wraith',
    name: 'Espectro',
    hp: 1100,
    damage: 26,
    speedVsPlayer: 1.1,
    wanderSpeed: 55,
    radius: 36,
    aggroRange: 500,
    attackRange: 58,
    attackCooldownMs: 800,
    combat: 'melee',
    xpReward: 90,
    foodReward: 10,
    firstSpawnDelayMs: 90_000,
    scale: 0.2,
    deathAnimMs: 1400,
    frames: { idle: 12, walk: 12, attack: 12, hurt: 12, die: 15 },
  },
  minotaur: {
    type: 'minotaur',
    name: 'Minotauro',
    hp: 3800,
    damage: 44,
    speedVsPlayer: 0.9,
    wanderSpeed: 48,
    radius: 48,
    aggroRange: 580,
    attackRange: 440,
    attackCooldownMs: 1200,
    combat: 'ranged',
    projectileSpeed: 310,
    projectileTtl: 1.55,
    projectileRadius: 20,
    xpReward: 220,
    foodReward: 22,
    firstSpawnDelayMs: 210_000,
    scale: 0.55,
    deathAnimMs: 1600,
    frames: { idle: 9, walk: 12, attack: 12, hurt: 6, die: 15 },
  },
  skeleton: {
    type: 'skeleton',
    name: 'Cruzado Esqueleto',
    hp: 7500,
    damage: 58,
    speedVsPlayer: 0.85,
    wanderSpeed: 42,
    radius: 44,
    aggroRange: 640,
    attackRange: 520,
    attackCooldownMs: 1000,
    combat: 'ranged',
    projectileSpeed: 370,
    projectileTtl: 1.7,
    projectileRadius: 22,
    xpReward: 400,
    foodReward: 36,
    firstSpawnDelayMs: 360_000,
    scale: 0.5,
    deathAnimMs: 1600,
    frames: { idle: 9, walk: 12, attack: 12, hurt: 6, die: 15 },
  },
  necromancer: {
    type: 'necromancer',
    name: 'Necromante',
    hp: 12500,
    damage: 72,
    speedVsPlayer: 0.8,
    wanderSpeed: 38,
    radius: 46,
    aggroRange: 700,
    attackRange: 580,
    attackCooldownMs: 900,
    combat: 'ranged',
    projectileSpeed: 410,
    projectileTtl: 1.85,
    projectileRadius: 24,
    xpReward: 650,
    foodReward: 50,
    firstSpawnDelayMs: 480_000,
    scale: 0.52,
    deathAnimMs: 1700,
    frames: { idle: 9, walk: 12, attack: 12, hurt: 6, die: 15 },
  },
};

export function bossMoveSpeed(def: BossDef): number {
  return PLAYER.baseSpeed * def.speedVsPlayer;
}

export function bossXpShare(def: BossDef, damageDealt: number): number {
  const ratio = Math.max(0, Math.min(1, damageDealt / def.hp));
  return Math.max(Math.round(def.xpReward * 0.12), Math.round(ratio * def.xpReward));
}

export function isBossType(v: string): v is BossType {
  return v in BOSSES;
}

export function bossAnimKey(type: BossType, anim: BossAnim | string): string {
  switch (anim) {
    case 'walk':
      return `${type}_walk`;
    case 'attack':
      return `${type}_attack`;
    case 'hurt':
      return `${type}_hurt`;
    case 'die':
      return `${type}_die`;
    default:
      return `${type}_idle`;
  }
}
