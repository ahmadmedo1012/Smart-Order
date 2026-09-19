#!/usr/bin/env python3
"""Generate the Smart Order brand-icon.png following the EXACT family template.

Family recipe (measured from menu/bot brand-icon.png):
- Solid diamond (rotated square), vertices ~(80,5),(155,80),(80,155),(5,80) on 160x160
- Vertical gradient: #ffb300 (top) -> #ff7600 (bottom)
- Center: solid WHITE product icon silhouette, no outline, small (~14% x 24% of canvas)
- Transparent background

Smart Order center icon: shopping bag (order/delivery product).
Rendered at 4x (640) then downscaled for crisp anti-aliasing.
"""
from PIL import Image, ImageDraw
import math

S = 4  # supersample factor
CANVAS = 160 * S  # 640

img = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))

# --- Gradient diamond ---
# vertices scaled from measured: (80,5),(155,80),(80,155),(5,80) -> 4x
top = (80 * S, 5 * S)
right = (155 * S, 80 * S)
bottom = (80 * S, 155 * S)
left = (5 * S, 80 * S)

# Build gradient: for each y row, blend #ffb300 -> #ff7600
C_TOP = (255, 179, 0)     # #ffb300
C_BOT = (255, 118, 0)     # #ff7600

grad = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
gd = ImageDraw.Draw(grad)
y_top = top[1]
y_bot = bottom[1]
for y in range(y_top, y_bot + 1):
    t = (y - y_top) / (y_bot - y_top)
    r = round(C_TOP[0] + (C_BOT[0] - C_TOP[0]) * t)
    g = round(C_TOP[1] + (C_BOT[1] - C_TOP[1]) * t)
    b = round(C_TOP[2] + (C_BOT[2] - C_TOP[2]) * t)
    gd.line([(0, y), (CANVAS, y)], fill=(r, g, b, 255))

# Diamond mask (with slightly rounded corners at the 4 vertices, like the ref)
# Reference vertices are 2px wide at tips — effectively sharp but AA'd.
mask = Image.new("L", (CANVAS, CANVAS), 0)
md = ImageDraw.Draw(mask)
md.polygon([top, right, bottom, left], fill=255)

diamond = Image.composite(grad, Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0)), mask)
img.alpha_composite(diamond)

# --- White shopping bag silhouette (family center icon style) ---
# Reference icon: solid white, geometric, rounded, ~22x38 @ center of 160
# Scaled 4x: bag ~88x152 area centered at (320,320).
# Bag: body rounded-rect + handle (arc). Vertically-oriented like the fork.
WHITE = (255, 255, 255, 255)
d = ImageDraw.Draw(img)

# Center: (320, 320). Bag body: w=104, h=112 → x 268..372, y 288..400
# Handle: arc spanning above body.
# Proportion check vs fork: fork 22w x 38h (tall). Bag: 26w x 38h equivalent → 104x152 @4x total incl. handle.
# Body: x 264..376 (112w), y 316..420 (104h). Handle: arc from (296, 316) to (344, 316), radius ~40, top at y~272.
body_x0, body_y0, body_x1, body_y1 = 264, 318, 376, 420
radius = 20  # rounded corners (family style is rounded)

d.rounded_rectangle([body_x0, body_y0, body_x1, body_y1], radius=radius, fill=WHITE)

# Handle: ring segment — draw thick arc
handle_cx = (body_x0 + body_x1) // 2  # 320
handle_r = 48
handle_w = 22  # stroke width
handle_top_y = 268
# Draw arc as pieslice difference: outer circle minus inner circle, only top half
outer_r = handle_r + handle_w // 2
inner_r = handle_r - handle_w // 2
# Outer half-disc
d.pieslice([handle_cx - outer_r, handle_top_y - 0, handle_cx + outer_r, handle_top_y + outer_r],
           start=180, end=360, fill=WHITE)
# Cut inner half-disc (composite approach: use a temp mask)
handle_layer = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
hd = ImageDraw.Draw(handle_layer)
hd.pieslice([handle_cx - outer_r, handle_top_y, handle_cx + outer_r, handle_top_y + outer_r],
            start=180, end=360, fill=WHITE)
hd.pieslice([handle_cx - inner_r, handle_top_y, handle_cx + inner_r, handle_top_y + inner_r],
            start=180, end=360, fill=(0, 0, 0, 0))
# Round the handle tips slightly by intersecting with body start
img.alpha_composite(handle_layer)

# Clean up: handle should only exist above the body top (y <= body_y0+2) —
# the pieslices start at handle_top_y (268) which is above body top (318), good.
# But tips are flat at y=handle_top_y — round them:
# (minor: the tips get hidden slightly behind the body since body top 318 > handle bottom edge 316+2)
# Actually pieslice chord is at y = handle_top_y + 0 = 268. Tips at (272..368, 268) flat.
# The reference fork has rounded everything; round the tips with small circles:
for tip_x in (handle_cx - handle_r, handle_cx + handle_r):
    d.ellipse([tip_x - handle_w // 2, handle_top_y - handle_w // 2 + 26,
               tip_x + handle_w // 2, handle_top_y + handle_w // 2 + 26], fill=WHITE)

# --- Downscale to all family sizes ---
out_dir = "/home/z/my-project/public"
import os
os.makedirs(out_dir, exist_ok=True)

for size, name in [(160, "brand-icon.png"),
                   (512, "icon-512.png"),
                   (192, "icon-192.png"),
                   (180, "apple-touch-icon.png"),
                   (48, "favicon.png")]:
    small = img.resize((size, size), Image.LANCZOS)
    small.save(f"{out_dir}/{name}")
    print(f"saved {out_dir}/{name} ({size}x{size})")

# favicon.ico (16+32+48)
img.resize((48, 48), Image.LANCZOS).save(f"{out_dir}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("saved favicon.ico")

# Preview copy for QA
img.resize((640, 640), Image.LANCZOS).convert("RGB").save("/home/z/my-project/download/qa-round3/order-brand-preview.png")
print("saved preview")
