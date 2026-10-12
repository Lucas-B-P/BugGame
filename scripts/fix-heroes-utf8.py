# -*- coding: utf-8 -*-
from pathlib import Path

OUT = Path(r"d:\PROJETOS\BugGame\shared\src\heroes.ts")

def u(*codes: int) -> str:
    return "".join(chr(c) for c in codes)

# Accented fragments built without non-ASCII source bytes
CAIDO = "Ca" + u(0xED) + "do"          # Caido
CAIDA = "Ca" + u(0xED) + "da"          # Caida
LAMINA = "L" + u(0xE2) + "mina"        # Lamina
ANIQ = "Aniquila" + u(0xE7, 0xE3) + "o"  # Aniquilacao

heroes = [
    ("fallen1", 1, f"Anjo {CAIDO} I", "fallen1", 1.15, 1.0, 1.0, 22, "fallen2", 50, "power1", 1),
    ("fallen2", 2, f"Anjo {CAIDO} II", "fallen2", 1.18, 1.2, 1.25, 24, "fallen3", 110, "power2", 2),
    ("fallen3", 3, f"Anjo {CAIDO} III", "fallen3", 1.22, 1.4, 1.55, 26, "golem1", 180, "power3", 3),
    ("golem1", 4, "Golem I", "golem1", 0.95, 1.65, 1.9, 24, "golem2", 260, "power4", 4),
    ("golem2", 5, "Golem II", "golem2", 0.92, 1.9, 2.3, 26, "golem3", 360, "power5", 5),
    ("golem3", 6, "Golem III", "golem3", 0.88, 2.2, 2.8, 28, "reaper1", 480, "power6", 6),
    ("reaper1", 7, "Ceifador I", "reaper1", 1.05, 2.4, 3.3, 28, "reaper2", 620, "power7", 7),
    ("reaper2", 8, "Ceifador II", "reaper2", 1.1, 2.7, 3.9, 30, "reaper3", 800, "power8", 8),
    ("reaper3", 9, "Ceifador III", "reaper3", 1.15, 3.1, 4.6, 32, None, 9999, "power9", 8),
]

powers = [
    ("power1", f"Chama {CAIDA}", 36, 90, 4000, 380, 460),
    ("power2", f"{LAMINA} Azul", 48, 94, 4200, 400, 480),
    ("power3", "Tempestade Verde", 62, 100, 4400, 420, 500),
    ("power4", "Impacto Dourado", 80, 102, 4600, 430, 510),
    ("power5", "Pulso Violeta", 100, 110, 4800, 450, 520),
    ("power6", "Colosso", 125, 120, 5000, 460, 530),
    ("power7", "Corte Sombrio", 155, 118, 5000, 480, 540),
    ("power8", "Ceifar", 190, 125, 5200, 500, 560),
    ("power9", ANIQ, 240, 140, 5400, 540, 580),
]

parts: list[str] = []
parts.append(
    """export type HeroId =
  | 'fallen1'
  | 'fallen2'
  | 'fallen3'
  | 'golem1'
  | 'golem2'
  | 'golem3'
  | 'reaper1'
  | 'reaper2'
  | 'reaper3';

export type PowerId =
  | 'power1'
  | 'power2'
  | 'power3'
  | 'power4'
  | 'power5'
  | 'power6'
  | 'power7'
  | 'power8'
  | 'power9';

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
];

export const HEROES: Record<HeroId, HeroDef> = {
"""
)

for hid, st, name, folder, sp, hp, dmg, size, nxt, xp, pow, tier in heroes:
    nxt_js = "null" if nxt is None else f"'{nxt}'"
    parts.append(
        f"""  {hid}: {{
    id: '{hid}',
    stage: {st},
    name: '{name}',
    preview: 'assets/heroes/{folder}/{folder}_idle_000.png',
    speedMul: {sp},
    hpMul: {hp},
    damageMul: {dmg},
    size: {size},
    next: {nxt_js},
    xpToEvolve: {xp},
    powerId: '{pow}',
    staffTier: {tier},
  }},
"""
    )

parts.append("};\n\n")
parts.append(
    "export const POWERS: Record<\n"
    "  PowerId,\n"
    "  { id: PowerId; name: string; damage: number; radius: number; cooldownMs: number; range: number; speed: number }\n"
    "> = {\n"
)

for pid, name, dmg, rad, cd, rng, spd in powers:
    parts.append(
        f"  {pid}: {{ id: '{pid}', name: '{name}', damage: {dmg}, radius: {rad}, "
        f"cooldownMs: {cd}, range: {rng}, speed: {spd} }},\n"
    )

parts.append(
    """};

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
  return Math.round(power.damage * staffTierBonus(def.staffTier) * def.damageMul);
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
"""
)

text = "".join(parts)
OUT.write_text(text, encoding="utf-8", newline="\n")
raw = OUT.read_bytes()
print("caido", b"Ca\xc3\xaddo" in raw)
print("lamina", b"L\xc3\xa2mina" in raw)
print("anq", b"Aniquila\xc3\xa7\xc3\xa3o" in raw)
print("latin_bad", b"Ca\xeddo" in raw)
assert b"Ca\xc3\xaddo" in raw and b"Ca\xeddo" not in raw
print("OK", OUT)
