import Link from 'next/link';
import { FeedbackDialog } from './feedback-dialog';

const SITE_LINKS = [
  { href: '/indicators', label: 'Indicators' },
  { href: '/benchmarks', label: 'Benchmarks' },
  { href: '/skills', label: 'Use with AI' },
] as const;

const footerLinkClassName =
  'rounded-sm font-medium text-nhs-blue underline-offset-2 transition-colors hover:text-nhs-dark-blue hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-nhs-blue/40';

export function Footer() {
  return (
    <footer className="border-t border-nhs-pale-grey bg-nhs-pale-grey/40 px-4 py-6 text-sm leading-6 text-nhs-dark-grey">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 text-center">
        <nav aria-label="Site" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {SITE_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={footerLinkClassName}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-4 sm:gap-y-2">
          <p>
            Unofficial CVDPREVENT data explorer. Built by{' '}
            <a href="mailto:eddie.davison@nhs.net" className={footerLinkClassName}>
              Eddie Davison
            </a>
            .
          </p>
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <FeedbackDialog triggerClassName={footerLinkClassName} />
            <span aria-hidden="true" className="text-nhs-mid-grey">
              ·
            </span>
            <p>
              Data from the{' '}
              <a
                href="https://www.cvdprevent.nhs.uk"
                target="_blank"
                rel="noopener noreferrer"
                className={footerLinkClassName}
              >
                CVDPREVENT audit
              </a>
              .
            </p>
            <span aria-hidden="true" className="text-nhs-mid-grey">
              ·
            </span>
            <a
              href="https://github.com/EddieDavison92/cvdprevent-app"
              target="_blank"
              rel="noopener noreferrer"
              className={footerLinkClassName}
            >
              GitHub
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
