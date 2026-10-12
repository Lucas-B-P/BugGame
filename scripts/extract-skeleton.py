# -*- coding: utf-8 -*-
"""Extrai frames do Skeleton Crusader para client/public/assets/bosses/skeleton."""
from __future__ import annotations

import shutil
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(r"d:\PROJETOS\BugGame")
ZIP = ROOT / "skeletoboss.zip"
TMP = ROOT / "assets-temp" / "skeleton"
OUT = ROOT / "client" / "public" / "assets" / "bosses" / "skeleton"
SIZE = 192

# pasta CraftPix -> (anim game, step, max)
ANIMS = {
    "Idle": ("idle", 2, 9),
    "Walking": ("walk", 2, 12),
    "Throwing": ("attack", 1, 12),
    "Dying": ("die", 1, 15),
    "Hurt": ("hurt", 2, 6),
}


def clear(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def numbered(files: list[Path]) -> list[Path]:
    def key(p: Path) -> int:
        digits = "".join(ch for ch in p.stem if ch.isdigit())
        return int(digits) if digits else 0

    return sorted(files, key=key)


def main() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(ZIP) as z:
        z.extractall(TMP)

    base = TMP / "Skeleton_Crusader_3" / "PNG" / "PNG Sequences"
    if not base.exists():
        base = TMP / "Skeleton_Crusader_1" / "PNG" / "PNG Sequences"
    clear(OUT)

    for folder, (anim, step, limit) in ANIMS.items():
        src = base / folder
        if not src.exists():
            print("missing", src)
            continue
        files = numbered(list(src.glob("*.png")))[::step][:limit]
        for i, f in enumerate(files):
            img = Image.open(f).convert("RGBA").resize((SIZE, SIZE), Image.Resampling.LANCZOS)
            name = f"skeleton_{anim}_{i:03d}.png"
            img.save(OUT / name)
        print(f"  {anim}: {len(files)}")
    print("done", OUT)


if __name__ == "__main__":
    main()
