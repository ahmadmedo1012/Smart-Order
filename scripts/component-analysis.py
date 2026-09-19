#!/usr/bin/env python3
"""Connected-component analysis of the brand icon alpha mask."""
from PIL import Image
import sys
sys.setrecursionlimit(100000)

img = Image.open("/home/z/my-project/download/qa-round3/menu-brand-icon.png").convert("RGBA")
W, H = img.size
px = img.load()

# Opaque mask
opaque = [[px[x, y][3] > 100 for x in range(W)] for y in range(H)]

# Flood fill (iterative BFS, 4-connectivity)
visited = [[False] * W for _ in range(H)]
components = []
for sy in range(H):
    for sx in range(W):
        if opaque[sy][sx] and not visited[sy][sx]:
            stack = [(sx, sy)]
            visited[sy][sx] = True
            pts = []
            while stack:
                x, y = stack.pop()
                pts.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and opaque[ny][nx] and not visited[ny][nx]:
                        visited[ny][nx] = True
                        stack.append((nx, ny))
            components.append(pts)

print(f"MENU icon: {len(components)} connected components (alpha>100):")
for i, pts in enumerate(components):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    area = len(pts)
    # Sample a color from the middle of the component
    mid_pt = pts[len(pts)//2]
    c = px[mid_pt[0], mid_pt[1]]
    print(f"  #{i+1}: bbox x {min(xs)}..{max(xs)}, y {min(ys)}..{max(ys)} ({max(xs)-min(xs)+1}x{max(ys)-min(ys)+1}), area={area}px, sample color #{c[0]:02x}{c[1]:02x}{c[2]:02x}")

# Same for bot
img2 = Image.open("/home/z/my-project/download/qa-round3/bot-brand-icon.png").convert("RGBA")
px2 = img2.load()
opaque2 = [[px2[x, y][3] > 100 for x in range(W)] for y in range(H)]
visited2 = [[False] * W for _ in range(H)]
components2 = []
for sy in range(H):
    for sx in range(W):
        if opaque2[sy][sx] and not visited2[sy][sx]:
            stack = [(sx, sy)]
            visited2[sy][sx] = True
            pts = []
            while stack:
                x, y = stack.pop()
                pts.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and opaque2[ny][nx] and not visited2[ny][nx]:
                        visited2[ny][nx] = True
                        stack.append((nx, ny))
            components2.append(pts)

print(f"\nBOT icon: {len(components2)} connected components:")
for i, pts in enumerate(components2):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    area = len(pts)
    mid_pt = pts[len(pts)//2]
    c = px2[mid_pt[0], mid_pt[1]]
    print(f"  #{i+1}: bbox x {min(xs)}..{max(xs)}, y {min(ys)}..{max(ys)} ({max(xs)-min(xs)+1}x{max(ys)-min(ys)+1}), area={area}px, sample color #{c[0]:02x}{c[1]:02x}{c[2]:02x}")
