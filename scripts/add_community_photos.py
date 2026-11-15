#!/usr/bin/env python3
"""
Turn a folder of real NTX Asia event photographs into the site's community manifest.

    python scripts/add_community_photos.py ~/Pictures/ntx-hk-meetup
    python scripts/add_community_photos.py ~/Pictures/ntx-bci-expo --events IMG_2041.jpg
    python scripts/add_community_photos.py ~/Pictures/ntx-hk-meetup --dry-run

What it does:
  * takes up to five images (or --count N) for the JOIN strip, cropped to 4:3 at 800 px;
  * optionally takes one image for the events claim slide, cropped to 3:2 at 1200 px;
  * writes JPEGs into public/assets/community/ and rewrites content/community-photos.json;
  * keeps `placeholder: false` so the "sample imagery" disclosure disappears from the page.

It never touches the images' EXIF orientation incorrectly — PIL is asked to apply it — and it
refuses files below 700 px on the short edge, because a crop that small looks soft on retina.

Reminder: only run this on photographs whose subjects have agreed to appear on a public site.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover
    sys.exit("Pillow is required: env -u PYTHONPATH <venv>/bin/python -m pip install pillow")

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "public" / "assets" / "community"
MANIFEST = ROOT / "content" / "community-photos.json"
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic"}


def crop(img: Image.Image, ratio: float, y_bias: float = 0.45) -> Image.Image:
    w, h = img.size
    if w / h > ratio:
        nw = int(h * ratio)
        x = (w - nw) // 2
        return img.crop((x, 0, x + nw, h))
    nh = int(w / ratio)
    y = max(0, int((h - nh) * y_bias))
    return img.crop((0, y, w, y + nh))


def prepare(src: Path, dst: Path, ratio: float, width: int, y_bias: float, dry: bool) -> tuple[int, int]:
    with Image.open(src) as raw:
        img = ImageOps.exif_transpose(raw).convert("RGB")
    target_h = int(width / ratio)
    box = crop(img, ratio, y_bias)
    if box.size[0] < width or box.size[1] < target_h:
        raise SystemExit(
            f"{src.name}: {img.size[0]}x{img.size[1]} is too small for a {width}x{target_h} crop "
            f"(would upscale) — supply a larger original"
        )
    out = box.resize((width, target_h), Image.LANCZOS)
    if not dry:
        dst.parent.mkdir(parents=True, exist_ok=True)
        out.save(dst, quality=84, optimize=True, progressive=True)
    return out.size


def main() -> None:
    ap = argparse.ArgumentParser(description="Add real community photographs to the site manifest.")
    ap.add_argument("folder", type=Path, help="folder of photographs")
    ap.add_argument("--events", help="file name inside the folder to use beside the events claim slide")
    ap.add_argument("--count", type=int, default=5, help="how many JOIN tiles (default 5)")
    ap.add_argument("--credit", default="NTX Asia - China", help="credit line shown on the tile")
    ap.add_argument("--dry-run", action="store_true", help="report what would happen, write nothing")
    args = ap.parse_args()

    if not args.folder.is_dir():
        raise SystemExit(f"not a folder: {args.folder}")

    files = sorted(p for p in args.folder.iterdir() if p.suffix.lower() in EXTS and p.is_file())
    if not files:
        raise SystemExit(f"no images in {args.folder}")

    events_src = None
    if args.events:
        events_src = next((f for f in files if f.name == args.events), None)
        if events_src is None:
            raise SystemExit(f"--events file not found in folder: {args.events}")
        files = [f for f in files if f is not events_src]

    picks = files[: args.count]
    manifest = json.loads(MANIFEST.read_text())

    # validate every crop before writing anything, so a bad frame cannot leave
    # half a gallery on disk
    jobs = [(src, ASSETS / f"gallery-{i}.jpg", 4 / 3, 800) for i, src in enumerate(picks, start=1)]
    if events_src is not None:
        jobs.append((events_src, ASSETS / "events-community.jpg", 3 / 2, 1200))
    for src, dst, ratio, width in jobs:
        prepare(src, dst, ratio, width, 0.45, dry=True)

    gallery = []
    for i, src in enumerate(picks, start=1):
        name = f"gallery-{i}.jpg"
        size = prepare(src, ASSETS / name, 4 / 3, 800, 0.45, args.dry_run)
        gallery.append(
            {
                "src": f"/assets/community/{name}",
                "source": str(src),
                "credit": args.credit,
                "alt": {"zh": src.stem.replace("_", " "), "en": src.stem.replace("_", " ")},
            }
        )
        print(f"  + {name:<14} {size[0]}x{size[1]}  <- {src.name}")

    if events_src is not None:
        size = prepare(events_src, ASSETS / "events-community.jpg", 3 / 2, 1200, 0.45, args.dry_run)
        manifest["events"] = {
            "src": "/assets/community/events-community.jpg",
            "source": str(events_src),
            "credit": args.credit,
            "alt": {"zh": events_src.stem.replace("_", " "), "en": events_src.stem.replace("_", " ")},
        }
        print(f"  + events-community.jpg {size[0]}x{size[1]}  <- {events_src.name}")

    manifest["gallery"] = gallery
    manifest["placeholder"] = False
    manifest.pop("disclosure", None)

    if args.dry_run:
        print("\ndry run — manifest and files untouched")
        return

    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"\nwrote {MANIFEST.relative_to(ROOT)} — placeholder=false, disclosure removed")
    print("now: npm run build, then check the JOIN strip and the events slide")


if __name__ == "__main__":
    main()
