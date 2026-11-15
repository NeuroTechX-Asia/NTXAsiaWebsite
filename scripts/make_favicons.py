#!/usr/bin/env python3
"""Generate the site's favicon set from the official NeuroTechX artwork.

`public/assets/ntx-logo.png` is the white-on-dark lockup: a hexagon *outline*
plus a white infinity. `public/assets/ntx-mark.png` is the same infinity alone.
The printed brand (and the roll-up banner at chapter events) is the inverse:
a solid black hexagon with the infinity knocked out in white — that is what
this script rebuilds, because a favicon has to survive a light browser tab bar.

Geometry is taken from the official artwork, never guessed: the hexagon
silhouette is the outer contour of the lockup's ring, and the infinity is the
official mark, sized to the glyph width measured inside that ring.
"""
import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO = os.path.join(ROOT, "public/assets/ntx-logo.png")
MARK = os.path.join(ROOT, "public/assets/ntx-mark.png")
PUB = os.path.join(ROOT, "public")
INK = (8, 9, 13, 255)      # #08090d, the brand ink
PAPER = (247, 246, 251, 255)
SIDE = 1024
RADIUS = 0.22


def hexagon_silhouette():
    """Largest connected white blob in the lockup = the hexagon; filled."""
    from collections import deque

    logo = Image.open(LOGO).convert("RGBA")
    alpha = logo.split()[3]
    w, h = logo.size
    solid = [[alpha.getpixel((x, y)) > 16 for y in range(h)] for x in range(w)]

    seen = set()
    best = None
    for x in range(w):
        for y in range(h):
            if not solid[x][y] or (x, y) in seen:
                continue
            q, comp = deque([(x, y)]), []
            seen.add((x, y))
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and solid[nx][ny] and (nx, ny) not in seen:
                        seen.add((nx, ny))
                        q.append((nx, ny))
            if best is None or len(comp) > len(best):
                best = comp
    if not best:
        raise SystemExit("no hexagon found in the lockup")
    xs = [p[0] for p in best]
    ys = [p[1] for p in best]
    box = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)
    print(f"  hexagon component: {len(best)} px, bbox {box}")

    ring = Image.new("L", (box[2] - box[0], box[3] - box[1]), 0)
    ring.putdata([255 if (box[0] + i % ring.width, box[1] + i // ring.width) in set(best) else 0
                  for i in range(ring.width * ring.height)])
    # the mark bleeds to the crop edges, so pad before flooding the outside
    pad = 3
    padded = Image.new("L", (ring.width + 2 * pad, ring.height + 2 * pad), 0)
    padded.paste(ring, (pad, pad))
    ImageDraw.floodfill(padded, (0, 0), 128)          # outside -> 128
    filled = padded.point(lambda v: 0 if v == 128 else 255)
    filled = filled.crop((pad, pad, pad + ring.width, pad + ring.height))
    return filled.crop(filled.getbbox())


def brand_mark():
    """Black hexagon, official infinity in white, trimmed to content."""
    hexagon = hexagon_silhouette()
    glyph = Image.open(MARK).convert("RGBA")
    glyph = glyph.crop(glyph.split()[3].getbbox())

    hw, hh = hexagon.size
    tile = Image.new("RGBA", (hw, hh), (0, 0, 0, 0))
    ink_layer = Image.new("RGBA", tile.size, INK)
    tile.paste(ink_layer, (0, 0), hexagon)

    gw = int(hw * 0.74)                      # glyph width measured inside the ring
    gh = int(glyph.height * gw / glyph.width)
    g = glyph.resize((gw, gh), Image.LANCZOS)
    white = Image.new("RGBA", g.size, (255, 255, 255, 255))
    tile.paste(white, ((hw - gw) // 2, (hh - gh) // 2), g)
    out = tile.crop(tile.split()[3].getbbox())
    print(f"  brand mark {out.size}")
    return out


def plate(mark, size, pad=0.09, radius=RADIUS, bg=PAPER):
    tile = Image.new("RGBA", (SIDE, SIDE), (0, 0, 0, 0))
    ImageDraw.Draw(tile).rounded_rectangle((0, 0, SIDE - 1, SIDE - 1),
                                           radius=int(SIDE * radius), fill=bg)
    inner = int(SIDE * (1 - 2 * pad))
    mw, mh = mark.size
    s = min(inner / mw, inner / mh)
    m = mark.resize((max(1, int(mw * s)), max(1, int(mh * s))), Image.LANCZOS)
    tile.paste(m, ((SIDE - m.size[0]) // 2, (SIDE - m.size[1]) // 2), m)
    return tile.resize((size, size), Image.LANCZOS)


def main():
    mark = brand_mark()
    os.makedirs(PUB, exist_ok=True)

    plate(mark, 48).save(os.path.join(PUB, "favicon.ico"), format="ICO",
                         sizes=[(16, 16), (32, 32), (48, 48)])
    print("  favicon.ico 16/32/48")
    plate(mark, 192).save(os.path.join(PUB, "icon-192.png"), optimize=True)
    plate(mark, 512).save(os.path.join(PUB, "icon-512.png"), optimize=True)
    print("  icon-192.png / icon-512.png")

    apple = Image.new("RGBA", (SIDE, SIDE), PAPER)
    inner = int(SIDE * 0.76)
    mw, mh = mark.size
    s = min(inner / mw, inner / mh)
    m = mark.resize((int(mw * s), int(mh * s)), Image.LANCZOS)
    apple.paste(m, ((SIDE - m.size[0]) // 2, (SIDE - m.size[1]) // 2), m)
    apple.convert("RGB").resize((180, 180), Image.LANCZOS).save(
        os.path.join(PUB, "apple-touch-icon.png"), optimize=True)
    print("  apple-touch-icon.png 180")

    sheet = Image.new("RGB", (460, 300), (32, 33, 36))
    ImageDraw.Draw(sheet).rectangle((0, 150, 460, 300), fill=(243, 244, 246))
    x = 20
    for size in (16, 32, 48, 180):
        t = plate(mark, size)
        for dy in (24, 168):
            sheet.paste(t, (x, dy), t)
        x += size + 24
    sheet.save("/tmp/favicon_proof.png")
    print("  proof: /tmp/favicon_proof.png")


if __name__ == "__main__":
    main()
