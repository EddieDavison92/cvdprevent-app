export function Footer() {
  return (
    <footer className="border-t bg-white/50 py-4 text-center text-xs text-gray-500">
      Unofficial CVDPREVENT data explorer. Built by{' '}
      <a
        href="mailto:eddie.davison@nhs.net"
        className="text-nhs-blue underline hover:text-nhs-dark-blue"
      >
        Eddie Davison
      </a>
      . Data sourced from the{' '}
      <a
        href="https://www.cvdprevent.nhs.uk"
        target="_blank"
        rel="noopener noreferrer"
        className="text-nhs-blue underline hover:text-nhs-dark-blue"
      >
        CVDPREVENT
      </a>{' '}
      audit.{' '}
      <a
        href="https://github.com/EddieDavison92/cvdprevent-app"
        target="_blank"
        rel="noopener noreferrer"
        className="text-nhs-blue underline hover:text-nhs-dark-blue"
      >
        GitHub
      </a>
    </footer>
  );
}
