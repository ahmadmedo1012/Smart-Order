#!/usr/bin/env python3
"""Forensic analysis of the family brand-icon.png structure."""
from PIL import Image
import sys

for name in ["menu-brand-icon.png", "bot-brand-icon.png"]:
    path = f"/home/z/my-project/download/qa-round3/{name}"
    img = Image.open(path).convert("RGBA")
    W, H = img.size
    print(f"\n=== {name} ({W}x{H}) ===")

    px = img.load()

    # Corner pixel (background)
    print(f"corner(0,0): {px[0,0]}  corner({W-1},{H-1}): {px[W-1,H-1]}")
    print(f"center({W//2},{H//2}): {px[W//2,H//2]}")

    # Scan horizontal line through center — map color bands
    def classify(c):
        r, g, b, a = c
        if a == 0: return "T"  # transparent
        if r > 240 and g > 240 and b > 240: return "W"  # white
        if r > 200 and g > 120 and b < 100: return "Y"  # yellow
        if r > 150 and g < 120 and b < 60: return "O"  # orange
        if r < 80 and g < 60 and b < 50: return "K"  # dark
        return "?"

    row = "".join(classify(px[x, H//2]) for x in range(W))
    print(f"row H/2: {row}")
    col = "".join(classify(px[W//2, y]) for y in range(H))
    print(f"col W/2: {col}")

    # Diagonal scan
    diag = "".join(classify(px[i, i]) for i in range(min(W, H)))
    print(f"diag:   {diag}")

    # Count colors
    from collections import Counter
    colors = Counter()
    for y in range(0, H, 2):
        for x in range(0, W, 2):
            c = px[x, y]
            colors[(c[0]//16, c[1]//16, c[2]//16, c[3]//16)] += 1
    print("top colors (r,g,b,a /16):", colors.most_common(8))

    # Alpha coverage
    opaque = sum(1 for y in range(H) for x in range(W) if px[x,y][3] > 128)
    print(f"opaque coverage: {opaque}/{W*H} = {opaque/(W*H)*100:.1f}%")
