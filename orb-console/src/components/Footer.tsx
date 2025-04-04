export function Footer() {
  return (
    <footer className="grid grid-cols-4 gap-4 text-gray-500 text-sm">
      {/* Empty first column for spacing */}
      <div></div>

      {/* Column 2: Link to org */}
      <div className="flex justify-center">
        <a
          className="flex gap-2 hover:underline hover:underline-offset-4"
          href="https://github.com/fetter-io"
          target="_blank"
          rel="noopener noreferrer"
        >
          fetter.io
        </a>
      </div>

      {/* Column 3: Link to docs */}
      <div className="flex justify-center">
        <a
          className="flex gap-2 hover:underline hover:underline-offset-4"
          href="https://github.com/fetter-io/fetter-orb/blob/default/README.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          Fetter Orb Docs
        </a>
      </div>

      {/* Empty fourth column for spacing */}
      <div></div>
    </footer>
  );
}
