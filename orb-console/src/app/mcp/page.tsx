"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { HeaderPreAuth } from "@/components/HeaderPreAuth";
import { Footer } from "@/components/Footer";

const styles = {
  chapterTitle: "text-xl font-bold text-white mb-2",
  sectionTitle:
    "text-xl font-semibold text-slate-400/80 mb-2 mt-6 border-t-2 border-slate-500/50",
  infoBoxTitle: "text-xl font-semibold text-slate-400/80 mb-2",
  bodyText: "text-gray-300 text-md leading-tight",
  infoBox: "bg-slate-800 rounded-sm px-4 py-2 border border-slate-700",
  list: "list-none list-inside text-gray-300 space-y-2 mb-2 px-4 leading-tight",
  codeBlock:
    "bg-slate-950 px-4 py-2 my-2 ml-2 rounded text-xs text-blue-300/80 font-semibold overflow-x-auto border border-slate-700",
  link: "text-slate-400 hover:text-blue-300",
  paramRow: "flex gap-3 items-start",
  paramName: "font-mono text-slate-300 text-sm shrink-0 ",
  paramDesc: "text-gray-400 text-sm",
  inlineCode: "font-mono text-blue-300/80 text-sm",
};

const NAV_SECTIONS = [
  { id: "overview", title: "Overview" },
  { id: "installation", title: "Installation" },
  { id: "agent-usage", title: "Agent Usage" },
  { id: "most-recent-not-vulnerable", title: "Most Recent Not Vulnerable" },
  { id: "is-vulnerable", title: "Find Vulnerabilities" },
  { id: "lookup", title: "Search Packages" },
] as const;

function McpContent() {
  const [activeSection, setActiveSection] = useState<string>(
    NAV_SECTIONS[0].id,
  );
  const suppressObserver = useRef(false);
  const suppressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Highlight TOC entry as sections scroll into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (suppressObserver.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    for (const { id } of NAV_SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    suppressObserver.current = true;
    if (suppressTimer.current) clearTimeout(suppressTimer.current);
    suppressTimer.current = setTimeout(() => {
      suppressObserver.current = false;
    }, 800);
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex flex-col min-h-screen font-[family-name:var(--font-geist-sans)] bg-gradient-to-b from-slate-950 to-slate-900">
      <HeaderPreAuth subtitle="MCP" />

      <main className="flex-grow px-6 w-full pb-20">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
          {/* Left Column — TOC */}
          <aside className="sm:col-span-1 sm:self-start sm:sticky sm:top-19">
            <div className="bg-slate-900 p-2 border border-slate-800 rounded-sm">
              <nav className="space-y-2">
                {NAV_SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollTo(section.id)}
                    className={`w-full sm:text-right uppercase tracking-widest text-xs px-2 py-1 rounded-xs transition-default cursor-pointer ${
                      activeSection === section.id
                        ? "bg-slate-800 text-gray-400 border border-slate-600"
                        : "bg-slate-900 text-slate-500 border border-slate-800 hover:text-gray-200 hover:bg-slate-700/50"
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Right Column — All sections */}
          <div className="sm:col-span-3 space-y-4">
            {/* Overview */}
            <div
              id="overview"
              className="scroll-mt-19 bg-slate-800/30 rounded-sm px-4 py-2 pb-4 border border-slate-700 space-y-4"
            >
              <h2 className={styles.chapterTitle}>Fetter MCP</h2>
              <p className={styles.bodyText}>
                Fetter provides a remote{" "}
                <a
                  href="https://modelcontextprotocol.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  Model Context Protocol
                </a>{" "}
                (MCP) server at{" "}
                <code className={styles.inlineCode}>
                  https://mcp.fetter.io/mcp
                </code>{" "}
                that gives AI coding agents real-time access to Python package
                vulnerability data. Built on{" "}
                <a
                  href="https://github.com/fetter-io/fetter-rs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  fetter
                </a>
                , it queries PyPI and OSV to surface known CVEs, CVSS scores,
                and safe versions so your agent can make informed dependency
                decisions as it writes code.
              </p>
              <div className={styles.infoBox}>
                <h3 className={styles.infoBoxTitle}>Tools</h3>
                <ul className={styles.list}>
                  <li>
                    <code className={styles.inlineCode}>lookup</code>
                    {": "}
                    find available versions and their vulnerabilities for any
                    package or specifier
                  </li>
                  <li>
                    <code className={styles.inlineCode}>is_vulnerable</code>
                    {": "}
                    check whether a specific pinned version has known CVEs
                  </li>
                  <li>
                    <code className={styles.inlineCode}>
                      most_recent_not_vulnerable
                    </code>
                    {": "}
                    find the latest release of a package that is free of known
                    vulnerabilities
                  </li>
                </ul>
              </div>
            </div>

            {/* Installation */}
            <div
              id="installation"
              className="scroll-mt-19 bg-slate-800/30 rounded-sm px-4 py-2 pb-4 border border-slate-700 space-y-4"
            >
              <h2 className={styles.chapterTitle}>Installation</h2>
              <p className={styles.bodyText}>
                The Fetter MCP server uses the HTTP transport and requires no
                local installation. Just register the remote URL with your MCP
                client.
              </p>
              <div className={styles.infoBox}>
                <h3 className={styles.infoBoxTitle}>Claude Code</h3>
                <pre className={styles.codeBlock}>
                  {`claude mcp add --transport http fetter https://mcp.fetter.io/mcp`}
                </pre>
              </div>
              <div className={styles.infoBox}>
                <h3 className={styles.infoBoxTitle}>Codex</h3>
                <pre className={styles.codeBlock}>
                  {`codex mcp add fetter --url https://mcp.fetter.io/mcp`}
                </pre>
              </div>
              <div className={styles.infoBox}>
                <h3 className={styles.infoBoxTitle}>Other MCP Clients</h3>
                <p className={styles.bodyText}>
                  For any other MCP-compatible client, provide the following
                  remote server URL using the HTTP transport:
                </p>
                <pre
                  className={styles.codeBlock}
                >{`https://mcp.fetter.io/mcp`}</pre>
              </div>
            </div>

            {/* Agent Usage */}
            <div
              id="agent-usage"
              className="scroll-mt-19 bg-slate-800/30 rounded-sm px-4 py-2 pb-4 border border-slate-700 space-y-4"
            >
              <h2 className={styles.chapterTitle}>Agent Usage</h2>
              <p className={styles.bodyText}>
                Once installed, the Fetter MCP tools are available to your AI
                agent during coding sessions. The agent can call them
                automatically when adding or auditing dependencies; no explicit
                tool invocation is required in your prompts.
              </p>
              <div className={styles.infoBox}>
                <h3 className={styles.infoBoxTitle}>Example Prompts</h3>
                <ul className={styles.list}>
                  <li>
                    &ldquo;Add the latest safe version of requests to
                    requirements.txt&rdquo;
                  </li>
                  <li>
                    &ldquo;Are there any known vulnerabilities in my current
                    dependencies?&rdquo;
                  </li>
                  <li>
                    &ldquo;What is the most recent version of pillow with no
                    CVEs?&rdquo;
                  </li>
                  <li>
                    &ldquo;Before pinning cryptography, check whether 42.0.5 is
                    vulnerable&rdquo;
                  </li>
                </ul>
              </div>
              <h3 className={styles.sectionTitle}>How It Works</h3>
              <p className={styles.bodyText}>
                The agent selects the appropriate tool based on context:
              </p>
              <ul className={styles.list}>
                <li>
                  Adding a new package:{" "}
                  <code className={styles.inlineCode}>
                    most_recent_not_vulnerable
                  </code>{" "}
                  to find a safe version to pin
                </li>
                <li>
                  Auditing an existing specifier:{" "}
                  <code className={styles.inlineCode}>lookup</code> to see
                  affected versions
                </li>
                <li>
                  Validating a specific pinned version:{" "}
                  <code className={styles.inlineCode}>is_vulnerable</code> for a
                  definitive answer
                </li>
              </ul>
            </div>

            {/* most_recent_not_vulnerable */}
            <div
              id="most-recent-not-vulnerable"
              className="scroll-mt-19 bg-slate-800/30 rounded-sm px-4 py-2 pb-4 border border-slate-700 space-y-4"
            >
              <h2 className={styles.chapterTitle}>
                Most Recent Not Vulnerable
              </h2>
              <p className={styles.bodyText}>
                The{" "}
                <span className={styles.inlineCode}>
                  most_recent_not_vulnerable
                </span>{" "}
                tool finds the most recent version of a package that has no
                known vulnerabilities. Provide only a package name and the
                server will search recent releases for a safe version. Useful
                when pinning a dependency to the latest clean release.
              </p>
              <div className={styles.infoBox}>
                <h3 className={styles.infoBoxTitle}>Parameters</h3>
                <ul className="space-y-2 px-2">
                  <li className={styles.paramRow}>
                    <span className={styles.paramName}>package_name</span>
                    <span className={styles.paramDesc}>
                      Package name only — no version specifier, e.g.{" "}
                      <code className="font-mono text-slate-400">
                        &quot;requests&quot;
                      </code>
                      .
                    </span>
                  </li>
                </ul>
              </div>
              <h3 className={styles.sectionTitle}>Examples</h3>
              <pre className={styles.codeBlock}>
                {`# Before adding a new dependency, find a safe version to pin
most_recent_not_vulnerable(package_name="pillow")

# Use the result to write a pinned requirement
most_recent_not_vulnerable(package_name="cryptography")`}
              </pre>
            </div>

            {/* is_vulnerable */}
            <div
              id="is-vulnerable"
              className="scroll-mt-19 bg-slate-800/30 rounded-sm px-4 py-2 pb-4 border border-slate-700 space-y-4"
            >
              <h2 className={styles.chapterTitle}>Find Vulnerabilities</h2>
              <p className={styles.bodyText}>
                The <span className={styles.inlineCode}>is_vulnerable</span>{" "}
                tool checks if a specific package version has known
                vulnerabilities. Requires an exact version specifier. Returns
                vulnerability IDs, summaries, CVSS scores, severity ratings, and
                reference URLs.
              </p>
              <div className={styles.infoBox}>
                <h3 className={styles.infoBoxTitle}>Parameters</h3>
                <ul className="space-y-2 px-2">
                  <li className={styles.paramRow}>
                    <span className={styles.paramName}>dep_spec</span>
                    <span className={styles.paramDesc}>
                      Exact version specifier, e.g.{" "}
                      <code className="font-mono text-slate-400">
                        &quot;requests==2.31.0&quot;
                      </code>
                      .
                    </span>
                  </li>
                </ul>
              </div>
              <h3 className={styles.sectionTitle}>Examples</h3>
              <pre className={styles.codeBlock}>
                {`# Check a specific version of requests
is_vulnerable(dep_spec="requests==2.31.0")

# Verify a pinned version before adding it to requirements.txt
is_vulnerable(dep_spec="numpy==1.24.0")`}
              </pre>
            </div>

            {/* lookup */}
            <div
              id="lookup"
              className="scroll-mt-19 bg-slate-800/30 rounded-sm px-4 py-2 pb-4 border border-slate-700 space-y-4"
            >
              <h2 className={styles.chapterTitle}>Search Packages</h2>
              <p className={styles.bodyText}>
                The <span className={styles.inlineCode}>lookup</span> tool looks
                up a package by name and optional version specifier to find
                which versions are available and whether they have known
                vulnerabilities. Supports specifiers such as{" "}
                <code className={styles.inlineCode}>&quot;requests&quot;</code>,{" "}
                <code className={styles.inlineCode}>
                  &quot;numpy&gt;=2.0&quot;
                </code>
                , or{" "}
                <code className={styles.inlineCode}>
                  &quot;flask==3.0.0&quot;
                </code>
                .
              </p>
              <div className={styles.infoBox}>
                <h3 className={styles.infoBoxTitle}>Parameters</h3>
                <ul className="space-y-2 px-2">
                  <li className={styles.paramRow}>
                    <span className={styles.paramName}>dep_specs</span>
                    <span className={styles.paramDesc}>
                      Package name or version specifier.
                    </span>
                  </li>
                  <li className={styles.paramRow}>
                    <span className={styles.paramName}>cvss_threshold</span>
                    <span className={styles.paramDesc}>
                      Filter to vulnerabilities at or above this CVSS score
                      (0–10).
                    </span>
                  </li>
                  <li className={styles.paramRow}>
                    <span className={styles.paramName}>max_observed_score</span>
                    <span className={styles.paramDesc}>
                      Return only the highest CVSS score per version rather than
                      all individual vulnerabilities.
                    </span>
                  </li>
                  <li className={styles.paramRow}>
                    <span className={styles.paramName}>count</span>
                    <span className={styles.paramDesc}>
                      Limit the number of recent versions checked.
                    </span>
                  </li>
                  <li className={styles.paramRow}>
                    <span className={styles.paramName}>retain_passing</span>
                    <span className={styles.paramDesc}>
                      Include versions with no known vulnerabilities in the
                      results.
                    </span>
                  </li>
                </ul>
              </div>
              <h3 className={styles.sectionTitle}>Examples</h3>
              <pre className={styles.codeBlock}>
                {`# Check recent versions of requests for any vulnerabilities
lookup(dep_specs="requests")

# Check numpy 2.x versions, show only CVSS scores >= 7.0
lookup(dep_specs="numpy>=2.0", cvss_threshold=7.0)

# Get all versions of flask 3.0.0, including passing ones
lookup(dep_specs="flask==3.0.0", retain_passing=True)

# Check only the 5 most recent releases
lookup(dep_specs="pillow", count=5)`}
              </pre>
            </div>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-10 bg-slate-950 border-t border-slate-700 px-6 py-2">
        <div className="max-w-4xl mx-auto">
          <Footer />
        </div>
      </footer>
    </div>
  );
}

export default function McpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
          <div className="text-slate-400">Loading...</div>
        </div>
      }
    >
      <McpContent />
    </Suspense>
  );
}
