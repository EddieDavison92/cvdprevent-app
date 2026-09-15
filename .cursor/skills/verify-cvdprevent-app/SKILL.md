---
name: verify-cvdprevent-app
description: "Drive the CVDPREVENT Explorer Next.js web app as a user would — launch a disposable local instance, check it is ours, click through search/dashboard/indicators/benchmarks, and keep proof artifacts. Use when verifying UI behaviour, before a release, or when a change might affect routing, organisation context, or public-data views."
---

# Verify CVDPREVENT Explorer

Primary surface: the Next.js web UI. Users pick an NHS organisation and move between overview, trends, pathways, indicator pages, the catalogue, and benchmarks. Data is public aggregate CVDPREVENT (PCN is the lowest geography). There is no login.

There is no Playwright or Cypress suite. Vitest covers units and API contracts, not the UI. `puppeteer` is already a dependency; this skill drives the browser through `control-cvdprevent`. Production (`cvdprevent.vercel.app` → `https://www.cvdprevent-explorer.app`) is a read-only smoke target only — never the instance this run launches.

Do not open the footer feedback form. Do not send mail, touch secrets, or look for patient-level records.

## Launch

From the repo root, with dependencies installed (`npm ci` or `bun install`). The explorer needs no API key. Do not copy `.env.example`; Resend/Blob/cron secrets are unused by these views.

```bash
RUN_ID="${RUN_ID:-$$}"
export CVDPREVENT_VERIFY_PORT="${CVDPREVENT_VERIFY_PORT:-3100}"
export CVDPREVENT_VERIFY_URL="http://127.0.0.1:${CVDPREVENT_VERIFY_PORT}"
export CVDPREVENT_VERIFY_RUN="/tmp/cvdprevent-verify-${RUN_ID}"
mkdir -p "$CVDPREVENT_VERIFY_RUN"

if ss -ltn "sport = :$CVDPREVENT_VERIFY_PORT" | grep -q ":$CVDPREVENT_VERIFY_PORT"; then
  echo "Port $CVDPREVENT_VERIFY_PORT is already in use. Pick another CVDPREVENT_VERIFY_PORT." >&2
  exit 1
fi

setsid npm run dev -- --hostname 127.0.0.1 --port "$CVDPREVENT_VERIFY_PORT" \
  > "$CVDPREVENT_VERIFY_RUN/next.log" 2>&1 &
echo $! > "$CVDPREVENT_VERIFY_RUN/next.pid"

node .cursor/skills/verify-cvdprevent-app/scripts/control-cvdprevent.mjs wait-ready
```

Ready means `GET $CVDPREVENT_VERIFY_URL/` returns 200 with `CVDPREVENT` in the HTML (first compile can take about a minute). Teardown is **Cleanup** below — kill only this PID group.

Two instances can run side by side on different ports, each with its own `CVDPREVENT_VERIFY_RUN` (that directory holds the Chromium profile). Organisation choice is stored in `localStorage` keys `cvdprevent-organisation` and `cvdprevent-baseline`, so never reuse a profile across runs and never drive `:3000` unless this run started it.

## Doctor

Read-only. Run before driving, and whenever the session looks wrong.

```bash
node .cursor/skills/verify-cvdprevent-app/scripts/control-cvdprevent.mjs doctor
```

Require every `ok` line:

- `pid=` the contents of `$CVDPREVENT_VERIFY_RUN/next.pid`, still alive
- `port=` owned by that process (or a descendant), not some other server
- `url=` `$CVDPREVENT_VERIFY_URL` with CVDPREVENT identity in `/`
- `relay=/api/cvdprevent` JSON named `CVDPREVENT agent API`
- `upstream=timePeriod` with a non-empty `timePeriodList` (live public API via the app relay)

If doctor fails, do not drive. If the home page is the dashboard because a leftover profile already had an organisation, the run is contaminated — cleanup and relaunch with a new `RUN_ID`.

## Drive

Helper: `node .cursor/skills/verify-cvdprevent-app/scripts/control-cvdprevent.mjs`. Prefer ARIA roles and accessible names. Viewport is 1280×800 so the desktop header search is visible.

```bash
node .cursor/skills/verify-cvdprevent-app/scripts/control-cvdprevent.mjs browser goto /
node .cursor/skills/verify-cvdprevent-app/scripts/control-cvdprevent.mjs browser fill --role combobox --name "Search for an organisation" --value "North Central London"
node .cursor/skills/verify-cvdprevent-app/scripts/control-cvdprevent.mjs browser wait --role option --name "North Central London" --exact --timeout 90000
node .cursor/skills/verify-cvdprevent-app/scripts/control-cvdprevent.mjs browser click --role option --name "North Central London" --exact
node .cursor/skills/verify-cvdprevent-app/scripts/control-cvdprevent.mjs browser wait --url "/dashboard?area="
node .cursor/skills/verify-cvdprevent-app/scripts/control-cvdprevent.mjs browser wait --text "Focus signals" --timeout 90000
node .cursor/skills/verify-cvdprevent-app/scripts/control-cvdprevent.mjs browser screenshot --path .cursor/skills/verify-cvdprevent-app/evidence/<feature>/<name>.png
node .cursor/skills/verify-cvdprevent-app/scripts/control-cvdprevent.mjs browser snapshot --aria --path .cursor/skills/verify-cvdprevent-app/evidence/<feature>/<name>.aria.txt
node .cursor/skills/verify-cvdprevent-app/scripts/control-cvdprevent.mjs browser close
```

Other handles used in the map:

| Control | Role / name |
| --- | --- |
| Landing search | combobox `Search for an organisation`; listbox `Matching organisations` |
| England shortcut | link `view England as a whole` |
| Header search (sm+) | button `Search organisations, indicators, and pages`; dialog title `Search`; combobox with the same aria-label |
| Header nav | links `Dashboard`, `Indicators`, `Benchmarks` |
| Dashboard tabs | tab `Overview`, `Trends`, `Pathways`, `Improvement` (England: `Trends` and `Indicators` only) |
| Change area | button `Change area`; combobox `Search areas` |
| Compare with | combobox labelled `Compare with` |
| Catalogue | heading `Indicators`; condition filter buttons such as `All (`…`)` |
| Benchmarks | heading `Benchmarks`; combobox `Geography level` |

Commands are literal. Quoted names and flags stay unchanged. Read `features/` before driving; a proof that uses one convenient URL is incomplete when the feature file lists other entry points. After a mutation of organisation context, confirm with a second view (URL `area=` + heading), not only the click.

Direct loads that skip search (still user-facing): `/dashboard?area=1` (England), `/dashboard?area=<AreaID>`, `/indicators`, `/indicators/<IndicatorID>`, `/benchmarks`.

## Evidence

Store proof under `.cursor/skills/verify-cvdprevent-app/evidence/<feature-id>/`. Cleanup must not delete this tree.

Standards:

- Exercise the real UI path (search, tabs, links). Do not set `localStorage` or call `/api/cvdprevent` as a substitute for a user click.
- Capture the action and the resulting state (landing search results **and** the dashboard they open).
- Side effects to confirm: URL `area=` query, visible organisation heading, tab panel text. No rows are written; this app is read-only public data.
- The footer feedback POST is a production boundary — do not submit it. CSV downloads are optional and stay in the Chromium profile, which cleanup removes.
- Record the feature ID and entry point in the artifact names. Screenshots must show the CVDPREVENT chrome (header or landing wordmark). Pair each screenshot with an ARIA snapshot.
- If an entry point is unreachable, report the command and the unmet precondition. Do not call a skipped path verified via another route.

Fixture organisation: **North Central London** ICB (displayed title `North Central London`, not the Sub-ICB `North Central London ICB - 93C`). Fixture indicator code: **CVDP001HYP**. England is AreaID `1`, `/dashboard?area=1`.

## Cleanup

```bash
node .cursor/skills/verify-cvdprevent-app/scripts/control-cvdprevent.mjs cleanup
```

This closes the Chromium session this run started, sends SIGTERM to the process group in `$CVDPREVENT_VERIFY_RUN/next.pid`, and deletes `$CVDPREVENT_VERIFY_RUN/chrome-profile`. It does not delete `evidence/`. Never `pkill node` / `pkill next`. After cleanup, confirm the evidence files still exist.

If a drive fails, run cleanup before the next attempt so ports and profiles are not stranded.

## Helpers

Executable: `.cursor/skills/verify-cvdprevent-app/scripts/control-cvdprevent.mjs`

| Command | Purpose |
| --- | --- |
| `wait-ready` | Poll `CVDPREVENT_VERIFY_URL` until the app identifies as CVDPREVENT |
| `doctor` | Confirm pid, port ownership, identity, relay, upstream periods |
| `browser goto <path>` | Open a path on this instance |
| `browser fill --role … --name … --value …` | Type into an accessible field |
| `browser click --role … --name … [--exact]` | Click. `--exact` on `option` matches the visible title span |
| `browser press --key Enter` | Key in the focused page |
| `browser wait --text/--url/--role … [--timeout ms]` | Wait for a user-visible condition |
| `browser screenshot --path …` / `snapshot --aria --path …` | Proof |
| `browser close` | Disconnect Chromium; profile remains until `cleanup` |
| `cleanup` | Stop what this run started; keep evidence |

## Feature map

Start at [`features/README.md`](features/README.md). Keep the map honest with `/maintain-verification-skill` when routes or names change.
