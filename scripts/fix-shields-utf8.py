# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(r"d:\PROJETOS\BugGame\shared\src\shields.ts")
raw = p.read_bytes()
try:
    text = raw.decode("utf-8")
except UnicodeDecodeError:
    text = raw.decode("cp1252", errors="replace")

# Fix known shield names via codepoints
fixes = {
    "Escudo de A": "Escudo de A" + chr(0xE7) + "o",  # maybe already broken
}
# Safer: replace by regex on known bad patterns
import re

def set_name(tier: int, name: str, text: str) -> str:
    return re.sub(
        rf"(tier: {tier},\s*rarity: '[^']+',\s*name: ')[^']*(')",
        rf"\g<1>{name}\2",
        text,
        count=1,
    )

names = {
    1: "Escudo de Madeira",
    2: "Escudo de Bronze",
    3: "Escudo de Ferro",
    4: "Escudo de A" + chr(0xE7) + "o",
    5: "Escudo R" + chr(0xFA) + "nico",
    6: "Escudo Dourado",
    7: "Escudo Ancestral",
    8: "Escudo M" + chr(0xED) + "tico",
}

for tier, name in names.items():
    text = set_name(tier, name, text)

# Also fix first comment if needed
p.write_text(text, encoding="utf-8", newline="\n")
raw2 = p.read_bytes()
print("Aco", ("A" + chr(0xE7) + "o").encode() in raw2)
print("Runico", ("R" + chr(0xFA) + "nico").encode() in raw2)
print("Mitico", ("M" + chr(0xED) + "tico").encode() in raw2)
print("OK shields")
