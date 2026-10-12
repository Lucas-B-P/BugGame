# -*- coding: utf-8 -*-
"""Copia e redimensiona frames de herois, poderes, trajeto e cajados para o client/public."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(r"d:\PROJETOS\BugGame")
OUT = ROOT / "client" / "public" / "assets" / "heroes"
POWER_OUT = ROOT / "client" / "public" / "assets" / "powers"
STAFF_OUT = ROOT / "client" / "public" / "assets" / "weapons"
DATA = ROOT / "client" / "src" / "data"
POWER_SRC = ROOT / "assets-temp" / "power" / "PNG"

HEROES = {
    "fallen1": ROOT / "assets-temp/fallen/Fallen_Angels_1/PNG/PNG Sequences",
    "fallen2": ROOT / "assets-temp/fallen/Fallen_Angels_2/PNG/PNG Sequences",
    "fallen3": ROOT / "assets-temp/fallen/Fallen_Angels_3/PNG/PNG Sequences",
    "golem1": ROOT / "assets-temp/golem/Golem_1/PNG/PNG Sequences",
    "golem2": ROOT / "assets-temp/golem/Golem_2/PNG/PNG Sequences",
    "golem3": ROOT / "assets-temp/golem/Golem_3/PNG/PNG Sequences",
    "reaper1": ROOT / "assets-temp/reaper/Reaper_Man_1/PNG/PNG Sequences",
    "reaper2": ROOT / "assets-temp/reaper/Reaper_Man_2/PNG/PNG Sequences",
    "reaper3": ROOT / "assets-temp/reaper/Reaper_Man_3/PNG/PNG Sequences",
}

# pasta_origem -> (nome_anim, step, max_frames)
ANIMS = {
    "Idle": ("idle", 2, 10),
    "Walking": ("walk", 2, 12),
    "Slashing": ("attack", 1, 12),
    "Dying": ("die", 1, 15),
    "Hurt": ("hurt", 2, 6),
    "Throwing": ("cast", 1, 12),
}

SIZE = 128


def clear_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def save_resized(src: Path, dst: Path, size: tuple[int, int] = (SIZE, SIZE)) -> None:
    img = Image.open(src).convert("RGBA")
    img = img.resize(size, Image.Resampling.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst)


def numbered_pngs(folder: Path) -> list[Path]:
    files = list(folder.glob("*.png"))

    def key(p: Path) -> int:
        digits = "".join(ch for ch in p.stem if ch.isdigit())
        return int(digits) if digits else 0

    return sorted(files, key=key)


def export_hero(hero_id: str, base: Path) -> dict:
    meta = {"id": hero_id, "anims": {}}
    for folder, (anim, step, limit) in ANIMS.items():
        src_dir = base / folder
        if not src_dir.exists():
            continue
        files = numbered_pngs(src_dir)
        picked = files[::step][:limit]
        frames = []
        for i, f in enumerate(picked):
            name = f"{hero_id}_{anim}_{i:03d}.png"
            save_resized(f, OUT / hero_id / name)
            frames.append(name)
        meta["anims"][anim] = frames
        print(f"  {hero_id}/{anim}: {len(frames)}")
    return meta


def collect_power_frames(folder: Path) -> list[Path]:
    flat = numbered_pngs(folder)
    if flat:
        return flat[:10]
    # pastas aninhadas: usa a ultima subpasta (impacto final)
    subs = sorted([p for p in folder.iterdir() if p.is_dir()], key=lambda p: p.name)
    if not subs:
        return []
    return numbered_pngs(subs[-1])[:10]


def export_flat_power(n: int, folder: Path) -> dict | None:
    files = collect_power_frames(folder)
    if not files:
        return None
    frames = []
    for i, f in enumerate(files[:10]):
        name = f"power{n}_{i:03d}.png"
        img = Image.open(f).convert("RGBA").resize((96, 96), Image.Resampling.LANCZOS)
        img.save(POWER_OUT / name)
        frames.append(name)
    print(f"  power{n}: {len(frames)}")
    return {"id": f"power{n}", "name": f"Poder {n}", "frames": frames}


def export_powers() -> list[dict]:
    clear_dir(POWER_OUT)
    powers: list[dict] = []
    # Impactos: Explosion_1..6 e 8..10 (pula 7 = trajeto)
    mapping = [1, 2, 3, 4, 5, 6, 8, 9, 10]
    for idx, explosion_n in enumerate(mapping, start=1):
        folder = POWER_SRC / f"Explosion_{explosion_n}"
        if not folder.exists():
            continue
        meta = export_flat_power(idx, folder)
        if meta:
            powers.append(meta)
    return powers


def export_trail() -> list[str]:
    """Explosion_7 pastas 1,2,3 em sequencia = trajetoria do poder."""
    frames: list[str] = []
    i = 0
    for stage in (1, 2, 3):
        folder = POWER_SRC / "Explosion_7" / str(stage)
        if not folder.exists():
            continue
        for f in numbered_pngs(folder):
            name = f"trail_{i:03d}.png"
            img = Image.open(f).convert("RGBA").resize((72, 72), Image.Resampling.LANCZOS)
            img.save(POWER_OUT / name)
            frames.append(name)
            i += 1
    print(f"  trail: {len(frames)}")
    return frames


def export_staffs() -> dict:
    clear_dir(STAFF_OUT)
    staffs = []
    for n in range(1, 9):
        folder = ROOT / f"assets-temp/cajado/PNG/Staves_{n}"
        body = folder / "1.png"
        tip = folder / "3.png"
        if not body.exists():
            continue
        staff_name = f"staff_{n}.png"
        bolt_name = f"bolt_{n}.png"
        Image.open(body).convert("RGBA").resize((96, 32), Image.Resampling.LANCZOS).save(STAFF_OUT / staff_name)
        tip_src = tip if tip.exists() else body
        Image.open(tip_src).convert("RGBA").resize((48, 16), Image.Resampling.LANCZOS).save(STAFF_OUT / bolt_name)
        staffs.append({"tier": n, "staff": staff_name, "bolt": bolt_name})
        print(f"  staff{n}")
    # aliases legados
    if staffs:
        shutil.copy(STAFF_OUT / staffs[0]["staff"], STAFF_OUT / "staff.png")
        shutil.copy(STAFF_OUT / staffs[0]["bolt"], STAFF_OUT / "bolt.png")
    return {"tiers": staffs, "staff": "staff.png", "bolt": "bolt.png"}


def main() -> None:
    clear_dir(OUT)
    DATA.mkdir(parents=True, exist_ok=True)
    heroes = []
    for hid, base in HEROES.items():
        print(f"=== {hid} ===")
        if not base.exists():
            print(f"  MISSING {base}")
            continue
        heroes.append(export_hero(hid, base))
    print("=== powers ===")
    powers = export_powers()
    print("=== trail ===")
    trail = export_trail()
    print("=== staff ===")
    weapons = export_staffs()
    manifest = {
        "heroes": heroes,
        "powers": powers,
        "trail": trail,
        "weapons": weapons,
        "frameSize": SIZE,
    }
    (DATA / "heroManifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print("done", DATA / "heroManifest.json")


if __name__ == "__main__":
    main()
