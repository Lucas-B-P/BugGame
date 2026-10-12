# -*- coding: utf-8 -*-
from PIL import Image
from collections import deque

img = Image.open(r"d:\PROJETOS\BugGame\jardim-sprites.png").convert("RGBA")
w, h = img.size
px = img.load()
BG = (170, 211, 143)


def is_bg(rgb, tol=18):
    r, g, b = rgb
    return abs(r - BG[0]) <= tol and abs(g - BG[1]) <= tol and abs(b - BG[2]) <= tol


n = 0
for y in range(0, h, 2):
    for x in range(0, w, 2):
        r, g, b, a = px[x, y]
        if a >= 10 and not is_bg((r, g, b)):
            n += 1
print("non-bg sampled", n)

visited = [[False] * h for _ in range(w)]
sizes = []
for y in range(h):
    for x in range(w):
        if visited[x][y]:
            continue
        r, g, b, a = px[x, y]
        if a < 10 or is_bg((r, g, b)):
            visited[x][y] = True
            continue
        q = deque([(x, y)])
        visited[x][y] = True
        cells = 0
        minx = maxx = x
        miny = maxy = y
        while q:
            cx, cy = q.popleft()
            cells += 1
            minx = min(minx, cx)
            maxx = max(maxx, cx)
            miny = min(miny, cy)
            maxy = max(maxy, cy)
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = cx + dx, cy + dy
                if not (0 <= nx < w and 0 <= ny < h) or visited[nx][ny]:
                    continue
                nr, ng, nb, na = px[nx, ny]
                if na < 10 or is_bg((nr, ng, nb)):
                    visited[nx][ny] = True
                    continue
                visited[nx][ny] = True
                q.append((nx, ny))
        bw = maxx - minx + 1
        bh = maxy - miny + 1
        sizes.append((cells, bw, bh, minx, miny))

sizes.sort(reverse=True)
print("components", len(sizes))
print("top 20:")
for s in sizes[:20]:
    print(s)
print("big >400", sum(1 for c, bw, bh, *_ in sizes if bw > 400 or bh > 400))
print("small <80", sum(1 for c, *_ in sizes if c < 80))
