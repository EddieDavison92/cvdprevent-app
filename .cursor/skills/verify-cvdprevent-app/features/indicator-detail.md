# Indicator detail

Indicator detail lets a user inspect one measure for the selected organisation: current value, trend, peers, map where boundaries exist, and demographic splits.

## Sub-features

- `detail-from-dashboard` opens a measure from the organisation dashboard.
- `detail-from-catalogue` opens a measure from `/indicators` (national context).
- `detail-identity` shows the short name, code, polarity, and area.
- `detail-back` returns to the organisation dashboard with the area query intact.

## How to get to it (user POV)

- On the organisation dashboard, choose an indicator name in `Focus signals` or a pathway-stage card.
- On `/indicators`, choose a row such as `CVDP001HYP`.
- Open `/dashboard/<IndicatorID>?area=<AreaID>` or `/indicators/<IndicatorID>` directly.

## Driving it with control-cvdprevent

Preconditions:

- CVDPREVENT Explorer is healthy at `$CVDPREVENT_VERIFY_URL`.
- An ICB dashboard for `North Central London` is showing `Focus signals`, or the catalogue at `/indicators` has loaded rows.
- `control-cvdprevent doctor` reports the expected URL.

- **From dashboard.** Choose a focus-signal name (first available link in that section). Run `control-cvdprevent browser click --selector "section[aria-labelledby='priorities-heading'] a"`. The path is `/dashboard/<id>` with `area=` still present, and a heading plus a `font-mono` indicator code are visible.
- **Identity.** Wait until the loading state `Loading indicator data` is gone. Run `control-cvdprevent browser wait --text "Indicator results by demographic group" --timeout 90000`. The page shows `Dashboard` as a back link, the organisation name, and `National Map` at ICB level.
- **From catalogue.** Open `/indicators`, wait for `CVDP001HYP`, then click that row. Run `control-cvdprevent browser goto /indicators`, `control-cvdprevent browser wait --text "CVDP001HYP" --timeout 90000`, `control-cvdprevent browser click --selector "a[href^='/indicators/']"` after confirming the row text includes `CVDP001HYP` (prefer clicking the row whose `code` column is `CVDP001HYP`). The path is `/indicators/<id>` with heading for the hypertension prevalence short name.
- **Back to dashboard.** From `/dashboard/<id>`, choose `Dashboard`. Run `control-cvdprevent browser click --role link --name "Dashboard"`. The organisation dashboard returns with the same `area=` query.
- **Proof.** Capture the organisation-scoped detail page. Run `control-cvdprevent browser snapshot --aria --path .cursor/skills/verify-cvdprevent-app/evidence/indicator-detail/page.aria.txt` and `control-cvdprevent browser screenshot --path .cursor/skills/verify-cvdprevent-app/evidence/indicator-detail/page.png`. Artifacts show the indicator title, code, and `North Central London` or `England`.

## Gotchas

- `/dashboard/<id>` without an organisation redirects to `/`. Catalogue pages at `/indicators/<id>` do not need a stored organisation.
- Indicator numeric IDs can differ across API releases; prefer the code `CVDP001HYP` on the page rather than a hardcoded id in assertions.
- The back control’s accessible name is `Dashboard`, the same as the header nav link. From a detail page the in-content link is the intended entry.
- PCN views may omit peer or deprivation blocks. That is expected; do not fail the page if `National Map` is missing at PCN level (no boundary layer).
