# Organisation dashboard

The organisation dashboard keeps the selected area in context and lets a user scan priorities, trends, clinical pathways, and an improvement workspace.

## Sub-features

- `dash-overview` shows focus signals and pathway-stage sections for a non-England organisation.
- `dash-trends` shows recent movement across indicators.
- `dash-pathways` shows detection through outcomes by condition (hidden for England).
- `dash-improvement` opens the Improvement tab (labelled `Indicators` when viewing England).
- `dash-change-area` switches organisation without leaving the dashboard.

## How to get to it (user POV)

- Finish organisation search (see [Organisation search](./organisation-search.md)).
- Open `/dashboard?area=<AreaID>` or `/dashboard?area=1` for England.
- Choose the header link `Dashboard` after an organisation is already selected.

## Driving it with control-cvdprevent

Preconditions:

- CVDPREVENT Explorer is healthy at `$CVDPREVENT_VERIFY_URL`.
- The session is on an ICB dashboard, heading `North Central London`, URL containing `area=`.
- `control-cvdprevent doctor` reports the expected URL.

- **Overview.** Confirm the default tab. Run `control-cvdprevent browser wait --role tab --name "Overview"`. The tab is selected, `Focus signals` is visible, and `By pathway stage` is visible. England has no `Overview` tab — do not use this step on `/dashboard?area=1`.
- **Trends.** Choose `Trends`. Run `control-cvdprevent browser click --role tab --name "Trends"`. The URL contains `tab=trends` (or omits `tab` on England, where Trends is the default). Section headings for pathway stages appear after data loads.
- **Pathways.** Choose `Pathways`. Run `control-cvdprevent browser click --role tab --name "Pathways"`. Condition pathway sections appear. This tab is absent on England.
- **Improvement.** Choose `Improvement`. Run `control-cvdprevent browser click --role tab --name "Improvement"`. A view tablist named `View` is shown. On England the same tab is named `Indicators`.
- **Change area.** Choose `Change area`. Run `control-cvdprevent browser click --role button --name "Change area"`. Fill combobox `Search areas` with `England`, then click option `--name "England" --exact`. The heading reads `England` and `Overview` disappears.
- **Proof.** Capture the ICB overview before changing area. Run `control-cvdprevent browser snapshot --aria --path .cursor/skills/verify-cvdprevent-app/evidence/organisation-dashboard/overview.aria.txt` and `control-cvdprevent browser screenshot --path .cursor/skills/verify-cvdprevent-app/evidence/organisation-dashboard/overview.png`. Artifacts show `North Central London`, `Overview`, and `Focus signals`.

## Gotchas

- Tab names depend on geography. England: `Trends` and `Indicators`. ICB/Sub-ICB/PCN: `Overview`, `Trends`, `Pathways`, `Improvement`.
- Default tab is `overview` except England (`trends`). The URL omits `tab` when on the default.
- `Change area` on small viewports is a compact button named `Change`. The helper viewport is desktop.
- Overview waits on area indicator payloads. If `CVDPREVENT API is currently unavailable` appears, stop; doctor/upstream is stale or down.
- Header `Dashboard` with no stored organisation redirects to `/`.
