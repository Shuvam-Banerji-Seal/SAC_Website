# utils/dedupe — finding duplicate images in the archive

The asset pipeline ingested several club documents in **both** `.docx` and
`.pdf` form, and in a few cases ran the same document twice under slightly
different category labels. The same photograph therefore landed in
`assets_map.jsonl` up to **six** times. Club folders separately carry burst
frames — two or three shots of one team photo, seconds apart.

These three scripts find both kinds and write a manifest the website applies
at load time.

## Nothing is deleted

The `public/assets` submodule is never touched. `build_manifest.py` writes
`public/duplicates.json` — a list of asset ids to skip — and `js/data.js`
filters them out inside `loadAssetsMap()`. Delete the manifest and every
image is back. This also survives a `sac-assets-map` regenerate, which would
overwrite anything written into the map itself.

## Running it

```bash
python3 utils/dedupe/hash_images.py /tmp/fingerprints.jsonl        # ~20s, 16 cores
python3 utils/dedupe/cluster.py /tmp/fingerprints.jsonl \
        --out /tmp/clusters.json --sheets /tmp/sheets              # contact sheets to eyeball
python3 utils/dedupe/build_manifest.py /tmp/clusters.json          # -> public/duplicates.json
npx vitest run test/unit/dedupe.test.js
```

No third-party dependencies beyond Pillow and numpy. `imagehash` is not used;
dHash and pHash are ~15 lines each and are implemented in `hash_images.py`.

## Curated removals

Some images the extractor finds are not content at all: blank slide frames,
"Made with GAMMA" chrome, blurred template backgrounds, decorative 3D renders
that shipped inside a club's DOCX/PDF. Those are listed by hand in the
`curated` array of `public/duplicates.json`, with `curated_note` explaining
the policy. `js/data.js` merges `suppress` + `degenerate` + `curated`.

**Regeneration preserves curation** — `build_manifest.py` reads the existing
manifest and carries `curated` / `curated_note` forward, so re-running the
duplicate pipeline cannot silently restore an artefact to a gallery.

## Deployment requirement

`public/duplicates.json` must be **staged with the site**. It was omitted
from `.github/workflows/deploy.yml` until 2026-09-21, so the manifest 404'd
in production and the site quietly showed all 299 duplicates. The workflow
now stages the file and fails the build if it is missing.

## Thresholds, and why they are where they are

An image pairs with another only when **both** hashes agree, within the same
club:

|         | phash | dhash |
| ------- | ----- | ----- |
| default | ≤ 6   | ≤ 8   |

Requiring both is what keeps false positives out — phash alone pairs up
low-detail images (a white slide, a dark stage) that share a DCT signature
without being the same photograph.

**Do not loosen these.** The eight weakest matches at 6/8 were checked by eye
and all eight were genuine (same scene, seconds apart). Loosening to 12/14
adds 68 pairs, and among the weakest of those are **different people
photographed in the same studio setup** — same white wall, same chair, same
framing. Perceptual hashing keys on composition, so on a portrait session it
matches the set, not the sitter. At 12/14 this pipeline would delete real
people.

## What this does _not_ catch

Two genuinely different photographs of the same person — a second selfie, a
different pose or background — are not near-duplicates in pixel space and no
perceptual hash will pair them. That needs face embeddings (identity
clustering), which is a different tool and carries a different risk: a false
positive there deletes one person's portrait in favour of another's.

As of this pass the archive has 48 office-bearer portraits and no two share a
`(club, person)`, so the metadata shows no same-person duplication in the set
where it would matter most.

## Degenerate images

`build_manifest.py` also lists images below 64×64 px. There are four, all
1×1 pixel WebP artefacts of the Movie Club document extraction. They are
dropped outright rather than kept as a cluster keeper.

## Keeper selection

First rule that separates a cluster wins:

1. A real title beats pipeline noise — `Smarane Rabindranath` over `page3 img1`.
2. The entry flagged `is_logo`, so a club never loses its mark.
3. The most descriptive real title — `Sukanya Chowdhury Event Coordinator
2025 26` over `25 26 OBs 00`. Noise titles score zero here, so when
   neither title means anything the decision falls through to resolution
   rather than rewarding the word "page".
4. A real category over `Images extracted from <doc>`.
5. Larger pixel area, then larger file.
6. Lowest id, so the choice is stable across runs.

Rule 3 can keep a lower-resolution file when the larger one is unnamed. One
group does this today (the portrait above, 1995200 px kept over 4488000 px);
the brief asked for the better title to win and ~1580 px is still ample.
