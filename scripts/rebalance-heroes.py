# -*- coding: utf-8 -*-
from pathlib import Path
import re

p = Path(r"d:\PROJETOS\BugGame\shared\src\heroes.ts")
t = p.read_text(encoding="utf-8")

xp_map = {
    "fallen1": 90,
    "fallen2": 200,
    "fallen3": 340,
    "golem1": 520,
    "golem2": 740,
    "golem3": 1000,
    "reaper1": 1350,
    "reaper2": 1750,
    "reaper3": 2250,
    "valk1": 2850,
    "valk2": 3600,
    "valk3": 4500,
    "oracle1": 5600,
    "oracle2": 7000,
    "oracle3": 9999,
}
dmg_map = {
    "fallen1": 1.0,
    "fallen2": 1.15,
    "fallen3": 1.35,
    "golem1": 1.55,
    "golem2": 1.8,
    "golem3": 2.1,
    "reaper1": 2.4,
    "reaper2": 2.75,
    "reaper3": 3.1,
    "valk1": 3.4,
    "valk2": 3.75,
    "valk3": 4.15,
    "oracle1": 4.55,
    "oracle2": 5.0,
    "oracle3": 5.5,
}


def patch_hero_block(text: str, hid: str, xp: int, dmg: float) -> str:
    m = re.search(rf"({hid}: \{{.*?\n  \}},)", text, re.S)
    if not m:
        print("missing", hid)
        return text
    block = m.group(1)
    block = re.sub(r"xpToEvolve: \d+", f"xpToEvolve: {xp}", block)
    block = re.sub(r"damageMul: [0-9.]+", f"damageMul: {dmg}", block)
    return text[: m.start(1)] + block + text[m.end(1) :]


for hid, xp in xp_map.items():
    t = patch_hero_block(t, hid, xp, dmg_map[hid])

power_dmg = {
    1: 32,
    2: 42,
    3: 54,
    4: 68,
    5: 84,
    6: 102,
    7: 124,
    8: 150,
    9: 180,
    10: 210,
    11: 245,
    12: 285,
    13: 330,
    14: 380,
    15: 440,
}
for n, d in power_dmg.items():
    t = re.sub(
        rf"(power{n}: \{{ id: 'power{n}', name: '[^']+', damage: )\d+",
        rf"\g<1>{d}",
        t,
    )

old = """export function powerAttackDamage(heroId: HeroId): number {
  const def = HEROES[heroId];
  const power = POWERS[def.powerId];
  return Math.round(power.damage * staffTierBonus(def.staffTier) * def.damageMul);
}"""
new = """export function powerAttackDamage(heroId: HeroId): number {
  const def = HEROES[heroId];
  const power = POWERS[def.powerId];
  // Escala menos agressiva que o cajado (evita one-shot em bosses)
  const scale = staffTierBonus(def.staffTier) * Math.sqrt(def.damageMul);
  return Math.round(power.damage * scale);
}"""
if old not in t:
    raise SystemExit("powerAttackDamage block not found")
t = t.replace(old, new)

p.write_text(t, encoding="utf-8")
print("heroes patched ok")
