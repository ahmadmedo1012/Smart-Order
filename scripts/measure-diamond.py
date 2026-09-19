#!/usr/bin/env python3
"""Measure exact diamond geometry from the reference icon."""
from PIL import Image

img = Image.open("/home/z/my-project/download/qa-round3/menu-brand-icon.png").convert("RGBA")
W, H = img.size
px = img.load()

# Find diamond bounds: for each row, min/max opaque x
print("Diamond bounds per row (first/last opaque pixel):")
rows = {}
for y in range(H):
    xs = [x for x in range(W) if px[x, y][3] > 100]
    if xs:
        rows[y] = (min(xs), max(xs))

top = min(rows)
bottom = max(rows)
print(f"top row: {top} ({rows[top]}), bottom row: {bottom} ({rows[bottom]})")

# Width at various rows
for y in [top, top+10, 40, 80, 120, bottom-10, bottom]:
    if y in rows:
        lo, hi = rows[y]
        print(f"y={y:3d}: x from {lo} to {hi} (width {hi-lo+1})")

# Diamond corners: where width is maximal (middle) and where it starts (top/bottom)
mid_y = (top + bottom) // 2
lo, hi = rows[mid_y]
print(f"\nmiddle row {mid_y}: {lo}..{hi}")

# left/right extremes
left_x = min(rows[y][0] for y in rows)
right_x = max(rows[y][1] for y in rows)
print(f"left extreme x={left_x}, right extreme x={right_x}")

# The fork area bounds (white pixels)
white_ys = [y for y in range(H) for x in range(W) if px[x, y][:3] == (255, 255, 255) and px[x, y][3] > 200]
white_xs = [x for y in range(H) for x in range(W) if px[x, y][:3] == (255, 255, 255) and px[x, y][3] > 200]
if white_ys:
    print(f"\nwhite icon bounds: x {min(white_xs)}..{max(white_xs)}, y {min(white_ys)}..{max(white_ys)}")
    print(f"white icon size: {max(white_xs)-min(white_xs)+1} x {max(white_ys)-min(white_ys)+1}")
    print(f"canvas: {W}x{H} → white occupies {(max(white_xs)-min(white_xs)+1)/W*100:.0f}% x {(max(white_ys)-min(white_ys)+1)/H*100:.0f}%")
