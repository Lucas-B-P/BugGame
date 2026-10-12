export const WORLD = {
  width: 3000,
  height: 3000,
  tickRate: 20,
} as const;

export const PLAYER = {
  baseSpeed: 175,
  dashSpeed: 400,
  dashDurationMs: 160,
  dashCooldownMs: 1500,
  attackCooldownMs: 380,
  attackRange: 220,
  attackDamage: 16,
  maxHp: 100,
  foodCapacity: 50,
  /** Tempo da animação de morte antes de sair. */
  deathAnimMs: 1600,
  xpDropRatio: 0.5,
  foodDropRatio: 0.5,
  killXpBase: 10,
  killXpPerLevel: 4,
  staffSpeed: 420,
  staffTtl: 0.85,
  staffRadius: 14,
} as const;

export const RESOURCE_SPAWN = {
  maxCount: 160,
  spawnIntervalMs: 900,
  pickupRadius: 28,
} as const;

/** Escudos no chão do mapa. */
export const SHIELD_SPAWN = {
  maxCount: 18,
  spawnIntervalMs: 4500,
  firstDelayMs: 8000,
  pickupRadius: 34,
} as const;

export const EVENT_INTERVAL_MS = 4 * 60_000;
/** Duração de cada clima ativo. */
export const EVENT_DURATION_MS = 45_000;
/** Primeiro clima só depois de um tempo de partida. */
export const EVENT_FIRST_DELAY_MS = 2 * 60_000;
/** Intervalo entre spawns do Wraith (após morte ou spawn). */
export const BOSS_INTERVAL_MS = 5 * 60 * 1000;
/** Primeiro spawn um pouco mais cedo para a partida não ficar vazia. */
export const BOSS_FIRST_SPAWN_MS = 60_000;
/** Distância em que o chefe passa a focar o jogador. */
export const BOSS_AGGRO_RANGE = 420;

export type SpeciesId =
  | 'ant'
  | 'ladybug'
  | 'beetle'
  | 'bee'
  | 'wasp'
  | 'spider'
  | 'scorpion';

export type ResourceType = 'fruit' | 'mushroom' | 'leaf' | 'water' | 'larva';

export type AbilityId =
  | 'carry'
  | 'shield'
  | 'charge'
  | 'sting'
  | 'venom_sting'
  | 'web'
  | 'venom_strike';

export type WorldEventType = 'rain' | 'night' | 'fire';

export type BossType = 'wraith' | 'minotaur' | 'skeleton' | 'necromancer';
export type BossAnim = 'idle' | 'walk' | 'attack' | 'hurt' | 'die';

export type { HeroId, PowerId, PlayerAnim } from './heroes.js';
export type { ShieldTier } from './shields.js';
import type { HeroId, PowerId, PlayerAnim } from './heroes.js';
import type { ShieldTier } from './shields.js';

export interface Vec2 {
  x: number;
  y: number;
}

export interface SpeciesDef {
  id: SpeciesId;
  name: string;
  color: number;
  size: number;
  speedMul: number;
  hpMul: number;
  damageMul: number;
  ability: AbilityId;
  abilityCooldownMs: number;
  evolutions: SpeciesId[];
  xpToEvolve: number;
}

export interface ResourceDef {
  type: ResourceType;
  color: number;
  xp: number;
  food: number;
  radius: number;
}

export interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number;
  heroId: HeroId;
  powerId: PowerId;
  anim: PlayerAnim;
  facing: number;
  hp: number;
  maxHp: number;
  xp: number;
  food: number;
  level: number;
  alive: boolean;
  shielding: boolean;
  speedMul: number;
  size: number;
  /** Escudo equipado (1-8) ou null. */
  shieldTier: ShieldTier | null;
}

export interface ResourceState {
  id: string;
  type: ResourceType;
  x: number;
  y: number;
}

export interface ShieldPickupState {
  id: string;
  tier: ShieldTier;
  x: number;
  y: number;
}

export interface ProjectileState {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  angle: number;
  kind: 'staff' | 'sting' | 'web' | 'venom' | 'boss';
  /** Tier do cajado (1-8), so para kind=staff. */
  staffTier?: number;
  /** Tipo do boss dono do projetil (kind=boss). */
  bossType?: BossType;
}

export type PowerFxPhase = 'travel' | 'impact';

export interface PowerFxState {
  id: string;
  powerId: PowerId;
  x: number;
  y: number;
  ttl: number;
  /** travel = trajeto ate o alvo; impact = explosao no ponto. */
  phase: PowerFxPhase;
}

export interface DropState {
  id: string;
  x: number;
  y: number;
  food: number;
  xp: number;
}

export interface BossState {
  id: string;
  type: BossType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  angle: number;
  /** 1 = direita, -1 = esquerda (sprite side-view). */
  facing: number;
  anim: BossAnim;
  aggro: boolean;
}

export interface WorldEventState {
  type: WorldEventType;
  endsAt: number;
}

export interface Snapshot {
  tick: number;
  players: PlayerState[];
  resources: ResourceState[];
  shields: ShieldPickupState[];
  projectiles: ProjectileState[];
  powerFx: PowerFxState[];
  drops: DropState[];
  bosses: BossState[];
  event: WorldEventState | null;
}

export interface JoinPayload {
  name: string;
  /** Progresso salvo após morte (mesma sessão / localStorage). */
  xp?: number;
  food?: number;
  shieldTier?: ShieldTier | null;
}

export interface InputPayload {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  angle: number;
  /** Ponto no mundo onde o mouse aponta (poder mira aqui). */
  aimX: number;
  aimY: number;
  attack: boolean;
  ability: boolean;
  dash: boolean;
}

export const SERVER_EVENTS = {
  join: 'join',
  input: 'input',
  snapshot: 'snapshot',
  welcome: 'welcome',
  death: 'death',
  evolved: 'evolved',
  message: 'message',
} as const;

export interface WelcomePayload {
  id: string;
  world: { width: number; height: number };
}

export interface DeathPayload {
  xp: number;
  food: number;
  heroId: HeroId;
  powerId: PowerId;
  name: string;
  level: number;
  shieldTier: ShieldTier | null;
}
