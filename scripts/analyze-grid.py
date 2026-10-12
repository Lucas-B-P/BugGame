# -*- coding: utf-8 -*-
"""Analisa cores e tenta achar o tamanho da celula do grid."""
from collections import Counter
from PIL import Image

img = Image.open(r"d:\PROJETOS\BugGame\jardim-sprites.png").convert("RGB")
w, h = img.size
px = img.load()

# histogram quantized
hist = Counter()
for y in range(0, h, 2):
    for x in range(0, w, 2):
        r, g, b = px[x, y]
        hist[((r // 8) * 8, (g // 8) * 8, (b // 8) * 8)] += 1

print("Top colors:")
for c, n in hist.most_common(12):
    print(n, c)

# Row emptiness: fraction of near-bg pixels per row
BG = (170, 211, 143)


def near_bg(rgb, tol=26):
    r, g, b = rgb
    return abs(r - BG[0]) <= tol and abs(g - BG[1]) <= tol and abs(b - BG[2]) <= tol


row_empty = []
for y in range(h):
    empty = 0
    for x in range(0, w, 4):
        if near_bg(px[x, y]):
            empty += 1
    row_empty.append(empty / (w / 4))

# find stretches of mostly-empty rows (gutters)
gutters = [y for y, e in enumerate(row_empty) if e > 0.92]
print("gutter rows count", len(gutters))
# cluster consecutive
clusters = []
if gutters:
    start = prev = gutters[0]
    for y in gutters[1:]:
        if y == prev + 1:
            prev = y
        else:
            clusters.append((start, prev))
            start = prev = y
    clusters.append((start, prev))
print("gutter clusters (first 40):", clusters[:40])

# estimate cell height from midpoints of content bands
content_bands = []
prev_end = -1
for a, b in clusters:
    if a - prev_end > 8:
        content_bands.append((prev_end + 1, a - 1))
    prev_end = b
if prev_end < h - 1:
    content_bands.append((prev_end + 1, h - 1))
print("content bands", content_bands[:30])
heights = [b - a + 1 for a, b in content_bands if 10 < (b - a + 1) < 200]
print("band heights", heights[:40])
