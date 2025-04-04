export function Footer() {
  return (
    <footer className="flex gap-[24px] flex-wrap items-center justify-center text-gray-500">
      <a
        className="flex items-center gap-2 hover:underline hover:underline-offset-4"
        href="https://github.com/fetter-io"
        target="_blank"
        rel="noopener noreferrer"
      >
        fetter.io
      </a>
      <a
        className="flex items-center gap-2 hover:underline hover:underline-offset-4"
        href="https://github.com/fetter-io/fetter-orb/blob/default/README.md"
        target="_blank"
        rel="noopener noreferrer"
      >
        Fetter Orb Docs
      </a>
    </footer>
  );
}
