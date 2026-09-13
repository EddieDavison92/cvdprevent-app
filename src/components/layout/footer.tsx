import Link from 'next/link';
import { FeedbackDialog } from './feedback-dialog';

const SITE_LINKS = [
  { href: '/indicators', label: 'Indicators' },
  { href: '/benchmarks', label: 'Benchmarks' },
  { href: '/skills', label: 'Use with AI' },
] as const;

export function Footer() {
  return (
    <footer className="border-t bg-white/50 px-4 py-4 text-xs text-gray-500">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 text-center">
        <nav aria-label="Site" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {SITE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-nhs-blue underline hover:text-nhs-dark-blue"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>
            Unofficial CVDPREVENT data explorer. Built by{' '}
            <a
              href="mailto:eddie.davison@nhs.net"
              className="text-nhs-blue underline hover:text-nhs-dark-blue"
            >
              Eddie Davison
            </a>
            .
          </span>
          <FeedbackDialog />
          <span aria-hidden="true" className="text-gray-300">·</span>
          <span>
            Data from the{' '}
            <a
              href="https://www.cvdprevent.nhs.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-nhs-blue underline hover:text-nhs-dark-blue"
            >
              CVDPREVENT audit
            </a>
            .
          </span>
          <a
            href="https://github.com/EddieDavison92/cvdprevent-app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-nhs-blue underline hover:text-nhs-dark-blue"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
