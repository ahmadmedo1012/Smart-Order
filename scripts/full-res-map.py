#!/usr/bin/env python3
"""Full-resolution row analysis to understand the EXACT icon structure."""
from PIL import Image

img = Image.open("/home/z/my-project/download/qa-round3/menu-brand-icon.png").convert("RGBA")
W, H = img.size
px = img.load()

def cls(c):
    r, g, b, a = c
    if a < 64: return "."
    if r > 230 and g > 230 and b > 220: return "W"
    if r > 220 and g > 150: return "y"
    if r > 180: return "o"
    return "?"

# Full res map at 2px sampling (80 wide)
print("Full-res map (2px sampling, 80 cols):")
for y in range(0, H, 2):
    line = "".join(cls(px[x, y]) for x in range(0, W, 2))
    print(f"{y:3d} {line}")

# Detailed runs for key rows
print("\nRuns for row y=32 and y=48 (format: start-end:class):")
for yy in [32, 48, 64]:
    runs = []
    cur = None
    start = 0
    for x in range(W):
        c = cls(px[x, yy])
        if c != cur:
            if cur is not None and cur != ".":
                runs.append((start, x - 1, cur))
            cur = c
            start = x
    if cur != ".":
        runs.append((start, W - 1, cur))
    print(f"y={yy}: {runs}")
