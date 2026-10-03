#!/usr/bin/env python3
"""
build_manifest.py — turn duplicate clusters into public/duplicates.json.

Nothing is deleted. The archive submodule is left exactly as it is; this
writes a manifest of asset ids the website should skip, which js/data.js
applies at load time. That keeps the decision reversible, reviewable in a
diff, and safe against a future `sac-assets-map` regeneration (which would
overwrite any field written into assets_map.jsonl itself).

Keeper selection, in order — the first rule that separates the cluster wins:

  1. A real title beats pipeline noise. "Treasurer 2026 27" beats "img 011";
     this is the rule the brief asked for by name.
  2. A real category beats "Images extracted from <doc>", because an entry
     filed under a genuine event folder carries more context.
  3. Larger pixel area, then larger file — the better scan of the same shot.
  4. Lowest id, so the choice is stable across runs.

Degenerate images (1x1 extraction artefacts) are dropped outright rather
than kept as a cluster keeper.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MAP = REPO / "public/assets/processed/assets_map.jsonl"

# Kept deliberately in step with GENERIC_TITLE_RE / DEVICE_STAMP_RE in
# js/utils/caption.js — if a title is noise there, it is noise here.
GENERIC_RE = re.compile(
    r"^(img ?_?\d*|img\d+|page\d* ?img\d*|dsc ?_?\d*|ona\d+|pxl ?_?\d*|vid ?_?\d+"
    r"|mg ?_?\d+([ _]?\d+)?|photo|image|untitled|new file|\d{3,4} ?_?[a-z]?|\d+)\s*$",
    re.I,
)
DEVICE_RE = re.compile(
    r"^(?:whats\s?app|screenshot|img|image|dsc|pxl|photo|received|signal|vid)\b"
    r"(?:[ _.-]*(?:image|video)\b)?(?:[ _.-]*\d+)+",
    re.I,
)
EXTRACTED_RE = re.compile(r"^images? extracted from", re.I)

MIN_PIXELS = 64 * 64  # below this an "image" is an extraction artefact


def has_real_title(rec: dict) -> bool:
    title = (rec.get("title") or "").strip()
    if not title:
        return False
    if GENERIC_RE.match(title) or DEVICE_RE.match(title):
        return False
    return len(re.sub(r"[^a-z]", "", title, flags=re.I)) >= 3


def has_real_category(rec: dict) -> bool:
    label = (rec.get("category_label") or "").strip()
    return bool(label) and label != "(root)" and not EXTRACTED_RE.match(label)


def title_letters(rec: dict) -> int:
    """How much of the title is actually words. This is the rule that keeps
    "Sukanya Chowdhury Event Coordinator 2025 26" and drops "25 26 OBs 00":
    both clear the is-it-noise bar, but only one of them names anybody.

    Zero for a noise title. Counting letters inside noise ranks "page8 img3"
    above "PXL 20251116 053110612" on the strength of the word "page", which
    once cost us a 2400px original in favour of a 465px crop. When neither
    title means anything the decision belongs to resolution, below."""
    if not has_real_title(rec):
        return 0
    return len(re.sub(r"[^a-z]", "", rec.get("title") or "", flags=re.I))


def score(rec: dict) -> tuple:
    """Higher sorts first. Mirrors the docstring's rule order."""
    return (
        has_real_title(rec),
        bool(rec.get("is_logo")),  # the entry the club pages resolve as its mark
        title_letters(rec),
        has_real_category(rec),
        (rec.get("width") or 0) * (rec.get("height") or 0),
        rec.get("size_bytes") or 0,
        -rec["id"],  # lowest id wins the final tie
    )


PEOPLE = Path(__file__).with_name("same_person.json")


def compile_people(rows: dict, dropped: set, path: Path = PEOPLE) -> list:
    """Compile same_person.json (filenames) into manifest groups (ids + paths).

    The source file is keyed by path because ids are a generation-time counter
    that a map regenerate can shift; paths are what a person actually wrote
    down. Resolving them here, at build time, means a regenerate only needs a
    re-run of this script — never a hand edit of ids.

    Fails loudly rather than quietly mis-hiding: an unknown file, a file listed
    twice, or a keeper the pipeline already suppressed is a hand-curation
    mistake, and shipping it would drop a real person's only portrait.
    """
    if not path.exists():
        return []
    by_path = {r["path"]: r for r in rows.values()}
    seen: set = set()
    out = []
    for g in json.loads(path.read_text())["groups"]:
        folder = g["folder"].rstrip("/")
        paths = [f"{folder}/{g['keep']}"] + [f"{folder}/{d}" for d in g["drop"]]
        for p in paths:
            if p not in by_path:
                raise SystemExit(f"same_person.json: {p} is not an image in the map")
            if p in seen:
                raise SystemExit(f"same_person.json: {p} appears in two groups")
            seen.add(p)
        keeper = by_path[paths[0]]
        if keeper["id"] in dropped:
            raise SystemExit(
                f"same_person.json: keeper {paths[0]} is already suppressed by the "
                "duplicate pipeline — pick a visible frame as the keeper"
            )
        out.append(
            {
                "label": g["label"],
                "keep": keeper["id"],
                "keep_path": keeper["path"],
                "drop": [
                    {"id": by_path[p]["id"], "path": p} for p in paths[1:]
                ],
            }
        )
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("clusters", type=Path, nargs="?")
    ap.add_argument("--out", type=Path, default=REPO / "public/duplicates.json")
    ap.add_argument(
        "--people-only",
        action="store_true",
        help="recompile same_person.json into the existing manifest and leave "
        "the generated duplicate lists untouched (no fingerprints needed)",
    )
    args = ap.parse_args()

    rows = {
        r["id"]: r
        for r in map(json.loads, MAP.read_text().splitlines())
        if r.get("file_type") == "image"
    }

    if args.people_only:
        manifest = json.loads(args.out.read_text())
        dropped = set(manifest["suppress"]) | set(manifest["degenerate"]) | set(
            manifest.get("curated") or []
        )
        manifest["same_person"] = compile_people(rows, dropped)
        args.out.write_text(json.dumps(manifest, indent=1) + "\n")
        n = sum(len(g["drop"]) for g in manifest["same_person"])
        print(f"same_person: {len(manifest['same_person'])} people, {n} extra frames hidden")
        print(f"wrote {args.out.relative_to(REPO)}")
        return 0

    if args.clusters is None:
        ap.error("clusters.json is required unless --people-only is given")
    clusters = json.loads(args.clusters.read_text())["clusters"]

    degenerate = sorted(
        rid
        for rid, r in rows.items()
        if (r.get("width") or 0) * (r.get("height") or 0) < MIN_PIXELS
    )

    suppress: dict[int, int] = {}  # dropped id -> id it duplicates
    groups = []
    for cluster in clusters:
        members = [rows[m] for m in cluster["members"] if m in rows]
        members = [m for m in members if m["id"] not in degenerate]
        if len(members) < 2:
            continue
        members.sort(key=score, reverse=True)
        keeper, rest = members[0], members[1:]
        for r in rest:
            suppress[r["id"]] = keeper["id"]
        groups.append(
            {
                "kind": cluster["kind"],
                "keep": keeper["id"],
                "keep_title": keeper.get("title"),
                "keep_path": keeper["path"],
                "drop": [
                    {"id": r["id"], "title": r.get("title"), "path": r["path"]}
                    for r in rest
                ],
            }
        )

    manifest = {
        "_comment": (
            "Generated by tools/dedupe/build_manifest.py. Ids the website skips when "
            "loading assets_map.jsonl. No files are deleted; re-run the tool to rebuild. "
            "See tools/dedupe/README.md."
        ),
        "generated_from": str(args.clusters.name),
        "curated_note": "",
        "curated": [],
        "suppress": sorted(suppress),
        "degenerate": degenerate,
        "groups": groups,
    }

    # Curation survives regeneration: the hand-picked `curated` list (non-content
    # artefacts a human removed from the site) is carried over from the existing
    # manifest. Without this, re-running the pipeline would silently restore
    # blank frames and decorative document images to the galleries.
    if args.out.exists():
        try:
            previous = json.loads(args.out.read_text())
            manifest["curated"] = sorted(
                {int(i) for i in (previous.get("curated") or [])}
            )
            if previous.get("curated_note"):
                manifest["curated_note"] = previous["curated_note"]
        except (ValueError, TypeError):
            pass  # a broken existing manifest must not block a rebuild

    # Hand-curated same-person groups are recompiled from their path-keyed
    # source every run, so the ids in the manifest are always fresh.
    manifest["same_person"] = compile_people(
        rows,
        set(suppress) | set(degenerate) | set(manifest["curated"]),
    )

    args.out.write_text(json.dumps(manifest, indent=1) + "\n")

    kept = len(rows) - len(suppress) - len(degenerate)
    print(f"images in map      : {len(rows)}")
    print(f"suppressed as dupes: {len(suppress)} across {len(groups)} groups")
    print(f"degenerate (<64px) : {len(degenerate)}")
    people_hidden = sum(len(g["drop"]) for g in manifest["same_person"])
    print(f"curated (manual)   : {len(manifest['curated'])} preserved")
    print(f"same-person frames : {people_hidden} hidden across {len(manifest['same_person'])} people")
    print(f"images the site shows: {kept - len(manifest['curated']) - people_hidden}")
    print(f"wrote {args.out.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
