# CVDPREVENT Explorer verification map

This directory is the maintained source for verifying the user-facing behaviour of CVDPREVENT Explorer. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch the Next.js app at `$CVDPREVENT_VERIFY_URL` (default `http://127.0.0.1:3100`) with a disposable `CVDPREVENT_VERIFY_RUN`.
- Use a fresh Chromium profile in that run directory so `cvdprevent-organisation` is empty.
- Run `control-cvdprevent doctor` and require the expected URL, pid/port ownership, and a live `timePeriod` relay.
- Never drive an instance that was not started by this verification run.
- Work only with public aggregate geographies (England, Region, ICB, Sub-ICB, PCN). Do not submit feedback.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names over CSS selectors or DOM position.
- Treat every command as literal. Keep quoted names and flags unchanged.
- Run browser actions through `control-cvdprevent browser`.
- After changing organisation, confirm the URL `area=` value and the dashboard heading. Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a screenshot with the CVDPREVENT identity visible.
- Record the feature ID and entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behaviour. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behaviour.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with <harness>` starts with `Preconditions:` and uses labelled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Organisation search](./organisation-search.md) covers landing search, the England shortcut, and header command search.
- [Organisation dashboard](./organisation-dashboard.md) covers overview, trends, pathways, improvement, and changing area.
- [Indicator detail](./indicator-detail.md) covers opening a measure from the dashboard or catalogue and reading its page.
- [Indicator catalogue](./indicator-catalogue.md) covers browsing domains and opening a national indicator page.
- [Benchmarks](./benchmarks.md) covers ranking organisations on the default indicator set.
