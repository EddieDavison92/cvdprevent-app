# Indicator catalogue

The indicator catalogue lists every public measure by clinical domain, with latest England values, and opens a national indicator page.

## Sub-features

- `catalogue-open` shows the Indicators heading and a non-zero count once data loads.
- `catalogue-filter` narrows rows by condition pill.
- `catalogue-open-row` opens `/indicators/<id>` for a chosen code.

## How to get to it (user POV)

- Choose `Indicators` in the header.
- Choose `Indicators` from the landing `Explore` nav.
- Open `/indicators`.

## Driving it with control-cvdprevent

Preconditions:

- CVDPREVENT Explorer is healthy at `$CVDPREVENT_VERIFY_URL`.
- No organisation is required.
- `control-cvdprevent doctor` reports the expected URL.

- **Header entry.** Choose `Indicators`. Run `control-cvdprevent browser click --role link --name "Indicators"`. The heading reads `Indicators` and the subtitle eventually contains `indicators across` rather than `Loading...`.
- **Landing entry.** From `/`, choose `Indicators` in the `Explore` nav. Run `control-cvdprevent browser goto /` then `control-cvdprevent browser click --role link --name "Indicators"`. Same heading as above. (On a profile that already stored an organisation, `/` will bounce to the dashboard first — use header `Indicators` instead.)
- **Direct URL.** Run `control-cvdprevent browser goto /indicators`. Wait for `CVDP001HYP`. Run `control-cvdprevent browser wait --text "CVDP001HYP" --timeout 90000`. Domain headings such as `Prevalence` and `Detection Gaps` are visible, with `England` as the value column label.
- **Condition filter.** Choose a condition pill other than `All`. Run `control-cvdprevent browser click --role button --name "Hypertension"` if that pill exists (name is `Hypertension (` plus a count). The visible row count drops; `All (`…`)` remains available to reset.
- **Open row.** Choose the `CVDP001HYP` row. The URL path starts with `/indicators/` and the detail heading is the hypertension prevalence short name.
- **Proof.** Capture the loaded catalogue. Run `control-cvdprevent browser snapshot --aria --path .cursor/skills/verify-cvdprevent-app/evidence/indicator-catalogue/index.aria.txt` and `control-cvdprevent browser screenshot --path .cursor/skills/verify-cvdprevent-app/evidence/indicator-catalogue/index.png`. Artifacts show heading `Indicators`, `CVDP001HYP`, and `England`.

## Gotchas

- Counts and condition pill names come from the live API. Assert presence of `CVDP001HYP` and domain headings, not a fixed total.
- Filter pills are `button`s without an explicit aria-label; the name is the visible `Condition (n)` text. If `Hypertension` is absent after a release, report the skip with the pills that did render.
- Catalogue values are England. Do not treat them as the selected organisation’s results.
