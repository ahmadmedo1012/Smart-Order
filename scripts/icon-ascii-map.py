#!/usr/bin/env python3
"""ASCII-map the brand icon to understand exact geometry."""
from PIL import Image

def classify(c):
    r, g, b, a = c
    if a < 64: return "."
    if r > 230 and g > 230 and b > 220: return "W"  # white-ish
    if r > 220 and g > 150 and b < 100: return "y"  # yellow
    if r > 200 and 80 < g < 160 and b < 60: return "o"  # orange
    if r < 90 and g < 70 and b < 60: return "K"  # dark
    return "?"

for name in ["menu-brand-icon", "bot-brand-icon"]:
    img = Image.open(f"/home/z/my-project/download/qa-round3/{name}.png").convert("RGBA")
    W, H = img.size
    # 40x40 downsample map
    step = 4
    print(f"\n=== {name} 40x40 map (.=transparent) ===")
    for y in range(0, H, step):
        line = ""
        for x in range(0, W, step):
            # sample the center of each cell
            c = img.getpixel((min(x+1, W-1), min(y+1, H-1)))
            line += classify(c)
        print(line)
