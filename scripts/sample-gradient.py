#!/usr/bin/env python3
"""Sample exact gradient colors along the diamond's vertical axis."""
from PIL import Image

img = Image.open("/home/z/my-project/download/qa-round3/menu-brand-icon.png").convert("RGBA")
W, H = img.size
px = img.load()

# Sample straight down the center column (W/2 = 80)
print("Vertical gradient samples (center column, x=80):")
for y in range(0, H, 8):
    c = px[80, y]
    if c[3] > 128:
        print(f"  y={y:3d}: rgba{c}  hex=#{c[0]:02x}{c[1]:02x}{c[2]:02x}")

# Check the white fork pixels
print("\nWhite pixels samples (center area):")
for y in range(60, 100, 6):
    c = px[80, y]
    print(f"  y={y:3d}: rgba{c}")

# Sample diagonal from top of diamond to bottom
print("\nDiamond top and bottom points:")
for (x, y) in [(80, 8), (80, 152), (8, 80), (152, 80), (80, 40), (80, 120)]:
    c = px[x, y]
    print(f"  ({x},{y}): rgba{c}")

# The exact gradient: sample multiple rows fully inside diamond
print("\nRow color ranges (inside diamond only, alpha>200):")
for y in [16, 32, 48, 64, 80, 96, 112, 128, 144]:
    xs = [x for x in range(W) if px[x, y][3] > 200]
    if xs:
        left = px[min(xs) + 2, y]
        right = px[max(xs) - 2, y]
        mid = px[(min(xs) + max(xs)) // 2, y]
        print(f"  y={y:3d}: left=#{left[0]:02x}{left[1]:02x}{left[2]:02x} mid=#{mid[0]:02x}{mid[1]:02x}{mid[2]:02x} right=#{right[0]:02x}{right[1]:02x}{right[2]:02x}")
