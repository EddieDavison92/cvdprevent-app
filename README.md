# CVDPREVENT Explorer

An unofficial interface for exploring the [CVDPREVENT](https://www.cvdprevent.nhs.uk) cardiovascular disease prevention audit.

[Open the explorer](https://cvdprevent-explorer.app) · [View the public data source](https://www.cvdprevent.nhs.uk)

## What the app does

CVDPREVENT contains a large set of indicators across several NHS geographies. This app starts with an organisation and keeps it in context while the user moves between its overview, trends, clinical pathways and indicator pages.

The interface is designed for analysts, commissioners and improvement teams who need to answer a few recurring questions:

- Which measures need attention?
- Is the result favourable once the indicator's polarity is considered?
- How does the organisation compare with England or its parent geography?
- Where does a gap sit within a clinical pathway?
- Is the gap changing over time or concentrated in a demographic group?

## Main views

| View | Purpose |
| --- | --- |
| Organisation search | Find an ICB, Sub-ICB, PCN or Region and retain it across the app |
| Dashboard | Review priorities and scan all measures by pathway stage |
| Trends | Compare recent movement across indicators |
| Clinical pathways | Follow detection, diagnosis, monitoring, treatment, control and outcomes by condition |
| Indicator detail | Inspect time series, peers, population breakdowns and a national map |
| Indicators | Browse the indicator catalogue by clinical domain and condition |
| Benchmarks | Compare and rank organisations across a selected indicator set |

Search is available from the header or with <kbd>Ctrl</kbd>+<kbd>K</kbd>. Dashboard state and benchmark filters are stored in the URL where possible, so views can be bookmarked and shared.

## How comparisons are presented

The app separates a numerical difference from whether that difference is favourable:

- Detection gaps, mortality, admissions and potential overtreatment are treated as lower-is-better measures.
- Recorded prevalence is described as higher or lower rather than making an unqualified claim that higher disease prevalence is better.
- Values within 0.5 display units are shown as similar or in line.
- The comparison can be changed from England to an available parent geography, such as a Region or ICB.
- Standard and outcome indicators use their latest available reporting periods independently.

These rules are presentation logic, not statistical significance tests. The official CVDPREVENT definitions remain the source of truth.

## Data source and coverage

The app reads the public API at `https://api.cvdprevent.nhs.uk`. It covers England, Regions, ICBs, Sub-ICBs and PCNs. Indicator metadata, organisation lists and results come from the API. Reviewed pathway and polarity mappings are maintained in this repository. New codes are classified from their metadata so they remain visible until their mappings are reviewed.

Run the data profile to check current indicator and organisation coverage:

```bash
bun run profile:data
```

The profile checks indicators, organisations and data availability after an API release.

## Project structure

```text
src/
├── app/
│   ├── api/feedback/       # Server-side feedback delivery
│   ├── api/cron/           # Weekly API catalog check
│   ├── dashboard/          # Organisation overview and detail pages
│   ├── indicators/         # Indicator catalogue and cross-area explorer
│   └── benchmarks/         # Cross-area comparison matrix
├── components/
│   ├── charts/             # ECharts and Leaflet views
│   ├── dashboard/          # Priorities, sections, trends and area controls
│   ├── indicator-detail/   # Trend, peer and demographic sections
│   ├── pathways/           # Condition pathway views
│   ├── layout/             # Header, search, footer and feedback dialog
│   └── ui/                 # Shared interface primitives
├── lib/
│   ├── api/                # CVDPREVENT client and response types
│   ├── constants/          # Indicator sections, pathways and comparison rules
│   ├── hooks/              # React Query data hooks
│   └── utils/              # Formatting, geography, URLs and CSV export
└── providers/              # Query and organisation state
```

The dashboard fetches the latest standard and outcome datasets for the selected organisation. React Query caches these responses, so changing tabs or indicators usually reuses data already loaded. Organisation and period metadata are cached for longer because they change less often.

## Local development

Requirements: Node.js 20 or later, with Bun or npm.

```bash
git clone https://github.com/EddieDavison92/cvdprevent-app.git
cd cvdprevent-app
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). The data explorer itself needs no API key.

Equivalent npm commands also work:

```bash
npm install
npm run dev
```

### Commands

| Command | Description |
| --- | --- |
| `bun run dev` | Start the Next.js development server |
| `bun run build` | Create a production build |
| `bun run lint` | Run ESLint |
| `bun test` | Run the Vitest suite |
| `bun run profile:data` | Profile live API coverage and mappings |

Some tests and the data profile call the live CVDPREVENT API and require an internet connection.

## Feedback email

The footer form sends feedback through the [Resend email API](https://resend.com/docs/api-reference/emails/send-email). Copy `.env.example` to `.env.local` and set:

```dotenv
RESEND_API_KEY=re_your_api_key
FEEDBACK_FROM_EMAIL=CVDPREVENT feedback <feedback@your-domain.example>
FEEDBACK_TO_EMAIL=eddie.davison@nhs.net
CRON_SECRET=replace_with_a_random_secret
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_your_token
```

Only `RESEND_API_KEY` is required. The configured account can use Resend's test sender because the footer address is also the account's permitted test recipient. `FEEDBACK_FROM_EMAIL` can be set to an address on a verified domain later. `FEEDBACK_TO_EMAIL` defaults to the address shown in the footer. Add the server-side key in Vercel before deploying the form.

The endpoint validates input, checks same-origin browser requests and includes a hidden spam field. It sends the feedback type, message, optional reply address, current page and submission time.

## Data release monitor

Vercel calls `/api/cron/catalog-monitor` at 07:00 UTC each Monday. This cadence suits the infrequent CVDPREVENT release schedule without creating daily noise.

The check compares the latest standard and outcome periods and their indicator codes with a private Vercel Blob checkpoint. It emails the feedback recipient only when a release, indicator addition or indicator removal is found. New indicators receive a suggested dashboard section, polarity and pathway in the message. Unclear indicators appear in the app under **Needs review**.

To enable it in Vercel:

1. Connect a private Blob store to the project. Vercel supplies `BLOB_READ_WRITE_TOKEN`.
2. Add `CRON_SECRET` as a random value of at least 16 characters.
3. Keep `RESEND_API_KEY` and the feedback recipient settings configured.

The schedule is defined in `vercel.json` and runs only on production deployments.

## Limitations

- This project is not affiliated with or endorsed by NHS England, OHID or the NHS Benchmarking Network.
- Practice-level data is not exposed by the public API; PCN is the lowest supported level.
- Deprivation breakdowns are not available at PCN level.
- Peer data for PCNs may be absent.
- Inferred mappings should be reviewed after a new indicator alert.
- Some dense comparison views are best used on a desktop display.
- The app depends on the availability and response shape of the public API.

## Technology

[Next.js](https://nextjs.org) 16, React 19, TypeScript, [TanStack Query](https://tanstack.com/query), [ECharts](https://echarts.apache.org), [Leaflet](https://leafletjs.com), Tailwind CSS and Radix UI. The live app is deployed on Vercel.

## License

[MIT](LICENSE)
