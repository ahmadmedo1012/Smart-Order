#!/usr/bin/env python3
"""Smart Order brand icon — EXACT family frame reused from the reference.

Strategy: take menu-brand-icon.png, keep its 4 gradient L-brackets PIXEL-IDENTICAL,
replace only the white center diamond's cutout: fork -> shopping bag.
The center diamond layer is drawn at 4x for crisp AA, downscaled, composited.
"""
from PIL import Image, ImageDraw
import os

REF = "/home/z/my-project/download/qa-round3/menu-brand-icon.png"
ref = Image.open(REF).convert("RGBA")
W, H = ref.size  # 160x160

# --- 1. Frame layer: reference minus the center diamond region ---
frame = ref.copy()
fd = ImageDraw.Draw(frame)
# The center diamond bbox: x 55..104, y 55..104. Clear a slightly larger safe area
# but brackets overlap up to x/y 94 — so we cut exactly the diamond shape, not the bbox.
# The white diamond: vertices (79.5,55) (104,79.5) (79.5,104) (55,79.5)
# Clear the whole diamond polygon:
fd.polygon([(80, 53), (106, 80), (80, 107), (54, 80)], fill=(0, 0, 0, 0))

# --- 2. Center diamond layer at 4x ---
S = 4
big = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
bd = ImageDraw.Draw(big)
cx = 79.5 * S  # 318
# White diamond, vertices scaled (from measured 55..104 -> midpoint 79.5, half-diag 25)
half = 26 * S  # slightly generous, then we match the visual size
N = (cx, (79.5 - 26) * S)
E = ((79.5 + 26) * S, cx)
Sv = (cx, (79.5 + 26) * S)
Wv = ((79.5 - 26) * S, cx)
bd.polygon([N, E, Sv, Wv], fill=(255, 253, 251, 255))

# Shopping bag CUTOUT (transparent) — centered at (cx, cy)
cy = 79.5 * S
# Bag body: w=13*2=26*? — family fork cutout was 22x38 at 160 -> 88x152 at 640
# Bag (wider than tall): body 112w x 96h at 4x (=28x24 at 160), handle arc above
bag_w, bag_h = 116, 92
bx0, by0 = cx - bag_w // 2, cy - bag_h // 2 + 8 * S
bx1, by1 = cx + bag_w // 2, cy + bag_h // 2 + 8 * S
bd.rounded_rectangle([bx0, by0, bx1, by1], radius=14, fill=(0, 0, 0, 0))
# Handle: thick arc above body
hr = 34  # radius
hw = 20  # stroke
htop = by0 - 6  # top of handle
outer_r, inner_r = hr + hw // 2, hr - hw // 2
bd.pieslice([cx - outer_r, htop, cx + outer_r, htop + outer_r], start=180, end=360, fill=(0, 0, 0, 0))
bd.pieslice([cx - inner_r, htop + (outer_r - inner_r), cx + inner_r, htop + outer_r], start=180, end=360, fill=(255, 253, 251, 255))

# Downscale and composite
center_small = big.resize((W, H), Image.LANCZOS)
out = frame.copy()
out.alpha_composite(center_small)

# --- 3. Export all sizes ---
out_dir = "/home/z/my-project/public"
os.makedirs(out_dir, exist_ok=True)
for size, name in [(160, "brand-icon.png"), (512, "icon-512.png"), (192, "icon-192.png"),
                   (180, "apple-touch-icon.png"), (48, "favicon.png")]:
    s = out.resize((size, size), Image.LANCZOS)
    s.save(f"{out_dir}/{name}")
    print(f"saved {name} ({size})")
out.resize((48, 48), Image.LANCZOS).save(f"{out_dir}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("saved favicon.ico")

# Preview
prev = out.resize((640, 640), Image.LANCZOS)
canvas = Image.new("RGBA", (640, 640), (1, 0, 0, 255))
canvas.alpha_composite(prev)
canvas.convert("RGB").save("/home/z/my-project/download/qa-round3/order-brand-v2.png")
print("saved preview v2")

# Also verify component structure matches (5 pieces)
import sys
sys.path.insert(0, "/home/z/my-project/scripts")
