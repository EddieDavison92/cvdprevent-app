import { FeedbackDialog } from './feedback-dialog';

export function Footer() {
  return (
    <footer className="border-t bg-white/50 px-4 py-4 text-xs text-gray-500">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
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
    </footer>
  );
}
