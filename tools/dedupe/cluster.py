#!/usr/bin/env python3
"""
cluster.py — group the fingerprints from hash_images.py into duplicate sets.

Two kinds of edge join images into a cluster:

  exact   identical file bytes (or identical decoded pixels). Unambiguous.
  near    Hamming distance on BOTH phash and dhash under threshold. Requiring
          both agree is what keeps false positives down: phash alone pairs up
          flat/low-detail images (a white slide, a dark stage) that share a
          DCT signature but are not the same photograph.

Clusters are connected components over those edges (union-find).

Emits JSON: {clusters: [{kind, members:[id...]}...]} plus a contact-sheet
montage per cluster when --sheets is given, because a distance number is not
evidence — the pictures have to be looked at.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
MAP = REPO / "public/assets/processed/assets_map.jsonl"


def load(fingerprints: Path):
    fp = [json.loads(x) for x in fingerprints.read_text().splitlines() if x.strip()]
    fp = [f for f in fp if "error" not in f]
    rows = {
        r["id"]: r
        for r in map(json.loads, MAP.read_text().splitlines())
        if r.get("file_type") == "image"
    }
    return fp, rows


def bit_matrix(values: list[int]) -> np.ndarray:
    out = np.zeros((len(values), 64), dtype=np.int8)
    for i, v in enumerate(values):
        out[i] = np.frombuffer(np.binary_repr(int(v), 64).encode(), dtype=np.uint8) - 48
    return out


def hamming(bits: np.ndarray) -> np.ndarray:
    signed = bits.astype(np.int16) * 2 - 1
    return ((64 - signed @ signed.T) // 2).astype(np.int16)


class Union:
    def __init__(self, keys):
        self.parent = {k: k for k in keys}

    def find(self, a):
        while self.parent[a] != a:
            self.parent[a] = self.parent[self.parent[a]]
            a = self.parent[a]
        return a

    def join(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[rb] = ra


def build(fp, rows, phash_max: int, dhash_max: int, same_club_only: bool):
    ids = [f["id"] for f in fp]
    uf = Union(ids)
    edge_kind: dict[tuple[int, int], str] = {}

    # exact: identical bytes, or identical decoded pixels
    for key in ("file_sha", "pix_sha"):
        groups = defaultdict(list)
        for f in fp:
            groups[f[key]].append(f["id"])
        for members in groups.values():
            for other in members[1:]:
                uf.join(members[0], other)
                edge_kind[(members[0], other)] = "exact"

    # near: both hashes must agree
    HP = hamming(bit_matrix([f["phash"] for f in fp]))
    HD = hamming(bit_matrix([f["dhash"] for f in fp]))
    n = len(fp)
    for i in range(n):
        for j in range(i + 1, n):
            if HP[i, j] > phash_max or HD[i, j] > dhash_max:
                continue
            a, b = fp[i]["id"], fp[j]["id"]
            if same_club_only and rows[a]["club"] != rows[b]["club"]:
                continue
            uf.join(a, b)
            edge_kind.setdefault((a, b), "near")

    comps = defaultdict(list)
    for i in ids:
        comps[uf.find(i)].append(i)

    clusters = []
    for members in comps.values():
        if len(members) < 2:
            continue
        members.sort()
        kinds = {
            edge_kind.get((a, b), edge_kind.get((b, a)))
            for a in members
            for b in members
            if a != b
        }
        clusters.append(
            {
                "kind": "exact" if kinds == {"exact"} else "near",
                "members": members,
                "clubs": sorted({rows[m]["club"] for m in members}),
            }
        )
    clusters.sort(key=lambda c: (-len(c["members"]), c["members"][0]))
    return clusters


def contact_sheet(cluster, rows, dest: Path, cell: int = 190):
    members = cluster["members"][:12]
    cols = min(len(members), 6)
    rowcount = (len(members) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell, rowcount * cell), "#e8e2d4")
    for idx, mid in enumerate(members):
        try:
            with Image.open(REPO / rows[mid]["absolute_path"]) as im:
                im = im.convert("RGB")
                im.thumbnail((cell - 8, cell - 8), Image.Resampling.LANCZOS)
                sheet.paste(im, ((idx % cols) * cell + 4, (idx // cols) * cell + 4))
        except Exception:
            pass
    sheet.save(dest, quality=82)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("fingerprints", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--phash-max", type=int, default=6)
    ap.add_argument("--dhash-max", type=int, default=8)
    ap.add_argument("--any-club", action="store_true", help="allow cross-club near edges")
    ap.add_argument("--sheets", type=Path, help="directory to write contact sheets into")
    ap.add_argument("--sheet-kind", default="near", choices=["near", "exact", "all"])
    args = ap.parse_args()

    fp, rows = load(args.fingerprints)
    clusters = build(fp, rows, args.phash_max, args.dhash_max, not args.any_club)

    exact = [c for c in clusters if c["kind"] == "exact"]
    near = [c for c in clusters if c["kind"] == "near"]
    redundant = sum(len(c["members"]) - 1 for c in clusters)
    print(f"clusters: {len(clusters)}  (exact {len(exact)}, mixed/near {len(near)})")
    print(f"images that would collapse away: {redundant}")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps({"clusters": clusters}, indent=1))

    if args.sheets:
        args.sheets.mkdir(parents=True, exist_ok=True)
        pick = clusters if args.sheet_kind == "all" else [c for c in clusters if c["kind"] == args.sheet_kind]
        for i, c in enumerate(pick):
            contact_sheet(c, rows, args.sheets / f"{i:03d}_{c['kind']}_{len(c['members'])}.jpg")
        print(f"wrote {len(pick)} contact sheets to {args.sheets}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
