# -*- coding: utf-8 -*-
from pathlib import Path
import re

p = Path(r"d:\PROJETOS\BugGame\shared\src\heroes.ts")
raw = p.read_bytes()
text = raw.decode("utf-8", errors="replace")

out = Path(r"d:\PROJETOS\BugGame\scripts\encoding-report.txt")
lines = []
for m in re.finditer(r"name: '([^']+)'", text):
    s = m.group(1)
    start = m.start(1)
    chunk = raw[start : start + len(s.encode("utf-8", errors="replace")) + 8]
    # find exact raw slice by searching ascii prefix
    prefix = s.split("\ufffd")[0].encode("ascii", errors="ignore")
    idx = raw.find(prefix) if prefix else -1
    lines.append(f"NAME={s.encode('unicode_escape').decode()} idx={idx}")
    if idx >= 0:
        lines.append(f"  RAW={raw[idx:idx+40]!r}")

# Also search for common corrupted patterns
for needle in [b"Ca", b"Chama", b"L", b"Aniquil"]:
    i = 0
    while True:
        i = raw.find(needle, i)
        if i < 0:
            break
        lines.append(f"HIT {needle!r}@{i}: {raw[i:i+30]!r}")
        i += 1
        if len([l for l in lines if l.startswith("HIT")]) > 40:
            break

out.write_text("\n".join(lines), encoding="utf-8")
print("wrote", out, "lines", len(lines))
