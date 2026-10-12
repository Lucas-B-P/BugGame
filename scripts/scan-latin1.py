# -*- coding: utf-8 -*-
from pathlib import Path

roots = [
    Path(r"d:\PROJETOS\BugGame\shared\src"),
    Path(r"d:\PROJETOS\BugGame\client\src"),
    Path(r"d:\PROJETOS\BugGame\server\src"),
    Path(r"d:\PROJETOS\BugGame\client\index.html"),
]
report = []
for root in roots:
    files = [root] if root.is_file() else list(root.rglob("*.ts")) + list(root.rglob("*.html"))
    for f in files:
        raw = f.read_bytes()
        # Detect likely Windows-1252 high bytes outside valid UTF-8
        try:
            raw.decode("utf-8")
            utf_ok = True
        except UnicodeDecodeError as e:
            utf_ok = False
            report.append(f"BAD_UTF8 {f}: {e}")
            continue
        if b"\xed" in raw or b"\xe2mina" in raw or b"\xe7\xe3" in raw:
            # could be valid utf-8 multi-byte that happens to include those - check latin patterns
            if b"Ca\xeddo" in raw or b"Ca\xedda" in raw or b"L\xe2mina" in raw or b"Aniquila\xe7\xe3o" in raw:
                report.append(f"LATIN1 {f}")

Path(r"d:\PROJETOS\BugGame\scripts\encoding-report.txt").write_text(
    "\n".join(report) if report else "all ok", encoding="utf-8"
)
print("count", len(report))
for line in report:
    print(line)
