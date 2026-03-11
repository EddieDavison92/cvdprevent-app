# CVDPREVENT Explorer

Unofficial data explorer for the [CVDPREVENT](https://www.cvdprevent.nhs.uk) cardiovascular disease prevention audit.

**Live at [cvdprevent.vercel.app](https://cvdprevent.vercel.app)**

## Features

- Search and explore data for ICBs, Sub-ICBs, PCNs, and Regions
- Overview dashboard with comparison against England or parent organisations
- Sparkline trend charts across all indicators
- Indicator detail pages with time series, peer comparison, and breakdowns by sex, age, ethnicity, and deprivation
- Pathway funnel views for AF, hypertension, and cholesterol management
- Benchmarking page — rank and compare areas across indicators with composite scoring, parent scoping (e.g. ICBs within a Region), and polarity-aware heatmap colouring
- National (England) view with trend analysis
- CSV export on all charts and tables

## Tech Stack

- [Next.js](https://nextjs.org) 16 with App Router
- [React Query](https://tanstack.com/query) for data fetching and caching
- [ECharts](https://echarts.apache.org) for interactive charts
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) components
- Deployed on [Vercel](https://vercel.com)

## Architecture

```
src/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Home — org search + onboarding
│   ├── dashboard/
│   │   ├── page.tsx              # Org dashboard — all indicators at a glance
│   │   └── [id]/page.tsx         # Indicator detail (org context)
│   ├── indicators/
│   │   ├── page.tsx              # Indicator index — all indicators by section
│   │   └── [id]/page.tsx         # Indicator explorer (standalone, no org required)
│   └── benchmarks/page.tsx       # Cross-area benchmarking heatmap
│
├── components/
│   ├── charts/                   # ECharts wrappers
│   │   ├── bar-chart.tsx         # Horizontal/vertical bars with CI + benchmarks
│   │   ├── line-chart.tsx        # Time series trends
│   │   ├── demographic-chart.tsx # Side-by-side demographic comparison
│   │   ├── choropleth-map.tsx    # Leaflet map with GeoJSON boundaries
│   │   ├── sparkline.tsx         # Inline trend indicators
│   │   ├── chart-theme.ts       # NHS ECharts theme (colours, typography)
│   │   └── chart-table-toggle.tsx# Switch between chart and table views + CSV
│   ├── indicator-detail/         # Reusable indicator page sections
│   │   ├── indicator-nav.tsx     # Quick indicator switcher (horizontal scroll)
│   │   ├── hero-section.tsx      # Key metrics row (value, gap, trend, rank)
│   │   ├── trend-section.tsx     # Trend over time with chart/table toggle
│   │   ├── peer-section.tsx      # Peer/children/national comparison
│   │   └── demographics-grid.tsx # Breakdowns by sex, age, deprivation, ethnicity
│   ├── dashboard/                # Dashboard-specific components
│   │   └── pathway-funnel.tsx    # AF/hypertension/cholesterol care pathways
│   ├── layout/                   # Header, footer, command search
│   └── ui/                       # shadcn/ui primitives
│
├── lib/
│   ├── api/
│   │   ├── types.ts              # TypeScript types matching CVDPREVENT API
│   │   └── indicators.ts         # API client functions
│   ├── hooks/
│   │   ├── use-area-indicators.ts# Efficient: ALL indicators for one area (1 call)
│   │   ├── use-indicator-data.ts # Raw data for one indicator at one level
│   │   ├── use-areas.ts          # Area lists by system level
│   │   └── use-time-periods.ts   # Time period resolution
│   ├── constants/
│   │   ├── indicator-sections.ts # Indicator groupings (prevalence → outcomes)
│   │   ├── colors.ts             # NHS colour palette
│   │   └── geography.ts          # System level hierarchy
│   └── utils/                    # Formatting, CSV export, URL helpers
│
└── providers/
    └── organisation-context.tsx   # Selected org persisted in URL params
```

### Data flow

1. **Org dashboard** (`/dashboard`): `useAreaIndicators(periodId, areaId)` fetches ALL indicators with time series for one area in a single API call. Indicator switching is instant — data is already cached.

2. **Indicator detail** (`/dashboard/[id]`): Uses cached area data from step 1. Peer data via `useSiblingData`, child areas via `useChildData`. National comparison via `useIndicatorData` at the selected level.

3. **Indicator explorer** (`/indicators/[id]`): Fetches England data for all indicators (nav values + benchmarks), then area-level data for the selected indicator. Selecting an area triggers `useAreaIndicators` for that area's trend.

4. **Benchmarks** (`/benchmarks`): Fetches raw data per indicator per level, builds a cross-area matrix with composite percentile scoring.

### Key patterns

- **React Query** caches all API responses for 10 minutes — navigating between pages reuses cached data
- **`notMerge`** on all ECharts instances prevents animation artifacts when switching datasets
- **`React.memo`** / `useMemo` on chart components and their options to avoid unnecessary ECharts re-renders
- **System level hierarchy**: England → Region → ICB → Sub-ICB → PCN, with parent scoping at each level

## Data Source

All data is fetched from the public CVDPREVENT API (`api.cvdprevent.nhs.uk`). This project is not affiliated with or endorsed by NHS England, OHID, or the NHS Benchmarking Network.

## Development

### Prerequisites

- Node.js 20+ (tested on 25.x)
- npm 10+

### Setup

```bash
git clone https://github.com/your-username/cvdprevent-app.git
cd cvdprevent-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No environment variables or API keys are needed — all data comes from the public CVDPREVENT API.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Run tests + production build |
| `npm test` | Run API contract tests (hits real API) |
| `npm run lint` | ESLint |

### Testing

Tests are in `src/__tests__/api-contracts.test.ts` and validate that TypeScript types match actual API responses. They hit the live CVDPREVENT API, so require internet access.

```bash
npm test              # run all tests
npx vitest run --reporter=verbose  # verbose output
```

## License

[MIT](LICENSE)
