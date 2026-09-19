#!/usr/bin/env python3
"""Generate og-default.png (1200x630) for Smart Order — family template:
dark bg + warm radial glow center-right, brand icon top-right area,
gold/cream gradient headline, off-white subtext, RTL Arabic."""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display

W, H = 1200, 630
img = Image.new("RGB", (W, H), (1, 0, 0))
d = ImageDraw.Draw(img)

# Warm radial glow center-right (behind text)
glow = Image.new("L", (W, H), 0)
gd = ImageDraw.Draw(glow)
gd.ellipse([W - 700, 60, W + 160, H + 120], fill=90)
glow = glow.filter(ImageFilter.GaussianBlur(160))
warm = Image.new("RGB", (W, H), (188, 71, 0))  # flame #bc4700
img = Image.composite(warm, img, glow)
d = ImageDraw.Draw(img)

# subtle secondary amber tint lower-left
glow2 = Image.new("L", (W, H), 0)
g2 = ImageDraw.Draw(glow2)
g2.ellipse([100, H - 260, 620, H + 120], fill=45)
glow2 = glow2.filter(ImageFilter.GaussianBlur(140))
amber = Image.new("RGB", (W, H), (240, 166, 70))  # saffron
img = Image.composite(amber, img, glow2)
d = ImageDraw.Draw(img)

# --- Fonts (project woff2 — PIL handles them; Arabic needs presentation forms → cairo-arabic) ---
READEX = "/home/z/my-project/public/fonts/readex-pro-latin.woff2"  # Latin brand text
CAIRO = "/home/z/my-project/public/fonts/cairo-arabic.woff2"      # Arabic (has presentation forms)

def ar(text):
    return get_display(arabic_reshaper.reshape(text))

f_brand = ImageFont.truetype(READEX, 44)
f_h1 = ImageFont.truetype(CAIRO, 78)
f_sub = ImageFont.truetype(CAIRO, 34)
f_url = ImageFont.truetype(READEX, 28)

# --- Brand row (top-right): icon + Smart Order ---
brand_icon = Image.open("/home/z/my-project/public/brand-icon.png").convert("RGBA")
bi = brand_icon.resize((72, 72), Image.LANCZOS)
img.paste(bi, (W - 96, 56), bi)
d = ImageDraw.Draw(img)
brand_txt = "Smart Order"
d.text((W - 96 - 16 - d.textlength(brand_txt, font=f_brand), 68), brand_txt, font=f_brand, fill=(235, 231, 226))

# --- Headline (gold gradient) — RTL right-aligned ---
line1 = "متجر رقمي لمتجرك"
line2 = "والطلبات تصلك منظمة"
def draw_gradient_text(text, font, y, top_c, bot_c):
    # render text mask
    mask = Image.new("L", (W, H), 0)
    md = ImageDraw.Draw(mask)
    tw = md.textlength(text, font=font)
    x0 = W - 64 - tw
    md.text((x0, y), text, font=font, fill=255)
    # gradient fill
    grad = Image.new("RGB", (W, H), top_c)
    bbox = mask.getbbox()
    gy0, gy1 = bbox[1], bbox[3]
    for yy in range(gy0, gy1):
        t = (yy - gy0) / max(1, gy1 - gy0)
        r = round(top_c[0] + (bot_c[0] - top_c[0]) * t)
        g = round(top_c[1] + (bot_c[1] - top_c[1]) * t)
        b = round(top_c[2] + (bot_c[2] - top_c[2]) * t)
        ImageDraw.Draw(grad).line([(0, yy), (W, yy)], fill=(r, g, b))
    img.paste(grad, (0, 0), mask)

draw_gradient_text(ar(line1), f_h1, 190, (253, 227, 185), (229, 149, 0))
draw_gradient_text(ar(line2), f_h1, 280, (253, 227, 185), (229, 149, 0))

# --- Sub (off-white, Cairo) ---
sub = "أنشئ متجرك بصور وأسعار، واستقبل الطلبات فوراً من عملائك"
d = ImageDraw.Draw(img)
sw = d.textlength(ar(sub), font=f_sub)
d.text((W - 64 - sw, 400), ar(sub), font=f_sub, fill=(176, 169, 160))

# --- URL pill (bottom-right) ---
url = "order.smart-link.ly"
uw = d.textlength(url, font=f_url)
pad = 18
x1 = W - 64
x0 = x1 - uw - pad * 2
y0 = 490
y1 = y0 + 60
d.rounded_rectangle([x0, y0, x1, y1], radius=30, outline=(188, 71, 0), width=2)
d.text((x0 + pad, y0 + 14), url, font=f_url, fill=(240, 166, 70))

img.save("/home/z/my-project/public/og-default.png")
print("saved og-default.png")

# --- manifest.json ---
manifest = {
    "name": "الربط الذكي | Smart Order — منصة الطلبات الرقمية للمتاجر",
    "short_name": "Smart Order",
    "description": "متجر رقمي ذكي للمتاجر والمطاعم مع إدارة الطلبات والتوصيل والمدفوعات في ليبيا",
    "start_url": "/",
    "id": "/",
    "display": "standalone",
    "background_color": "#000000",
    "theme_color": "#bc4700",
    "dir": "rtl",
    "lang": "ar",
    "orientation": "portrait",
    "icons": [
        {"src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        {"src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"},
    ],
}
import json
with open("/home/z/my-project/public/manifest.json", "w", encoding="utf-8") as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)
print("saved manifest.json")
