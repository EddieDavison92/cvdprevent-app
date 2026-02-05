# CVDPREVENT Explorer

Unofficial data explorer for the [CVDPREVENT](https://www.cvdprevent.nhs.uk) cardiovascular disease prevention audit.

**Live at [cvdprevent.vercel.app](https://cvdprevent.vercel.app)**

## Features

- Search and explore data for ICBs, Sub-ICBs, PCNs, and Regions
- Overview dashboard with comparison against England or parent organisations
- Sparkline trend charts across all indicators
- Indicator detail pages with time series, peer comparison, and breakdowns by sex, age, ethnicity, and deprivation
- Pathway funnel views for AF, hypertension, and cholesterol management
- National (England) view with trend analysis
- Chart download as PNG

## Tech Stack

- [Next.js](https://nextjs.org) 16 with App Router
- [React Query](https://tanstack.com/query) for data fetching and caching
- [ECharts](https://echarts.apache.org) for interactive charts
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) components
- Deployed on [Vercel](https://vercel.com)

## Data Source

All data is fetched from the public CVDPREVENT API (`api.cvdprevent.nhs.uk`). This project is not affiliated with or endorsed by NHS England, OHID, or the NHS Benchmarking Network.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## License

[MIT](LICENSE)
