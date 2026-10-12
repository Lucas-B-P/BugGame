# -*- coding: utf-8 -*-
"""Extrai Valkiria + Dark Oracle e atualiza heroManifest (sem apagar herois existentes)."""
from __future__ import annotations

import json
import shutil
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(r"d:\PROJETOS\BugGame")
OUT = ROOT / "client" / "public" / "assets" / "heroes"
POWER_OUT = ROOT / "client" / "public" / "assets" / "powers"
DATA = ROOT / "client" / "src" / "data"
MANIFEST = DATA / "heroManifest.json"
POWER_SRC = ROOT / "assets-temp" / "power" / "PNG"
SIZE = 128

ZIPS = {
    "valk": ROOT / "valkiria.zip",
    "oracle": ROOT / "dark-oracle.zip",
}

TMP = {
    "valk": ROOT / "assets-temp" / "valk",
    "oracle": ROOT / "assets-temp" / "oracle",
}

HEROES = {
    "valk1": ("valk", "Valkyrie_1"),
    "valk2": ("valk", "Valkyrie_2"),
    "valk3": ("valk", "Valkyrie_3"),
    "oracle1": ("oracle", "Dark_Oracle_1"),
    "oracle2": ("oracle", "Dark_Oracle_2"),
    "oracle3": ("oracle", "Dark_Oracle_3"),
}

ANIMS = {
    "Idle": ("idle", 2, 10),
    "Walking": ("walk", 2, 12),
    "Slashing": ("attack", 1, 12),
    "Dying": ("die", 1, 15),
    "Hurt": ("hurt", 2, 6),
    "Throwing": ("cast", 1, 12),
}

POWER_NAMES = {
    10: "Lanca Sagrada",
    11: "Julgamento",
    12: "Asas de Guerra",
    13: "Oraculo Negro",
    14: "Eclipse",
    15: "Apocalipse",
}

# Reusa explosoes existentes com ordem diferente para poderes 10-15
POWER_EXPLOSIONS = [8, 9, 10, 5, 6, 4]


def numbered_pngs(folder: Path) -> list[Path]:
    files = list(folder.glob("*.png"))

    def key(p: Path) -> int:
        digits = "".join(ch for ch in p.stem if ch.isdigit())
        return int(digits) if digits else 0

    return sorted(files, key=key)


def save_resized(src: Path, dst: Path, size: tuple[int, int] = (SIZE, SIZE)) -> None:
    img = Image.open(src).convert("RGBA").resize(size, Image.Resampling.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst)


def extract_zip(key: str) -> None:
    zpath = ZIPS[key]
    tmp = TMP[key]
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zpath) as z:
        z.extractall(tmp)
    print("extracted", key, "->", tmp)


def export_hero(hero_id: str, pack: str, folder_name: str) -> dict:
    base = TMP[pack] / folder_name / "PNG" / "PNG Sequences"
    if not base.exists():
        raise FileNotFoundError(base)
    out_dir = OUT / hero_id
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    meta = {"id": hero_id, "anims": {}}
    for folder, (anim, step, limit) in ANIMS.items():
        src_dir = base / folder
        if not src_dir.exists():
            print("  missing anim", hero_id, folder)
            continue
        files = numbered_pngs(src_dir)[::step][:limit]
        frames = []
        for i, f in enumerate(files):
            name = f"{hero_id}_{anim}_{i:03d}.png"
            save_resized(f, out_dir / name)
            frames.append(name)
        meta["anims"][anim] = frames
        print(f"  {hero_id}/{anim}: {len(frames)}")
    return meta


def collect_power_frames(folder: Path) -> list[Path]:
    flat = numbered_pngs(folder)
    if flat:
        return flat[:10]
    subs = sorted([p for p in folder.iterdir() if p.is_dir()], key=lambda p: p.name)
    if not subs:
        return []
    return numbered_pngs(subs[-1])[:10]


def export_extra_powers() -> list[dict]:
    POWER_OUT.mkdir(parents=True, exist_ok=True)
    powers = []
    for idx, explosion_n in enumerate(POWER_EXPLOSIONS, start=10):
        folder = POWER_SRC / f"Explosion_{explosion_n}"
        if not folder.exists():
            print("  missing power src", folder)
            continue
        files = collect_power_frames(folder)
        frames = []
        for i, f in enumerate(files[:10]):
            name = f"power{idx}_{i:03d}.png"
            Image.open(f).convert("RGBA").resize((96, 96), Image.Resampling.LANCZOS).save(POWER_OUT / name)
            frames.append(name)
        powers.append({"id": f"power{idx}", "name": POWER_NAMES[idx], "frames": frames})
        print(f"  power{idx}: {len(frames)}")
    return powers


def main() -> None:
    for key in ZIPS:
        extract_zip(key)

    new_heroes = []
    for hid, (pack, folder) in HEROES.items():
        print(f"=== {hid} ===")
        new_heroes.append(export_hero(hid, pack, folder))

    print("=== powers 10-15 ===")
    new_powers = export_extra_powers()

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    # remove ids antigos se re-export
    keep_ids = {h["id"] for h in new_heroes}
    manifest["heroes"] = [h for h in manifest["heroes"] if h["id"] not in keep_ids] + new_heroes
    # ordena pela ordem desejada
    order = [
        "fallen1", "fallen2", "fallen3",
        "golem1", "golem2", "golem3",
        "reaper1", "reaper2", "reaper3",
        "valk1", "valk2", "valk3",
        "oracle1", "oracle2", "oracle3",
    ]
    by_id = {h["id"]: h for h in manifest["heroes"]}
    manifest["heroes"] = [by_id[i] for i in order if i in by_id]

    keep_pids = {p["id"] for p in new_powers}
    manifest["powers"] = [p for p in manifest["powers"] if p["id"] not in keep_pids] + new_powers

    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print("done", MANIFEST)


if __name__ == "__main__":
    main()
