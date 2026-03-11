export function Footer() {
  return (
    <footer className="border-t bg-white/50 py-4 text-center text-xs text-gray-400">
      Unofficial CVDPREVENT data explorer. Built by{' '}
      <a
        href="mailto:eddie.davison@nhs.net"
        className="text-nhs-blue hover:underline"
      >
        Eddie Davison
      </a>
      . Data sourced from the{' '}
      <a
        href="https://www.cvdprevent.nhs.uk"
        target="_blank"
        rel="noopener noreferrer"
        className="text-nhs-blue hover:underline"
      >
        CVDPREVENT
      </a>{' '}
      audit.{' '}
      <a
        href="https://github.com/EddieDavison92/cvdprevent-app"
        target="_blank"
        rel="noopener noreferrer"
        className="text-nhs-blue hover:underline"
      >
        GitHub
      </a>
    </footer>
  );
}
