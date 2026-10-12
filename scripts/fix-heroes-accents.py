# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(r"d:\PROJETOS\BugGame\shared\src\heroes.ts")
t = p.read_text(encoding="utf-8")
repls = {
    "Anjo Caido": "Anjo Ca\u00eddo",
    "Chama Caida": "Chama Ca\u00edda",
    "Lamina Azul": "L\u00e2mina Azul",
    "Aniquilacao": "Aniquila\u00e7\u00e3o",
    "Valquiria": "Valqu\u00edria",
    "Oraculo": "Or\u00e1culo",
    "Lanca Sagrada": "Lan\u00e7a Sagrada",
}
for a, b in repls.items():
    t = t.replace(a, b)
p.write_text(t, encoding="utf-8")
print("ok", "Ca\u00eddo" in t)
