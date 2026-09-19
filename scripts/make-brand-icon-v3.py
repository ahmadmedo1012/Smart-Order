#!/usr/bin/env python3
"""Smart Order brand icon v3 — FINAL family recipe.

PROVEN template (pixel-verified):
1. 4 L-shaped gradient brackets forming a broken diamond frame — REUSED PIXEL-IDENTICAL from menu-brand-icon.png
2. Center floating diamond (~50x50) with vertical amber->orange gradient (#ffb300 -> #ff7600)
3. WHITE solid product icon painted on the center diamond (fork for menu, robot for bot, BAG for order)
"""
from PIL import Image, ImageDraw
import os

REF = "/home/z/my-project/download/qa-round3/menu-brand-icon.png"
ref = Image.open(REF).convert("RGBA")
W, H = ref.size  # 160

# --- 1. Frame: reference minus center diamond (cut the diamond polygon) ---
frame = ref.copy()
fd = ImageDraw.Draw(frame)
fd.polygon([(80, 53), (106, 80), (80, 107), (54, 80)], fill=(0, 0, 0, 0))

# --- 2. Center diamond + white bag, drawn at 6x for crisp AA ---
S = 6
big = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
bd = ImageDraw.Draw(big)

cx = cy = 79.5 * S
half = 25 * S  # diamond half-diagonal (measured 55..104 → half ≈ 25)

# Gradient diamond: build gradient image, mask with diamond polygon
C_TOP = (255, 179, 0)      # #ffb300
C_BOT = (255, 118, 0)      # #ff7600
y_top = (79.5 - 25) * S
y_bot = (79.5 + 25) * S
grad = Image.new("RGBA", big.size, (0, 0, 0, 0))
gd = ImageDraw.Draw(grad)
for y in range(int(y_top), int(y_bot) + 1):
    t = (y - y_top) / (y_bot - y_top)
    r = round(C_TOP[0] + (C_BOT[0] - C_TOP[0]) * t)
    g = round(C_TOP[1] + (C_BOT[1] - C_TOP[1]) * t)
    b = round(C_TOP[2] + (C_BOT[2] - C_TOP[2]) * t)
    gd.line([(0, y), (big.width, y)], fill=(r, g, b, 255))

dmask = Image.new("L", big.size, 0)
md = ImageDraw.Draw(dmask)
md.polygon([(cx, y_top), ((79.5 + 25) * S, cy), (cx, y_bot), ((79.5 - 25) * S, cy)], fill=255)
diamond = Image.composite(grad, Image.new("RGBA", big.size, (0, 0, 0, 0)), dmask)
big.alpha_composite(diamond)

# --- 3. White shopping bag with prominent handle ---
WHITE = (255, 253, 251, 255)
d = ImageDraw.Draw(big)

# Proportions modeled on the fork (22x38 @160 → 132x228 @6x, icon fills most of diamond height)
# Bag: body 100x120 + handle arc 70 wide above → total ~100x190, centered slightly low
bag_body_w, bag_body_h = 104, 118
bx0 = cx - bag_body_w // 2
bx1 = cx + bag_body_w // 2
by1 = cy + 95  # body bottom (slightly below center — diamond is wide there)
by0 = by1 - bag_body_h
d.rounded_rectangle([bx0, by0, bx1, by1], radius=22, fill=WHITE)

# Handle: thick rounded arc from body top
handle_r = 56
handle_w = 26
outer_r = handle_r + handle_w // 2
inner_r = handle_r - handle_w // 2
htop = by0 - handle_r - handle_w // 2 + 12  # overlap slightly into body
d.pieslice([cx - outer_r, htop, cx + outer_r, htop + 2 * outer_r], start=180, end=360, fill=WHITE)
# cut inner part of the ring
d.pieslice([cx - inner_r, htop + (outer_r - inner_r), cx + inner_r, htop + 2 * outer_r - (outer_r - inner_r)],
           start=180, end=360, fill=(0, 0, 0, 0))
# re-draw body (the pieslice cut may have touched it)
d.rounded_rectangle([bx0, by0, bx1, by1], radius=22, fill=WHITE)
# re-cut handle hole above body only (not inside body)
# handle hole: semi-annulus above body top
hole_top = htop + handle_w
d.pieslice([cx - inner_r, hole_top - (outer_r - inner_r), cx + inner_r, hole_top + inner_r * 2 - (outer_r - inner_r)],
           start=180, end=360, fill=(0, 0, 0, 0))

# Round the handle tips (where arc meets body) — small circles
for tip_x in (cx - handle_r, cx + handle_r):
    d.ellipse([tip_x - handle_w // 2, by0 - handle_w // 2 - 2, tip_x + handle_w // 2, by0 + handle_w // 2 - 2], fill=WHITE)

# Re-draw body one more time to ensure clean join, but only its lower part (below handle join)
d.rounded_rectangle([bx0, by0 + 6, bx1, by1], radius=20, fill=WHITE)

# --- Family-critical fix: the handle hole must show the DIAMOND GRADIENT through it
# (like the gaps between the reference fork's tines show the diamond) — NOT transparency.
# Re-fill the hole with the gradient sampled at each y.
hole_top = htop + handle_w
hy0 = hole_top - (outer_r - inner_r)
for y in range(int(hy0), int(by0) + 2):
    # gradient color at this y (relative to diamond bounds)
    t = max(0.0, min(1.0, (y - y_top) / (y_bot - y_top)))
    r = round(C_TOP[0] + (C_BOT[0] - C_TOP[0]) * t)
    g = round(C_TOP[1] + (C_BOT[1] - C_TOP[1]) * t)
    b = round(C_TOP[2] + (C_BOT[2] - C_TOP[2]) * t)
    # horizontal extent of the hole at this y (inside inner radius, above body)
    dy_hole = y - (htop + outer_r)  # relative to hole-disc center
    if abs(dy_hole) < inner_r:
        half_chord = int((inner_r * inner_r - dy_hole * dy_hole) ** 0.5)
        if half_chord > 1:
            # only where the body isn't (body top edge = by0, hole zone ends there)
            y_end = min(y, by0 - 1)
            if y <= by0:
                # erase white then paint gradient — but keep it inside the ring only
                d.line([(cx - half_chord, y), (cx + half_chord, y)], fill=(r, g, b, 255))

# --- 4. Downscale + composite ---
center_small = big.resize((W, H), Image.LANCZOS)
out = frame.copy()
out.alpha_composite(center_small)

# --- 5. Export all family sizes ---
out_dir = "/home/z/my-project/public"
os.makedirs(out_dir, exist_ok=True)
for size, name in [(160, "brand-icon.png"), (512, "icon-512.png"), (192, "icon-192.png"),
                   (180, "apple-touch-icon.png"), (48, "favicon.png")]:
    s = out.resize((size, size), Image.LANCZOS)
    s.save(f"{out_dir}/{name}")
    print(f"saved {name} ({size})")
out.resize((48, 48), Image.LANCZOS).save(f"{out_dir}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("saved favicon.ico")

prev = out.resize((640, 640), Image.LANCZOS)
canvas = Image.new("RGBA", (640, 640), (1, 0, 0, 255))
canvas.alpha_composite(prev)
canvas.convert("RGB").save("/home/z/my-project/download/qa-round3/order-brand-v3.png")
print("saved preview v3")
