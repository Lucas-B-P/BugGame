import type { ResourceDef, ResourceType, SpeciesDef, SpeciesId } from './types.js';

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  ant: {
    id: 'ant',
    name: 'Formiga',
    color: 0x2b2118,
    size: 10,
    speedMul: 1.28,
    hpMul: 1,
    damageMul: 1,
    ability: 'carry',
    abilityCooldownMs: 4000,
    evolutions: ['ladybug', 'bee', 'spider'],
    xpToEvolve: 55,
  },
  ladybug: {
    id: 'ladybug',
    name: 'Joaninha',
    color: 0xd62828,
    size: 13,
    speedMul: 1.05,
    hpMul: 1.2,
    damageMul: 1.05,
    ability: 'shield',
    abilityCooldownMs: 7000,
    evolutions: ['beetle'],
    xpToEvolve: 130,
  },
  beetle: {
    id: 'beetle',
    name: 'Besouro',
    color: 0x1d3557,
    size: 16,
    speedMul: 0.92,
    hpMul: 1.55,
    damageMul: 1.3,
    ability: 'charge',
    abilityCooldownMs: 5500,
    evolutions: [],
    xpToEvolve: 9999,
  },
  bee: {
    id: 'bee',
    name: 'Abelha',
    color: 0xf4a261,
    size: 12,
    speedMul: 1.18,
    hpMul: 0.9,
    damageMul: 0.95,
    ability: 'sting',
    abilityCooldownMs: 2000,
    evolutions: ['wasp'],
    xpToEvolve: 130,
  },
  wasp: {
    id: 'wasp',
    name: 'Vespa',
    color: 0xe9c46a,
    size: 14,
    speedMul: 1.22,
    hpMul: 1.0,
    damageMul: 1.1,
    ability: 'venom_sting',
    abilityCooldownMs: 2300,
    evolutions: [],
    xpToEvolve: 9999,
  },
  spider: {
    id: 'spider',
    name: 'Aranha',
    color: 0x4a4e69,
    size: 14,
    speedMul: 1.02,
    hpMul: 1.1,
    damageMul: 1.1,
    ability: 'web',
    abilityCooldownMs: 5000,
    evolutions: ['scorpion'],
    xpToEvolve: 130,
  },
  scorpion: {
    id: 'scorpion',
    name: 'Escorpião',
    color: 0x9a031e,
    size: 17,
    speedMul: 0.88,
    hpMul: 1.4,
    damageMul: 1.35,
    ability: 'venom_strike',
    abilityCooldownMs: 4200,
    evolutions: [],
    xpToEvolve: 9999,
  },
};

export const RESOURCES: Record<ResourceType, ResourceDef> = {
  fruit: { type: 'fruit', color: 0xe63946, xp: 3, food: 3, radius: 8 },
  mushroom: { type: 'mushroom', color: 0x9b5de5, xp: 5, food: 2, radius: 9 },
  leaf: { type: 'leaf', color: 0x80b918, xp: 2, food: 1, radius: 7 },
  water: { type: 'water', color: 0x4cc9f0, xp: 2, food: 0, radius: 7 },
  larva: { type: 'larva', color: 0xffb703, xp: 7, food: 4, radius: 8 },
};

export const RESOURCE_WEIGHTS: { type: ResourceType; weight: number }[] = [
  { type: 'leaf', weight: 38 },
  { type: 'water', weight: 22 },
  { type: 'fruit', weight: 18 },
  { type: 'mushroom', weight: 14 },
  { type: 'larva', weight: 8 },
];

export function pickWeightedResource(): ResourceType {
  const total = RESOURCE_WEIGHTS.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (const entry of RESOURCE_WEIGHTS) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }
  return 'leaf';
}
