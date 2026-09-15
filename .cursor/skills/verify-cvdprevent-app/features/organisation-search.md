# Organisation search

Organisation search lets a user find an ICB, Sub-ICB, PCN or Region, or open England as a whole, and retain that organisation on the dashboard.

## Sub-features

- `search-landing` finds organisations from the homepage combobox after two characters.
- `search-select-icb` opens the dashboard for the chosen ICB.
- `search-england` opens the national dashboard without typing a name.
- `search-empty` shows a complete empty state for a query with no matches.
- `search-header` finds the same organisation from the header command dialog.

## How to get to it (user POV)

- On `/`, type into the field labelled `Search for an organisation`.
- On `/`, choose the `view England as a whole` link.
- From any page with the app header, choose `Search organisations, indicators, and pages` or press `Ctrl+K`, then type an organisation name.

## Driving it with control-cvdprevent

Preconditions:

- CVDPREVENT Explorer is healthy at `$CVDPREVENT_VERIFY_URL`.
- The Chromium profile has no stored organisation.
- `control-cvdprevent doctor` reports the expected URL and a live `timePeriod` relay.

- **Open landing.** Open `/`. Run `control-cvdprevent browser goto /`. The heading contains `CVDPREVENT`, the combobox `Search for an organisation` is present, and the page has not redirected to `/dashboard`.
- **Type query.** Enter `North Central London`. Run `control-cvdprevent browser fill --role combobox --name "Search for an organisation" --value "North Central London"`. A listbox named `Matching organisations` appears once area lists finish loading (can take tens of seconds).
- **Select ICB.** Choose the option whose visible title is exactly `North Central London` (ICB), not `North Central London ICB - 93C`. Run `control-cvdprevent browser click --role option --name "North Central London" --exact`. The URL contains `/dashboard?area=` and the heading reads `North Central London`.
- **Confirm dashboard data.** Wait until overview content is not a skeleton. Run `control-cvdprevent browser wait --text "Focus signals" --timeout 90000`. The `Overview` tab is selected and `Focus signals` is visible.
- **England shortcut.** Return to a clean profile (or `browser close`, new run) and open `/` again. Run `control-cvdprevent browser click --role link --name "view England as a whole"`. The URL is `/dashboard?area=1`, the heading reads `England`, and the `Trends` tab is available (no `Overview` tab).
- **Empty state.** On `/` with a clean profile, type `zzzxnotanorg`. Run `control-cvdprevent browser fill --role combobox --name "Search for an organisation" --value "zzzxnotanorg"` then `control-cvdprevent browser wait --text "No organisations found" --timeout 90000`. A status names that empty result.
- **Header search.** From `/indicators` on a large viewport, choose the header search button. Run `control-cvdprevent browser click --role button --name "Search organisations, indicators, and pages"`. A dialog named `Search` appears. Fill the combobox `Search organisations, indicators, and pages` with `North Central London`, wait for `Organisations`, and select the ICB title `North Central London`. The dashboard heading matches.
- **Proof.** Capture landing results and the ICB dashboard. Run `control-cvdprevent browser snapshot --aria --path .cursor/skills/verify-cvdprevent-app/evidence/organisation-search/dashboard.aria.txt` and `control-cvdprevent browser screenshot --path .cursor/skills/verify-cvdprevent-app/evidence/organisation-search/dashboard.png`. Artifacts show `CVDPREVENT` and `North Central London`.

## Gotchas

- Two characters are required before organisation results load. A single letter never queries the list.
- Area lists come from the public API. Wait for the listbox or the empty status, not a fixed sleep. A slow-API hint may appear first.
- ICB and Sub-ICB names both contain `North Central London`. Use `--exact` on the option title `North Central London` for the ICB.
- If `localStorage` already has an organisation, `/` redirects to `/dashboard` and the landing combobox is gone. Use a new `CVDPREVENT_VERIFY_RUN`.
- Header search is hidden on small viewports; the helper uses 1280×800. Mobile uses a button named `Search` instead.
- Pressing `Ctrl+K` is an equivalent header entry. Do not treat it as verified if you only used the header button, and vice versa — record which entry point you drove.
