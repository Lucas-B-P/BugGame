# -*- coding: utf-8 -*-
"""Extrai sprites do atlas de jardim via chroma key + componentes conexos."""
from __future__ import annotations

import json
import shutil
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

SRC = Path(r"d:\PROJETOS\BugGame\jardim-sprites.png")
OUT = Path(r"d:\PROJETOS\BugGame\client\public\assets\garden")
DATA = Path(r"d:\PROJETOS\BugGame\client\src\data")


def is_bg(r: int, g: int, b: int) -> bool:
    if 150 <= r <= 185 and 198 <= g <= 225 and 120 <= b <= 160:
        if (g - r) >= 20 and (g - b) >= 45:
            return True
    return False


def classify(x: int, y: int, w: int, h: int, area: int) -> str:
    cx = x + w / 2
    cy = y + h / 2
    if cx < 260:
        if w >= 40 and h >= 40 and abs(w - h) < 25:
            return "grass"
        return "path"
    if cx < 640 and cy < 360:
        if h >= 70 or (w >= 55 and h >= 55 and area > 2500):
            return "tree"
        if w >= 70 and h <= 50:
            return "hedge"
        return "bush"
    if cx < 720 and cy < 560:
        if area < 1200 and max(w, h) < 55:
            return "flower"
        return "crop"
    if 700 < cx < 980 and cy < 420:
        return "water"
    if cx >= 980 and cy < 520:
        return "structure"
    if cx >= 1100:
        return "furniture"
    if cy > 600:
        return "rock"
    if area < 900:
        return "flower"
    return "decor"


def usable(kind: str, w: int, h: int) -> bool:
    if kind == "grass":
        return 40 <= w <= 100 and 40 <= h <= 100
    if kind == "tree":
        return 40 <= w <= 140 and 60 <= h <= 160
    if kind == "bush":
        return 30 <= w <= 110 and 25 <= h <= 100
    if kind == "hedge":
        return w >= 50 and h <= 70
    if kind == "flower":
        return max(w, h) <= 70 and min(w, h) >= 12
    if kind == "rock":
        return max(w, h) <= 90 and min(w, h) >= 12
    if kind == "path":
        return max(w, h) <= 140
    if kind == "water":
        return 40 <= w <= 180 and 40 <= h <= 180
    if kind == "structure":
        return 50 <= w <= 180 and 50 <= h <= 180
    if kind == "furniture":
        return 20 <= w <= 120 and 20 <= h <= 120
    if kind == "crop":
        return 30 <= w <= 120 and 30 <= h <= 120
    return max(w, h) <= 120


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    DATA.mkdir(parents=True, exist_ok=True)
    for p in OUT.glob("*"):
        p.unlink()

    src = Image.open(SRC).convert("RGBA")
    w, h = src.size
    sp = src.load()

    mask = Image.new("L", (w, h), 0)
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = sp[x, y]
            if a >= 8 and not is_bg(r, g, b):
                mp[x, y] = 255

    mask = mask.filter(ImageFilter.MinFilter(3))
    mp = mask.load()

    visited = [[False] * h for _ in range(w)]
    sprites = []

    for y in range(h):
        for x in range(w):
            if visited[x][y] or mp[x, y] == 0:
                visited[x][y] = True
                continue

            q = deque([(x, y)])
            visited[x][y] = True
            cells: list[tuple[int, int]] = []
            minx = maxx = x
            miny = maxy = y
            while q:
                cx, cy = q.popleft()
                cells.append((cx, cy))
                minx = min(minx, cx)
                maxx = max(maxx, cx)
                miny = min(miny, cy)
                maxy = max(maxy, cy)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if not (0 <= nx < w and 0 <= ny < h) or visited[nx][ny]:
                        continue
                    if mp[nx, ny] == 0:
                        visited[nx][ny] = True
                        continue
                    visited[nx][ny] = True
                    q.append((nx, ny))

            bw = maxx - minx + 1
            bh = maxy - miny + 1
            area = len(cells)
            if area < 120 or bw < 10 or bh < 10:
                continue
            if bw > 280 or bh > 280:
                continue

            pad = 2
            x0 = max(0, minx - pad)
            y0 = max(0, miny - pad)
            x1 = min(w, maxx + pad + 1)
            y1 = min(h, maxy + pad + 1)
            cw, ch = x1 - x0, y1 - y0
            crop = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
            cp = crop.load()
            content = 0
            tminx, tminy, tmaxx, tmaxy = cw, ch, -1, -1
            for yy in range(y0, y1):
                for xx in range(x0, x1):
                    r, g, b, a = sp[xx, yy]
                    if a < 8 or is_bg(r, g, b):
                        continue
                    if xx < minx - 1 or xx > maxx + 1 or yy < miny - 1 or yy > maxy + 1:
                        continue
                    cp[xx - x0, yy - y0] = (r, g, b, a)
                    content += 1
                    lx, ly = xx - x0, yy - y0
                    tminx = min(tminx, lx)
                    tminy = min(tminy, ly)
                    tmaxx = max(tmaxx, lx)
                    tmaxy = max(tmaxy, ly)

            if content < 100 or tmaxx < 0:
                continue

            trimmed = crop.crop((tminx, tminy, tmaxx + 1, tmaxy + 1))
            tw, th = trimmed.size
            kind = classify(minx, miny, tw, th, content)
            if not usable(kind, tw, th):
                continue

            idx = len(sprites)
            name = f"{kind}_{idx:03d}"
            trimmed.save(OUT / f"{name}.png")
            sprites.append(
                {
                    "id": name,
                    "kind": kind,
                    "file": f"{name}.png",
                    "w": tw,
                    "h": th,
                    "x": minx,
                    "y": miny,
                }
            )

    by_kind: dict[str, list[str]] = {}
    for s in sprites:
        by_kind.setdefault(s["kind"], []).append(s["id"])

    manifest = {"count": len(sprites), "sprites": sprites, "byKind": by_kind}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (DATA / "gardenManifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    shutil.copy2(SRC, OUT / "jardim-sprites.png")

    print(f"Saved {len(sprites)} usable sprites")
    for k, ids in sorted(by_kind.items()):
        print(f"  {k}: {len(ids)}")


if __name__ == "__main__":
    main()
