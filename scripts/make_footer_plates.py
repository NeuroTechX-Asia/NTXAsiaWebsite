"""Generate the two footer background plates.

footer-network.png — the dense line web behind the old neurotechx.org footer:
a few off-canvas hubs throwing long thin strands across a near-black teal field,
plus star specks and a vignette.
footer-poly.png — the low-poly teal band behind the copyright strip.

Pure Pillow (the site's conda env has no numpy). Deterministic seed.
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

random.seed(20261114)
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "assets")
os.makedirs(OUT, exist_ok=True)

W, H = 1800, 760

# ---------------------------------------------------------------- base gradient
base = Image.new("RGB", (W, H), (5, 9, 11))
px = base.load()
for y in range(H):
    t = y / (H - 1)
    r = int(5 + 3 * t)
    g = int(9 + 14 * t)
    b = int(12 + 16 * t)
    for x in range(W):
        px[x, y] = (r, g, b)

# ------------------------------------------------------------------- line web
lines = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(lines)

hubs = []
for _ in range(26):
    side = random.random()
    if side < 0.45:                       # off-canvas: strands enter from outside
        hubs.append((random.uniform(-500, W + 500),
                     random.choice([random.uniform(-420, -40), random.uniform(H + 40, H + 420)])))
    else:
        hubs.append((random.uniform(0, W), random.uniform(0, H)))

for hx, hy in hubs:
    strands = random.randint(38, 74)
    for _ in range(strands):
        ex = random.uniform(-60, W + 60)
        ey = random.uniform(-60, H + 60)
        # colour drifts between steel blue and pale cyan, brighter near hubs
        mix = random.random()
        col = (int(48 + 58 * mix), int(104 + 62 * mix), int(122 + 70 * mix))
        a = random.randint(26, 68)
        d.line([(hx, hy), (ex, ey)], fill=col + (a,), width=1)

# a second, sparser pass of long horizontals for depth
for _ in range(260):
    x0, y0 = random.uniform(-100, W), random.uniform(-60, H + 60)
    x1 = x0 + random.uniform(-900, 900)
    y1 = y0 + random.uniform(-260, 260)
    d.line([(x0, y0), (x1, y1)], fill=(72, 128, 146, random.randint(14, 34)), width=1)

lines = lines.filter(ImageFilter.GaussianBlur(0.6))
base = Image.alpha_composite(base.convert("RGBA"), lines).convert("RGB")

# ----------------------------------------------------------------- star specks
speck = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(speck)
for _ in range(560):
    x, y = random.uniform(0, W), random.uniform(0, H)
    r = random.choice([0, 0, 1, 1, 1, 2])
    a = random.randint(50, 150)
    sd.ellipse([x - r, y - r, x + r, y + r], fill=(168, 214, 226, a))
base = Image.alpha_composite(base.convert("RGBA"), speck.filter(ImageFilter.GaussianBlur(0.3))).convert("RGB")

# -------------------------------------------------------------------- vignette
# darken the edges only — the earlier composite blended the whole plate toward a
# flat colour and erased the strands
vig = Image.new("L", (W, H), 0)
vd = ImageDraw.Draw(vig)
cx, cy = W * 0.5, H * 0.42
maxd = math.hypot(W * 0.62, H * 0.62)
steps = 60
for i in range(steps):
    r0 = maxd * i / steps
    val = int(210 * (r0 / maxd) ** 1.6)
    vd.ellipse([cx - r0, cy - r0 * 0.8, cx + r0, cy + r0 * 0.8],
               outline=val, width=int(maxd / steps) + 3)
vig = vig.filter(ImageFilter.GaussianBlur(110))
base = Image.composite(Image.new("RGB", (W, H), (2, 6, 8)), base, vig)

# bottom fade so footer text sits on darker ground
fade = Image.new("RGBA", (W, H), (0, 0, 0, 0))
fd = ImageDraw.Draw(fade)
for y in range(int(H * 0.55), H):
    t = max(0.0, min(1.0, (y - H * 0.55) / (H * 0.45)))
    fd.line([(0, y), (W, y)], fill=(3, 8, 10, int(90 * t ** 1.6)))
base = Image.alpha_composite(base.convert("RGBA"), fade).convert("RGB")

base.save(os.path.join(OUT, "footer-network.jpg"), quality=88, optimize=True)
print("footer-network.jpg", base.size, os.path.getsize(os.path.join(OUT, "footer-network.jpg")), "bytes")

# ------------------------------------------------------------- low-poly band
BW, BH = 2400, 200
band = Image.new("RGB", (BW, BH), (22, 82, 96))
bp = band.load()
for y in range(BH):
    t = y / (BH - 1)
    r = int(46 - 26 * t)
    g = int(128 - 44 * t)
    b = int(146 - 40 * t)
    for x in range(BW):
        bp[x, y] = (r, g, b)

cols, rows = 30, 5
pts = []
for j in range(rows + 1):
    row = []
    for i in range(cols + 1):
        jx = random.uniform(-16, 16) if 0 < i < cols else 0
        jy = random.uniform(-14, 14) if 0 < j < rows else 0
        row.append((i * BW / cols + jx, j * BH / rows + jy))
    pts.append(row)

poly = Image.new("RGBA", (BW, BH), (0, 0, 0, 0))
pd = ImageDraw.Draw(poly)
for j in range(rows):
    for i in range(cols):
        a, b2, c, d2 = pts[j][i], pts[j][i + 1], pts[j + 1][i + 1], pts[j + 1][i]
        for tri in ((a, b2, c), (a, c, d2)):
            sh = random.uniform(-30, 34)
            tone = (int(max(0, min(255, 70 + sh))), int(max(0, min(255, 150 + sh))), int(max(0, min(255, 168 + sh))))
            alpha = random.randint(44, 104)
            pd.polygon(tri, fill=tone + (alpha,))

# light streaks
for _ in range(5):
    x = random.uniform(-200, BW)
    w = random.uniform(120, 420)
    pd.polygon([(x, BH), (x + w, BH), (x + w * 0.45, 0), (x + w * 0.2, 0)], fill=(255, 255, 255, 10))

poly = poly.filter(ImageFilter.GaussianBlur(0.4))
band = Image.alpha_composite(band.convert("RGBA"), poly).convert("RGB")
band.save(os.path.join(OUT, "footer-poly.jpg"), quality=90, optimize=True)
print("footer-poly.jpg", band.size, os.path.getsize(os.path.join(OUT, "footer-poly.jpg")), "bytes")
