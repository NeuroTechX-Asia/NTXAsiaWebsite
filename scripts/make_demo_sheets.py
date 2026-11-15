#!/usr/bin/env python3
"""Build timestamped contact sheets from the recorded demo videos.

Each tile carries its timecode in the source file; the sheet header names the
take, the source mp4, its duration and the moment the sheet was rendered.
"""
import os
import subprocess
import sys
import tempfile
from datetime import datetime

from PIL import Image, ImageDraw, ImageFont

FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"
BG = (8, 9, 13)
FG = (244, 244, 250)
MUTED = (150, 152, 168)
ACCENT = (34, 211, 238)


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-show_entries", "stream=width,height", "-of", "default=nw=1", path],
        capture_output=True, text=True).stdout
    d = {}
    for line in out.strip().splitlines():
        k, v = line.split("=", 1)
        d[k] = v
    return float(d["duration"]), int(d["width"]), int(d["height"])


def grab(video, t, dest):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.2f}", "-i", video,
                    "-frames:v", "1", dest], check=True)


def sheet(video, out_path, times, cols, tile_w):
    dur, vw, vh = probe(video)
    tile_h = round(tile_w * vh / vw)
    tmp = tempfile.mkdtemp(prefix="sheets-")
    frames = []
    for i, t in enumerate(times):
        p = os.path.join(tmp, f"f{i:02d}.png")
        grab(video, t, p)
        im = Image.open(p).convert("RGB").resize((tile_w, tile_h), Image.LANCZOS)
        frames.append((im, t))

    pad, gap, header = 28, 16, 96
    rows = (len(frames) + cols - 1) // cols
    W = pad * 2 + cols * tile_w + (cols - 1) * gap
    H = header + pad + rows * tile_h + (rows - 1) * gap + pad + 34

    canvas = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(canvas)
    f_title = ImageFont.truetype(FONT_BOLD, 30)
    f_meta = ImageFont.truetype(FONT_REG, 20)
    f_tag = ImageFont.truetype(FONT_BOLD, 19)

    name = os.path.basename(video)
    d.text((pad, 26), "NeuroTechX Asia - China · contact sheet", font=f_title, fill=FG)
    d.text((pad, 64), f"{name} · {dur:.1f}s · {vw}×{vh} · rendered "
                      f"{datetime.now().strftime('%Y-%m-%d %H:%M')} CET", font=f_meta, fill=MUTED)
    d.rectangle([0, header - 6, W, header - 4], fill=(46, 48, 62))

    for i, (im, t) in enumerate(frames):
        r, c = divmod(i, cols)
        x = pad + c * (tile_w + gap)
        y = header + pad + r * (tile_h + gap)
        canvas.paste(im, (x, y))
        d.rectangle([x, y, x + tile_w - 1, y + tile_h - 1], outline=(58, 60, 74), width=1)
        label = f"{int(t // 60)}:{t % 60:04.1f}".replace(".", ".") if t >= 60 else f"{t:04.1f}s"
        tw = d.textlength(label, font=f_tag)
        d.rectangle([x + 8, y + 8, x + 20 + tw + 6, y + 12 + 24], fill=(8, 9, 13))
        d.text((x + 14, y + 11), label, font=f_tag, fill=ACCENT)

    d.text((pad, H - 26), "recorded with scripts/record_demo.py (CDP screencast)", font=f_meta, fill=MUTED)
    canvas.save(out_path, optimize=True)
    return W, H, dur


# Times chosen per take so every beat lands on a real scene: hero, light mode, chapters,
# ecosystem, events, podcast, the contact modal (measured from the frames, not guessed) and
# the privacy page before the loop home.
JOBS = {
    "desktop": ([3, 9, 19, 23, 30, 38, 48.5, 53], 4, 480),
    "mobile": ([3, 9, 14, 22, 30, 38, 45, 52], 4, 250),
}

if __name__ == "__main__":
    stamp = sys.argv[1] if len(sys.argv) > 1 else datetime.now().strftime("%Y%m%d-%H%M")
    for mode in ("desktop", "mobile"):
        times, cols, tw = JOBS[mode]
        slug = "demo" if mode == "desktop" else mode
        src = os.path.expanduser(f"~/Downloads/neurotechx-asia-{slug}-{stamp}.mp4")
        if not os.path.exists(src):
            raise SystemExit(f"missing take: {src}")
        dst = os.path.expanduser(f"~/Downloads/neurotechx-asia-{slug}-sheet-{stamp}.png")
        w, h, dur = sheet(src, dst, times, cols, tw)
        kb = os.path.getsize(dst) // 1024
        print(f"{os.path.basename(dst)}  {w}x{h}  {kb} KB  (source {dur:.1f}s)")
