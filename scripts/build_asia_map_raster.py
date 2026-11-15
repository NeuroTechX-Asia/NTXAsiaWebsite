import json, os
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

LON0, LON1, LAT_TOP, LAT_BOT = 45.0, 150.0, 55.0, -12.0
VW = 100.0
VH = round(100 * (LAT_TOP - LAT_BOT) / (LON1 - LON0), 2)

S = 2200
W, H = S, int(round(S * VH / VW))


def PX(lon, lat):
    return ((lon - LON0) / (LON1 - LON0) * W, (LAT_TOP - lat) / (LAT_TOP - LAT_BOT) * H)


geo = json.load(open('/Users/hansrajoharison/.hermes/cache/scratch/ne110.geojson'))
mask = Image.new('L', (W, H), 0)
dr = ImageDraw.Draw(mask)

for f in geo['features']:
    g = f['geometry']
    if not g:
        continue
    polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    for poly in polys:
        outer = [(p[0], p[1]) for p in poly[0]]
        xs = [p[0] for p in outer]
        ys = [p[1] for p in outer]
        if max(xs) < LON0 - 2 or min(xs) > LON1 + 2 or max(ys) < LAT_BOT - 2 or min(ys) > LAT_TOP + 2:
            continue
        if (max(xs) - min(xs)) < 0.8 and (max(ys) - min(ys)) < 0.8:
            continue
        dr.polygon([PX(a, b) for a, b in outer], fill=255)

beijing = mask.getpixel(PX(116.4, 39.9))
bengal = mask.getpixel(PX(88.0, 15.0))
print("mask check | Beijing:", beijing, "| Bengal:", bengal)
assert beijing > 128 and bengal < 128, "mask polarity wrong"

mask_np = np.array(mask, dtype=np.float32) / 255.0
print("land fraction:", round(float(mask_np.mean()), 3))

top = np.array([30, 42, 60], np.float32)
bot = np.array([16, 24, 37], np.float32)
tv = (np.arange(H, dtype=np.float32) / max(1, H - 1))[:, None]
grad = top[None, None, :] * (1 - tv[:, :, None]) + bot[None, None, :] * tv[:, :, None]

er = np.array(mask.filter(ImageFilter.MinFilter(5)), dtype=np.float32) / 255.0
coast = np.clip(mask_np - er, 0, 1)

grat = Image.new('L', (W, H), 0)
gd = ImageDraw.Draw(grat)
lon = LON0 + 10 - (LON0 % 10)
while lon < LON1:
    gd.line([PX(lon, LAT_BOT), PX(lon, LAT_TOP)], fill=255, width=2)
    lon += 10
lat = -10
while lat <= LAT_TOP:
    gd.line([PX(LON0, lat), PX(LON1, lat)], fill=255, width=2)
    lat += 10
grat_a = (np.array(grat, np.float32) / 255.0) * mask_np * 0.12

rgba = np.zeros((H, W, 4), np.float32)
rgba[:, :, :3] = grad
coast_col = np.array([122, 160, 200], np.float32)
rgba[:, :, :3] = rgba[:, :, :3] * (1 - coast[:, :, None] * 0.55) + coast_col[None, None, :] * (coast[:, :, None] * 0.55)
rgba[:, :, :3] = rgba[:, :, :3] * (1 - grat_a[:, :, None]) + np.array([148, 163, 184], np.float32)[None, None, :] * grat_a[:, :, None]
rgba[:, :, 3] = mask_np * 255.0

land = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), 'RGBA')

glow = mask.filter(ImageFilter.GaussianBlur(30))
ga = np.zeros((H, W, 4), np.uint8)
ga[:, :, 0] = 38
ga[:, :, 1] = 110
ga[:, :, 2] = 150
ga[:, :, 3] = np.clip(np.array(glow, np.float32) / 255.0 * 135, 0, 255).astype(np.uint8)

canvas = Image.alpha_composite(Image.new('RGBA', (W, H), (0, 0, 0, 0)), Image.fromarray(ga, 'RGBA'))
canvas = Image.alpha_composite(canvas, land)
canvas.save('public/assets/asia-land.png', optimize=True)
print("png saved:", canvas.size, os.path.getsize('public/assets/asia-land.png'), "bytes")

grat_d = []
lon = LON0 + 10 - (LON0 % 10)
while lon < LON1:
    x = (lon - LON0) / (LON1 - LON0) * VW
    grat_d.append("M%.2f 0 L%.2f %.2f" % (x, x, VH))
    lon += 10
lat = -10
while lat <= LAT_TOP:
    y = (LAT_TOP - lat) / (LAT_TOP - LAT_BOT) * VH
    grat_d.append("M0 %.2f L%.2f %.2f" % (y, VW, y))
    lat += 10

json.dump({"viewBox": [0, 0, VW, VH], "graticule": grat_d},
          open('content/asia_map.json', 'w'), separators=(',', ':'))
print("json trimmed:", os.path.getsize('content/asia_map.json'), "bytes | viewBox", VW, VH)
