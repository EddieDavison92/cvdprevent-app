import Link from 'next/link';
import { Globe, Heart, BarChart3, List, ArrowRight, Bot } from 'lucide-react';
import { Footer } from '@/components/layout/footer';
import { OrganisationSearch } from '@/components/landing/organisation-search';
import { ENGLAND_DASHBOARD_HREF } from '@/lib/constants/geography';

const EXPLORE_LINKS = [
  {
    label: 'England overview',
    description: 'National trends and time series',
    icon: Globe,
    iconClass: 'bg-nhs-blue text-white',
    href: ENGLAND_DASHBOARD_HREF,
  },
  {
    label: 'Indicators',
    description: 'Browse every CVD indicator',
    icon: List,
    iconClass: 'bg-nhs-bright-blue text-white',
    href: '/indicators',
  },
  {
    label: 'Benchmarks',
    description: 'Rank and compare areas',
    icon: BarChart3,
    iconClass: 'bg-nhs-dark-blue text-white',
    href: '/benchmarks',
  },
  {
    label: 'Ask with AI',
    description: 'Query data in ChatGPT or Claude',
    icon: Bot,
    iconClass: 'bg-nhs-blue/10 text-nhs-blue',
    href: '/skills',
  },
] as const;

function HomepageExplainer() {
  return (
    <section aria-labelledby="about-explorer-heading" className="mt-10 border-t border-gray-200 pt-6">
      <h2 id="about-explorer-heading" className="sr-only">
        About this explorer
      </h2>
      <p className="text-sm leading-6 text-gray-600">
        Unofficial public CVDPREVENT explorer for analysts, commissioners and improvement teams.
        Covers England, Regions, ICBs, Sub-ICBs and PCNs (PCN is the lowest geography). Not the
        official Data and Improvement Tool and not affiliated with NHS England.
      </p>
    </section>
  );
}

function ExploreLinks() {
  const className =
    'group flex min-h-[4.25rem] w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-nhs-blue/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-nhs-blue/50';

  return (
    <nav aria-label="Explore" className="mt-12">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-gray-400">Or explore</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {EXPLORE_LINKS.map(({ label, description, icon: Icon, iconClass, href }) => (
          <li key={label} className="flex">
            <Link href={href} className={className}>
              <span className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-nhs-dark-blue">{label}</span>
                <span className="block text-xs leading-4 text-gray-500">{description}</span>
              </span>
              <ArrowRight
                className="h-4 w-4 flex-shrink-0 text-nhs-blue opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-nhs-pale-grey/30">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[420px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(0,94,184,0.14),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[420px] opacity-[0.35] [background-image:linear-gradient(rgba(0,48,135,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(0,48,135,0.06)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />

      <main className="relative mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-14 sm:pt-20">
        <header className="mb-8 text-center">
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-nhs-blue shadow-lg shadow-nhs-blue/25 ring-4 ring-white">
            <Heart className="h-7 w-7 text-white" fill="currentColor" aria-hidden />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-nhs-dark-blue">
            CVD<span className="font-normal text-nhs-blue/80">PREVENT</span>
          </h1>
          <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
            Unofficial data explorer
          </p>
          <p className="mx-auto mt-4 max-w-md text-base text-gray-600">
            Find your organisation to explore cardiovascular disease prevention data across England.
          </p>
        </header>

        <OrganisationSearch />
        <ExploreLinks />
        <HomepageExplainer />
      </main>

      <Footer />
    </div>
  );
}
