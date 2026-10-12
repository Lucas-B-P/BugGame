export type HeroId =
  | 'fallen1'
  | 'fallen2'
  | 'fallen3'
  | 'golem1'
  | 'golem2'
  | 'golem3'
  | 'reaper1'
  | 'reaper2'
  | 'reaper3'
  | 'valk1'
  | 'valk2'
  | 'valk3'
  | 'oracle1'
  | 'oracle2'
  | 'oracle3';

export type PowerId =
  | 'power1'
  | 'power2'
  | 'power3'
  | 'power4'
  | 'power5'
  | 'power6'
  | 'power7'
  | 'power8'
  | 'power9'
  | 'power10'
  | 'power11'
  | 'power12'
  | 'power13'
  | 'power14'
  | 'power15';

export type PlayerAnim = 'idle' | 'walk' | 'attack' | 'cast' | 'hurt' | 'die';

export interface HeroDef {
  id: HeroId;
  stage: number;
  name: string;
  preview: string;
  speedMul: number;
  hpMul: number;
  damageMul: number;
  size: number;
  next: HeroId | null;
  xpToEvolve: number;
  powerId: PowerId;
  staffTier: number;
}

export const HERO_PATH: HeroId[] = [
  'fallen1',
  'fallen2',
  'fallen3',
  'golem1',
  'golem2',
  'golem3',
  'reaper1',
  'reaper2',
  'reaper3',
  'valk1',
  'valk2',
  'valk3',
  'oracle1',
  'oracle2',
  'oracle3',
];

export const HEROES: Record<HeroId, HeroDef> = {
  fallen1: {
    id: 'fallen1',
    stage: 1,
    name: 'Anjo Caído I',
    preview: 'assets/heroes/fallen1/fallen1_idle_000.png',
    speedMul: 1.15,
    hpMul: 1.0,
    damageMul: 1.0,
    size: 22,
    next: 'fallen2',
    xpToEvolve: 90,
    powerId: 'power1',
    staffTier: 1,
  },
  fallen2: {
    id: 'fallen2',
    stage: 2,
    name: 'Anjo Caído II',
    preview: 'assets/heroes/fallen2/fallen2_idle_000.png',
    speedMul: 1.18,
    hpMul: 1.2,
    damageMul: 1.15,
    size: 24,
    next: 'fallen3',
    xpToEvolve: 200,
    powerId: 'power2',
    staffTier: 2,
  },
  fallen3: {
    id: 'fallen3',
    stage: 3,
    name: 'Anjo Caído III',
    preview: 'assets/heroes/fallen3/fallen3_idle_000.png',
    speedMul: 1.22,
    hpMul: 1.4,
    damageMul: 1.35,
    size: 26,
    next: 'golem1',
    xpToEvolve: 340,
    powerId: 'power3',
    staffTier: 3,
  },
  golem1: {
    id: 'golem1',
    stage: 4,
    name: 'Golem I',
    preview: 'assets/heroes/golem1/golem1_idle_000.png',
    speedMul: 0.95,
    hpMul: 1.65,
    damageMul: 1.55,
    size: 24,
    next: 'golem2',
    xpToEvolve: 520,
    powerId: 'power4',
    staffTier: 4,
  },
  golem2: {
    id: 'golem2',
    stage: 5,
    name: 'Golem II',
    preview: 'assets/heroes/golem2/golem2_idle_000.png',
    speedMul: 0.92,
    hpMul: 1.9,
    damageMul: 1.8,
    size: 26,
    next: 'golem3',
    xpToEvolve: 740,
    powerId: 'power5',
    staffTier: 5,
  },
  golem3: {
    id: 'golem3',
    stage: 6,
    name: 'Golem III',
    preview: 'assets/heroes/golem3/golem3_idle_000.png',
    speedMul: 0.88,
    hpMul: 2.2,
    damageMul: 2.1,
    size: 28,
    next: 'reaper1',
    xpToEvolve: 1000,
    powerId: 'power6',
    staffTier: 6,
  },
  reaper1: {
    id: 'reaper1',
    stage: 7,
    name: 'Ceifador I',
    preview: 'assets/heroes/reaper1/reaper1_idle_000.png',
    speedMul: 1.05,
    hpMul: 2.4,
    damageMul: 2.4,
    size: 28,
    next: 'reaper2',
    xpToEvolve: 1350,
    powerId: 'power7',
    staffTier: 7,
  },
  reaper2: {
    id: 'reaper2',
    stage: 8,
    name: 'Ceifador II',
    preview: 'assets/heroes/reaper2/reaper2_idle_000.png',
    speedMul: 1.1,
    hpMul: 2.7,
    damageMul: 2.75,
    size: 30,
    next: 'reaper3',
    xpToEvolve: 1750,
    powerId: 'power8',
    staffTier: 8,
  },
  reaper3: {
    id: 'reaper3',
    stage: 9,
    name: 'Ceifador III',
    preview: 'assets/heroes/reaper3/reaper3_idle_000.png',
    speedMul: 1.15,
    hpMul: 3.1,
    damageMul: 3.1,
    size: 32,
    next: 'valk1',
    xpToEvolve: 2250,
    powerId: 'power9',
    staffTier: 8,
  },
  valk1: {
    id: 'valk1',
    stage: 10,
    name: 'Valquíria I',
    preview: 'assets/heroes/valk1/valk1_idle_000.png',
    speedMul: 1.18,
    hpMul: 3.35,
    damageMul: 3.4,
    size: 30,
    next: 'valk2',
    xpToEvolve: 2850,
    powerId: 'power10',
    staffTier: 8,
  },
  valk2: {
    id: 'valk2',
    stage: 11,
    name: 'Valquíria II',
    preview: 'assets/heroes/valk2/valk2_idle_000.png',
    speedMul: 1.2,
    hpMul: 3.6,
    damageMul: 3.75,
    size: 31,
    next: 'valk3',
    xpToEvolve: 3600,
    powerId: 'power11',
    staffTier: 8,
  },
  valk3: {
    id: 'valk3',
    stage: 12,
    name: 'Valquíria III',
    preview: 'assets/heroes/valk3/valk3_idle_000.png',
    speedMul: 1.22,
    hpMul: 3.9,
    damageMul: 4.15,
    size: 32,
    next: 'oracle1',
    xpToEvolve: 4500,
    powerId: 'power12',
    staffTier: 8,
  },
  oracle1: {
    id: 'oracle1',
    stage: 13,
    name: 'Oráculo Sombrio I',
    preview: 'assets/heroes/oracle1/oracle1_idle_000.png',
    speedMul: 1.08,
    hpMul: 4.2,
    damageMul: 4.55,
    size: 31,
    next: 'oracle2',
    xpToEvolve: 5600,
    powerId: 'power13',
    staffTier: 8,
  },
  oracle2: {
    id: 'oracle2',
    stage: 14,
    name: 'Oráculo Sombrio II',
    preview: 'assets/heroes/oracle2/oracle2_idle_000.png',
    speedMul: 1.1,
    hpMul: 4.55,
    damageMul: 5.0,
    size: 32,
    next: 'oracle3',
    xpToEvolve: 7000,
    powerId: 'power14',
    staffTier: 8,
  },
  oracle3: {
    id: 'oracle3',
    stage: 15,
    name: 'Oráculo Sombrio III',
    preview: 'assets/heroes/oracle3/oracle3_idle_000.png',
    speedMul: 1.12,
    hpMul: 5.0,
    damageMul: 5.5,
    size: 34,
    next: null,
    xpToEvolve: 9999,
    powerId: 'power15',
    staffTier: 8,
  },
};

export const POWERS: Record<
  PowerId,
  { id: PowerId; name: string; damage: number; radius: number; cooldownMs: number; range: number; speed: number }
> = {
  power1: { id: 'power1', name: 'Chama Caída', damage: 32, radius: 90, cooldownMs: 4000, range: 380, speed: 460 },
  power2: { id: 'power2', name: 'Lâmina Azul', damage: 42, radius: 94, cooldownMs: 4200, range: 400, speed: 480 },
  power3: { id: 'power3', name: 'Tempestade Verde', damage: 54, radius: 100, cooldownMs: 4400, range: 420, speed: 500 },
  power4: { id: 'power4', name: 'Impacto Dourado', damage: 68, radius: 102, cooldownMs: 4600, range: 430, speed: 510 },
  power5: { id: 'power5', name: 'Pulso Violeta', damage: 84, radius: 110, cooldownMs: 4800, range: 450, speed: 520 },
  power6: { id: 'power6', name: 'Colosso', damage: 102, radius: 120, cooldownMs: 5000, range: 460, speed: 530 },
  power7: { id: 'power7', name: 'Corte Sombrio', damage: 124, radius: 118, cooldownMs: 5000, range: 480, speed: 540 },
  power8: { id: 'power8', name: 'Ceifar', damage: 150, radius: 125, cooldownMs: 5200, range: 500, speed: 560 },
  power9: { id: 'power9', name: 'Aniquilação', damage: 180, radius: 140, cooldownMs: 5400, range: 540, speed: 580 },
  power10: { id: 'power10', name: 'Lança Sagrada', damage: 210, radius: 132, cooldownMs: 5400, range: 560, speed: 590 },
  power11: { id: 'power11', name: 'Julgamento', damage: 245, radius: 138, cooldownMs: 5500, range: 580, speed: 600 },
  power12: { id: 'power12', name: 'Asas de Guerra', damage: 285, radius: 145, cooldownMs: 5600, range: 600, speed: 610 },
  power13: { id: 'power13', name: 'Oráculo Negro', damage: 330, radius: 150, cooldownMs: 5600, range: 620, speed: 620 },
  power14: { id: 'power14', name: 'Eclipse', damage: 380, radius: 158, cooldownMs: 5700, range: 640, speed: 630 },
  power15: { id: 'power15', name: 'Apocalipse', damage: 440, radius: 170, cooldownMs: 5800, range: 680, speed: 650 },
};

export function heroStats(hero: HeroId) {
  const def = HEROES[hero];
  return {
    maxHp: Math.round(100 * def.hpMul),
    speedMul: def.speedMul,
    damageMul: def.damageMul,
    size: def.size,
    staffTier: def.staffTier,
  };
}

export function staffTierBonus(staffTier: number): number {
  return 1 + (Math.max(1, staffTier) - 1) * 0.18;
}

export function staffAttackDamage(heroId: HeroId, baseDamage: number): number {
  const def = HEROES[heroId];
  return Math.round(baseDamage * staffTierBonus(def.staffTier) * def.damageMul);
}

export function powerAttackDamage(heroId: HeroId): number {
  const def = HEROES[heroId];
  const power = POWERS[def.powerId];
  // Escala menos agressiva que o cajado (evita one-shot em bosses)
  const scale = staffTierBonus(def.staffTier) * Math.sqrt(def.damageMul);
  return Math.round(power.damage * scale);
}

export function heroFromXp(xp: number): HeroId {
  let current: HeroId = HERO_PATH[0];
  for (const id of HERO_PATH) {
    const hero = HEROES[id];
    current = id;
    if (!hero.next || xp < hero.xpToEvolve) break;
  }
  return current;
}

export function demoteHeroToXp(_hero: HeroId, xp: number): HeroId {
  return heroFromXp(xp);
}

export function isHeroId(v: string): v is HeroId {
  return v in HEROES;
}

export function isPowerId(v: string): v is PowerId {
  return v in POWERS;
}

export function xpProgress(xp: number): {
  heroId: HeroId;
  current: number;
  need: number;
  remaining: number;
  pct: number;
  isMax: boolean;
} {
  const heroId = heroFromXp(xp);
  const def = HEROES[heroId];
  if (!def.next) {
    return { heroId, current: xp, need: xp, remaining: 0, pct: 100, isMax: true };
  }
  const idx = HERO_PATH.indexOf(heroId);
  const prevThreshold = idx <= 0 ? 0 : HEROES[HERO_PATH[idx - 1]].xpToEvolve;
  const need = def.xpToEvolve - prevThreshold;
  const current = Math.max(0, xp - prevThreshold);
  const remaining = Math.max(0, def.xpToEvolve - xp);
  const pct = need <= 0 ? 100 : Math.min(100, (current / need) * 100);
  return { heroId, current, need, remaining, pct, isMax: false };
}
