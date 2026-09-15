# Benchmarks

Benchmarks lets a user rank organisations on a small default indicator set, scoped by geography level and optional parent area.

## Sub-features

- `bench-open` shows the Benchmarks heading and the default ICB table.
- `bench-level` switches geography via `Geography level`.
- `bench-parent` scopes Sub-ICB or PCN rows with `Parent scope` (PCN requires an ICB).
- `bench-section` switches from `Key indicators` to a domain pill such as `Prevalence`.

## How to get to it (user POV)

- Choose `Benchmarks` in the header.
- Choose `Benchmarks` from the landing `Explore` nav.
- Open `/benchmarks`.

## Driving it with control-cvdprevent

Preconditions:

- CVDPREVENT Explorer is healthy at `$CVDPREVENT_VERIFY_URL`.
- No organisation is required.
- `control-cvdprevent doctor` reports the expected URL.

- **Open.** Choose `Benchmarks` or go directly. Run `control-cvdprevent browser goto /benchmarks`. The heading reads `Benchmarks`. Wait until the table is not a skeleton. Run `control-cvdprevent browser wait --text "CVDP001HYP" --timeout 90000`. A `Score` column and ICB rows are visible. Default level is ICB (URL has no `level` param).
- **Change level.** Open combobox `Geography level` and choose `Regions`. Run `control-cvdprevent browser click --role combobox --name "Geography level"` then `control-cvdprevent browser click --role option --name "Regions"`. The URL contains `level=6` and the first table header contains `Region`.
- **PCN empty state.** Set geography to `PCNs`. Run `control-cvdprevent browser click --role combobox --name "Geography level"` then `control-cvdprevent browser click --role option --name "PCNs"`. The page shows `Select an ICB above to view its PCNs` until `Parent scope` is set.
- **Section pill.** From the default ICB view, choose `Prevalence`. Run `control-cvdprevent browser click --role button --name "Prevalence"`. The column set changes; `Key indicators` remains available to reset.
- **Proof.** Capture the default ICB matrix. Run `control-cvdprevent browser snapshot --aria --path .cursor/skills/verify-cvdprevent-app/evidence/benchmarks/icb.aria.txt` and `control-cvdprevent browser screenshot --path .cursor/skills/verify-cvdprevent-app/evidence/benchmarks/icb.png`. Artifacts show `Benchmarks`, `Score`, and `CVDP001HYP`.

## Gotchas

- Default indicators are `CVDP001HYP`, `CVDP005HYP`, `CVDP002AF`, `CVDP007HYP`, `CVDP011CHOL`, `CVDP002MORT`. Some hide at a given level; an amber notice counts hidden codes — that is not a failure.
- PCN requires a parent ICB. Do not report the PCN table as verified if you only opened the empty prompt.
- `Geography level` values are `Regions`, `ICBs`, `Sub-ICBs`, `PCNs` (not the singular SYSTEM_LEVEL names used on the dashboard).
- Dense tables are desktop-first. The helper viewport is 1280×800; a mobile swipe hint may appear but is not the proof target.
