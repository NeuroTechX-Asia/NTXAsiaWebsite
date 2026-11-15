#!/usr/bin/env python3
"""Generate the site's original visual assets.

The constellation mesh is inspired by the faint node-and-link background used on
neurotechx.org (hero) and on its podcast card. It is generated here from a fixed
seed, so the site never hotlinks or copies NeuroTechX's own image files.

Run with the NTXAsiaWebsite conda env:
    python scripts/generate_assets.py
"""
from __future__ import annotations

import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets"
ASSETS.mkdir(parents=True, exist_ok=True)

W, H = 1600, 900


def constellation(seed: int, nodes: int, link_dist: float, opacity: float, out: str) -> None:
    rng = random.Random(seed)
    pts = [(rng.uniform(0, W), rng.uniform(0, H)) for _ in range(nodes)]
    lines = []
    for i, (x1, y1) in enumerate(pts):
        for x2, y2 in pts[i + 1:]:
            d = math.hypot(x1 - x2, y1 - y2)
            if d < link_dist:
                alpha = (1 - d / link_dist) * opacity
                lines.append(
                    f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
                    f'stroke="#22d3ee" stroke-opacity="{alpha:.3f}" stroke-width="1"/>'
                )
    dots = []
    for x, y in pts:
        r = rng.choice([1.4, 1.8, 2.2, 2.8])
        a = rng.uniform(opacity * 1.6, opacity * 3.4)
        dots.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="#7dd3fc" fill-opacity="{min(a, .85):.3f}"/>')
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
        f'<rect width="{W}" height="{H}" fill="none"/>'
        + "".join(lines) + "".join(dots)
        + "</svg>"
    )
    (ASSETS / out).write_text(svg, encoding="utf-8")
    print(f"wrote {out}: {nodes} nodes, {len(lines)} links")


constellation(seed=42, nodes=110, link_dist=190, opacity=0.16, out="constellation.svg")
constellation(seed=7, nodes=70, link_dist=240, opacity=0.22, out="constellation-soft.svg")

# Favicon: the NTX-style wordmark reduced to a cyan X on the site background.
(ROOT / "public" / "favicon.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
    '<rect width="64" height="64" rx="14" fill="#08090d"/>'
    '<path d="M18 18 L46 46 M46 18 L18 46" stroke="#22d3ee" stroke-width="6" stroke-linecap="round"/>'
    '<circle cx="32" cy="32" r="4" fill="#60a5fa"/></svg>',
    encoding="utf-8",
)
print("wrote favicon.svg")

# Social card (1200x630). Pillow is the only non-stdlib dependency.
try:
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGB", (1200, 630), (8, 9, 13))
    d = ImageDraw.Draw(img)
    rng = random.Random(42)
    pts = [(rng.uniform(0, 1200), rng.uniform(0, 630)) for _ in range(90)]
    for i, (x1, y1) in enumerate(pts):
        for x2, y2 in pts[i + 1:]:
            dist = math.hypot(x1 - x2, y1 - y2)
            if dist < 170:
                d.line([(x1, y1), (x2, y2)], fill=(20, 60, 75), width=1)
    for x, y in pts:
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(60, 140, 165))

    def font(size: int, bold: bool = False):
        for path in [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]:
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
        return ImageFont.load_default()

    d.text((70, 210), "NeuroTechX", font=font(76, True), fill=(243, 244, 247))
    w = d.textlength("NeuroTechX", font=font(76, True))
    d.text((70 + w + 8, 210), "X", font=font(76, True), fill=(34, 211, 238))
    d.text((70, 320), "A S I A", font=font(44, True), fill=(154, 161, 173))
    d.text((70, 400), "Asia neurotechnology community", font=font(30), fill=(154, 161, 173))
    d.text((70, 452), "neurotechx.asia", font=font(26), fill=(34, 211, 238))
    img.save(ASSETS / "og-image.png")
    print("wrote og-image.png")
except ImportError:
    print("Pillow not installed — skipped og-image.png (pip install pillow, then re-run)")
