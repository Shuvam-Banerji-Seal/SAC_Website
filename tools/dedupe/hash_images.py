#!/usr/bin/env python3
"""
hash_images.py — fingerprint every indexed image so duplicates can be found.

Four fingerprints per image, cheapest first:

  file_sha    SHA-256 of the file bytes. Identical files.
  pix_sha     SHA-256 of the decoded RGB pixels. Catches the same picture
              re-encoded (WebP quality changed, re-saved by a phone) where
              the bytes differ but every pixel is the same.
  dhash       64-bit horizontal-gradient hash. Robust to compression and
              small brightness shifts; sensitive to crops.
  phash       64-bit DCT hash. Robust to scaling, mild crops, and gamma.

Near-duplicates are then found by Hamming distance on dhash/phash. The
`imagehash` package is not installed and is not worth a dependency for two
well-understood transforms, so both are implemented here against PIL+numpy.

Output: one JSON record per image to the given path. Read by report_dupes.py.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = 200_000_000  # these are club photos, not slides

REPO = Path(__file__).resolve().parents[2]
MAP = REPO / "public/assets/processed/assets_map.jsonl"


def dhash(gray: np.ndarray, size: int = 8) -> int:
    """Horizontal gradient hash: is each pixel brighter than the one right
    of it? Needs a (size+1) x size sample."""
    small = np.asarray(
        Image.fromarray(gray).resize((size + 1, size), Image.Resampling.LANCZOS),
        dtype=np.int16,
    )
    bits = small[:, 1:] > small[:, :-1]
    return int("".join("1" if b else "0" for b in bits.flatten()), 2)


def phash(gray: np.ndarray, size: int = 8, factor: int = 4) -> int:
    """DCT-II low-frequency hash. The top-left size x size block of the DCT
    holds the coarse structure; each coefficient is compared to the median
    so the result is invariant to overall brightness."""
    n = size * factor
    small = np.asarray(
        Image.fromarray(gray).resize((n, n), Image.Resampling.LANCZOS), dtype=np.float64
    )
    # separable DCT-II via matrix multiply — n is 32, so this is trivial
    k = np.arange(n)
    basis = np.cos(np.pi * (2 * k[None, :] + 1) * k[:, None] / (2 * n))
    basis[0] /= np.sqrt(2)
    dct = basis @ small @ basis.T
    block = dct[:size, :size].flatten()
    med = np.median(block[1:])  # drop DC, it only encodes mean brightness
    return int("".join("1" if v > med else "0" for v in block), 2)


def fingerprint(rec: dict) -> dict | None:
    path = REPO / rec["absolute_path"]
    out = {"id": rec["id"], "path": rec["absolute_path"]}
    try:
        raw = path.read_bytes()
        out["file_sha"] = hashlib.sha256(raw).hexdigest()
        with Image.open(path) as im:
            im = im.convert("RGB")
            out["size"] = list(im.size)
            arr = np.asarray(im)
            out["pix_sha"] = hashlib.sha256(arr.tobytes()).hexdigest()
            gray = np.asarray(im.convert("L"), dtype=np.uint8)
            out["dhash"] = dhash(gray)
            out["phash"] = phash(gray)
    except Exception as exc:  # a corrupt file should not stop the run
        out["error"] = f"{type(exc).__name__}: {exc}"
    return out


def main() -> int:
    dest = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO / "tools/dedupe/fingerprints.jsonl"
    rows = [json.loads(line) for line in MAP.read_text().splitlines() if line.strip()]
    imgs = [r for r in rows if r.get("file_type") == "image"]
    print(f"fingerprinting {len(imgs)} images on {os.cpu_count()} cores -> {dest}")

    dest.parent.mkdir(parents=True, exist_ok=True)
    done = 0
    with dest.open("w") as fh, ProcessPoolExecutor() as pool:
        for res in pool.map(fingerprint, imgs, chunksize=16):
            fh.write(json.dumps(res) + "\n")
            done += 1
            if done % 200 == 0:
                print(f"  {done}/{len(imgs)}", flush=True)

    errs = sum(1 for line in dest.read_text().splitlines() if '"error"' in line)
    print(f"done: {done} fingerprinted, {errs} failed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
