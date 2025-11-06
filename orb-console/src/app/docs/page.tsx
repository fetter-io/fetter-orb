"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ImageLightbox } from "@/components/ImageLightbox";
import { Weave } from "@/components/Weave";
import { Footer } from "@/components/Footer";
import { AllowIcon } from "@/components/AllowIcon";
import colors from "tailwindcss/colors";

type Chapter = {
  id: string;
  title: string;
  content: React.ReactNode;
};

// Reusable style definitions
const styles = {
  chapterTitle: "text-xl font-bold text-white mb-2",
  sectionTitle: "text-xl font-semibold text-slate-400/80 mb-2",
  warningTitle: "text-lg font-semibold text-yellow-400 mb-2",
  bodyText: "text-gray-300 text-md leading-tight",

  infoBox: "bg-slate-800 rounded-sm px-4 py-2 border border-slate-700",
  warningBox: "bg-yellow-900/20 border border-yellow-800 rounded-sm p-4",

  screenshotBox: "px-0 pt-2",
  screenshotLabel: "text-gray-400 text-sm",
  screenshotPlaceholder:
    "bg-slate-800 h-64 rounded flex items-center justify-center text-gray-500",

  list: "list-none list-inside text-gray-300 space-y-0 mb-2 px-4",
  orderedList: "list-decimal list-inside text-gray-300 space-y-0 px-4",

  codeBlock:
    "bg-slate-950 px-4 py-2 my-2 ml-2 rounded text-xs text-blue-300/80 font-semibold overflow-x-auto border border-slate-700",

  link: "text-slate-400 hover:text-blue-300",
};

export default function DocsPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const chapters: Chapter[] = [
    {
      id: "getting-started",
      title: "Getting Started",
      content: (
        <div className="space-y-4">
          <h2 className={styles.chapterTitle}>Getting Started</h2>

          <p className={styles.bodyText}>
            Fetter IO is a web-application for aggregating information about
            Python packages on all your (or your organization&apos;s) systems.
            With this information, comprehensive supply-chain monitoring is
            possible. Fetter IO permits searching among all packages, displaying
            detailed vulnerability information, and applying a global allow
            list.
          </p>

          <p className={styles.bodyText}>
            This guide will help get up and running with Fetter IO, including
            creating an account, performing your first scan, and using the
            Fetter IO Console.
          </p>

          <div className={styles.infoBox}>
            <h3 className={`${styles.sectionTitle}`}>Prerequisites</h3>
            <ul className={styles.list}>
              <li>
                A{" "}
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  GitHub
                </a>{" "}
                account for authentication.
              </li>
              <li>
                Python or Rust tools (like <code>pip</code> or{" "}
                <code>cargo</code>) for installing packages or crates.
              </li>
              <li>
                One or more Python environments on a system running Linux or
                MacOS.
              </li>
            </ul>
          </div>

          <h3 className={styles.sectionTitle}>Creating an Account</h3>

          <p className={styles.bodyText}>
            For greater security, Fetter IO uses GitHub for identity management.
            After clicking the &quot;Sign in with GitHub&quot; button,
            providing GitHub credentials, and accepting the terms, you will be
            provisioned an account and be presented with the Fetter IO Console.
          </p>

          <h3 className={styles.sectionTitle}>Navigating the Console</h3>

          <p className={styles.bodyText}>
            The Console features six tabs, as well as interfaces to select
            Tenant and logout. Many tabs also feature a System selector and an
            update button.
          </p>

          <div className={styles.infoBox}>
            <h3 className={styles.sectionTitle}>Console Tabs</h3>
            <ul className={styles.list}>
              <li>📦 Packages</li>
              <li>⚠️ Vulnerabilities</li>
              <li>🔓 Allow List</li>
              <li>🖥️ Systems</li>
              <li>🏢 Tenants</li>
              <li>⚙️ Account</li>
            </ul>
          </div>

          <p className={styles.bodyText}>
            The Console tabs will be mostly empty until you begin uploading
            scans. In the next section we will look at using Tenant to upload
            package data.
          </p>

          <h3 className={styles.sectionTitle}>Managing Your Account</h3>

          <p className={styles.bodyText}>
            The Account tab (⚙️) displays all information specific to your account, including GitHub login and optionally GitHub email and name. You can delete your account and all associated data at any time with the &quot;Delete Account&quot; button; this operation cannot be undone.
          </p>

          <div className={styles.warningBox}>
            <h3 className={styles.warningTitle}>Note</h3>
            <p className={styles.bodyText}>
              Fetter IO will never share or sell your information with third-parties unless required by law.
            </p>
          </div>

          <h3 className={styles.sectionTitle}>Up Next</h3>

          <p className={styles.bodyText}>
            In the next section we will learn how to use and create Tenants.
          </p>

        </div>
      ),
    },
    //--------------------------------------------------------------------------
    {
      id: "creating-tenant",
      title: "Using & Creating Tenants",
      content: (
        <div className="space-y-4">
          <h2 className={styles.chapterTitle}>Using & Creating Tenants</h2>

          <p className={styles.bodyText}>
            Fetter IO groups package data from one or more systems under a
            Tenant. Each Tenant offers its own isolated environment for tracking
            packages, vulnerabilities, and systems, and each Tenant defines a
            configurable allow list. Additionally, Tenant configuration includes
            defining which systems are active in aggregate system displays.
          </p>

          <h3 className={styles.sectionTitle}>Tenant Attributes</h3>

          <p className={styles.bodyText}>
            Every Tenant has a name, a key, and a maximum number of updates
            permitted per day.
          </p>

          <ul className={styles.list}>
            <li>Name: A label that can be renamed only by the Tenant. owner</li>
            <li>Key: A 64-character code unique to this Tenant.</li>
            <li>
              Updates per day: The maximum number of times systems can post
              scans to this Tenant per 24 hour period.
            </li>
          </ul>

          <h3 className={styles.sectionTitle}>Creating a new Tenant</h3>

          <p className={styles.bodyText}>
            On account creation, each user is given a default Tenant named
            &quot;Self&quot;. Users can create, by default, up to two Tenants.
            The following steps explain how to create a new Tenant.
          </p>

          <ol className={styles.orderedList}>
            <li>Navigate to the Tenant tab (🏢)</li>
            <li>
              Click the <span className="inline-block">＋</span> button.
            </li>
            <li>Provide a valid name and select &quot;Create&quot;</li>
          </ol>

          <div className={styles.warningBox}>
            <h3 className={styles.warningTitle}>Note</h3>
            <p className={styles.bodyText}>
              Limit Tenant key access to those who will post scans to your
              Tenant. The Tenant key cannot be used to access your account. Only
              the Tenant creator can rename or modify certain tenant settings.
            </p>
          </div>

          <h3 className={styles.sectionTitle}>Tenant Usage & Display</h3>

          <p className={styles.bodyText}>
            Every Tenant associated with your account will be listed in the
            Tenant tab (🏢). The display provides the name, key, and number of
            updates per day, as well as two ways to post scan data to the
            Tenant.
          </p>

          <ol className={styles.orderedList}>
            <li>
              Using the <code>fetter</code> command-line application.
            </li>
            <li>
              Installing the <code>fetter</code> endpoint agent as a service.
            </li>
          </ol>

          <div className={styles.screenshotBox}>
            <div className={styles.screenshotLabel}>
              This screenshot depicts...
            </div>
            <ImageLightbox
              src="/screen-allow.png"
              alt="Tenant Creation Interface"
              width={1200}
              height={800}
            />
          </div>

          <h3 className={styles.sectionTitle}>Up Next</h3>

          <p className={styles.bodyText}>
            In the next sections we use the <code>fetter</code> command-line
            application to post package scans.
          </p>


        </div>
      ),
    },
    //--------------------------------------------------------------------------
    {
      id: "installing-fetter",
      title: "Installing & Using Fetter",
      content: (
        <div className="space-y-4">
          <h2 className={styles.chapterTitle}>Installing & Using Fetter</h2>

          <p className={styles.bodyText}>
            There are a number of ways to publish package information to Fetter
            IO. To get started quickly, we can use the open-source{" "}
            <code>fetter</code> command-line application.
          </p>

          <p className={styles.bodyText}>
            The Fetter command-line application searches systems to find all
            Python environments and packages. Using the{" "}
            <code>monitor-scan</code> command, that scan data can be uploaded to
            your Fetter IO Tenant.
          </p>

          <h3 className={styles.sectionTitle}>Installation Methods</h3>

          <p className={styles.bodyText}>
            For Python users, installing <code>fetter</code> with Python
            packaging tools might be convenient.
          </p>

          <div className={styles.infoBox}>
            <h3 className={styles.sectionTitle}>
              Installing with Python Tools
            </h3>
            <p className={styles.bodyText}>
              If installing into a virtual environment or default{" "}
              <code>site-packages</code>, use <code>pip</code>. Use{" "}
              <code>fetter --version</code> to test your installation.
            </p>
            <pre className={styles.codeBlock}>{`pip install fetter
fetter --version`}</pre>

            <p className={styles.bodyText}>
              Alternatively, <code>fetter</code> can be installed outside of any
              virtual environment as a standalone binary via{" "}
              <a
                href="https://github.com/pypa/pipx"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                <code>pipx</code>
              </a>
              . Calling <code>pipx ensurepath</code> might be necessary to
              ensure the binary is discoverable.
            </p>

            <pre className={styles.codeBlock}>{`pipx install fetter
pipx ensurepath
fetter --version`}</pre>

            <p className={styles.bodyText}>
              The most lightweight installation is possible with the{" "}
              <code>uvx</code> command (part of{" "}
              <a
                href="https://docs.astral.sh/uv/getting-started/installation/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                <code>uv</code>
              </a>
              ). With this approach, an ephemeral installation is provided upon
              which commands can be immediately executed.
            </p>

            <pre className={styles.codeBlock}>{`uvx fetter --version`}</pre>
          </div>

          <div className={styles.infoBox}>
            <h3 className={styles.sectionTitle}>Installing with Rust Tools</h3>
            <p className={styles.bodyText}>
              Using{" "}
              <a
                href="https://doc.rust-lang.org/cargo/getting-started/installation.html"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                <code>cargo</code>
              </a>
              , <code>fetter</code> can be compiled and installed directly. On
              most platforms this will put the <code>fetter</code> command-line
              application in a directory that is already in your binary search
              path. Use <code>fetter --version</code> to test your installation.
            </p>
            <pre className={styles.codeBlock}>{`cargo install fetter
fetter --version`}</pre>

            <p className={styles.bodyText}>
              To specify an alternative <code>bin</code> location, provide a
              different <code>--root</code>:
            </p>
            <pre
              className={styles.codeBlock}
            >{`sudo cargo install --root /usr/local fetter
fetter --version`}</pre>
          </div>

          <div className="space-y-4">
            <h3 className={styles.sectionTitle}>Running Your First Scan</h3>

            <p className={styles.bodyText}>
              Now that you have installed <code>fetter</code> you can perform
              your first package scan. In Fetter IO Console, navigate to to the
              Tenant tab (🏢) and, for the selected tenant, copy the complete command
              line under &quot;Fetter CLI&quot; by clicking on it. Execute that
              command in the terminal. It will look something like this (your Tenant key will not be <code>ffffffff...</code>)  :
            </p>
            <pre
              className={styles.codeBlock}
            >{`fetter monitor-scan --url https://fetter.io/monitor_scan --tenant ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff`}</pre>

            <p className={styles.bodyText}>
              In general, no additional output will be provided. If you want to
              see logging information, provide the <code>--log</code> flag.
            </p>

            <pre
              className={styles.codeBlock}
            >{`fetter --log monitor-scan --url https://fetter.io/monitor_scan --tenant ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff`}</pre>

          <h3 className={styles.sectionTitle}>Up Next</h3>

            <p className={styles.bodyText}>
              With a package scan complete, we can return to the Fetter IO
              Console to examine the uploaded data.
            </p>
          </div>
        </div>
      ),
    },
    //--------------------------------------------------------------------------
    {
      id: "monitoring-packages",
      title: "Monitoring Packages",
      content: (
        <div className="space-y-4">
          <h2 className={styles.chapterTitle}>Monitoring Packages</h2>
          <p className={styles.bodyText}>
            The Packages tab provides a comprehensive view of all Python
            packages installed across your monitored systems.
          </p>

          <div className={styles.infoBox}>
            <h3 className={`${styles.sectionTitle}`}>Key Features</h3>
            <ul className={styles.list}>
              <li>View all package versions across your organization</li>
              <li>See which systems have which packages installed</li>
              <li>Track package installation paths</li>
              <li>Filter by package name or version</li>
              <li>Identify version drift across systems</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className={styles.sectionTitle}>
              Understanding the Package View
            </h3>
            <p className={styles.bodyText}>
              Each package entry shows the package name, version, and which
              systems have it installed. Click on a system to view all packages
              on that specific system.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "tracking-vulnerabilities",
      title: "Tracking Vulnerabilities",
      content: (
        <div className="space-y-4">
          <h2 className={styles.chapterTitle}>Tracking Vulnerabilities</h2>
          <p className={styles.bodyText}>
            Fetter IO continuously monitors your packages against the Open
            Source Vulnerability (OSV) database to identify security issues in
            real-time.
          </p>

          <div className={styles.infoBox}>
            <h3 className={`${styles.sectionTitle}`}>
              Vulnerability Information
            </h3>
            <p className={`${styles.bodyText} mb-2`}>
              For each vulnerability, you can view:
            </p>
            <ul className={styles.list}>
              <li>CVE or GHSA identifier</li>
              <li>CVSS score and severity rating</li>
              <li>Detailed vulnerability description</li>
              <li>Affected versions</li>
              <li>References and remediation guidance</li>
            </ul>
          </div>

          <div className={styles.warningBox}>
            <h3 className={styles.warningTitle}>
              Best Practices
            </h3>
            <p className="text-gray-300">
              Review the Vulns tab regularly and prioritize addressing
              high-severity vulnerabilities. Use the package details to identify
              which systems need updates.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "allow-lists",
      title: "Managing Allow Lists",
      content: (
        <div className="space-y-4">
          <h2 className={styles.chapterTitle}>Managing Allow Lists</h2>
          <p className={styles.bodyText}>
            Define approved packages for your organization and identify outliers
            that don&apos;t conform to your allow list policy.
          </p>

          <div className="space-y-4">
            <h3 className={styles.sectionTitle}>Creating an Allow List</h3>
            <ol className={styles.orderedList}>
              <li className="pl-4">Navigate to the Allow tab</li>
              <li className="pl-4">
                Define your allowed packages in the manifest format
              </li>
              <li className="pl-4">Save your allow list to your tenant</li>
              <li className="pl-4">
                Review validation results to identify non-compliant packages
              </li>
            </ol>
          </div>

          <div className={styles.infoBox}>
            <h3 className={`${styles.sectionTitle}`}>Validation Categories</h3>
            <ul className={styles.list}>
              <li className="flex items-center gap-2">
                <AllowIcon status="missing" />
                <span>Missing: Required packages not installed</span>
              </li>
              <li className="flex items-center gap-2">
                <AllowIcon status="unrequired" />
                <span>Unrequired: Installed packages not in allow list</span>
              </li>
              <li className="flex items-center gap-2">
                <AllowIcon status="misdefined" />
                <span>Misdefined: Version mismatches</span>
              </li>
              <li className="flex items-center gap-2">
                <AllowIcon status="allowed" />
                <span>Allowed: Package meets allow list requirements</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  // Initialize from URL or default to first chapter
  const [activeChapter, setActiveChapter] = useState(() => {
    const chapterFromUrl = searchParams?.get("chapter");
    return chapterFromUrl || chapters[0]?.id || "getting-started";
  });

  // Sync URL changes to state (for browser back/forward)
  useEffect(() => {
    const chapterFromUrl = searchParams?.get("chapter");
    if (chapterFromUrl && chapterFromUrl !== activeChapter) {
      setActiveChapter(chapterFromUrl);
    }
  }, [searchParams, activeChapter]);

  // Function to change chapter and update URL
  const changeChapter = (chapterId: string) => {
    setActiveChapter(chapterId);
    router.push(`/docs?chapter=${chapterId}`, { scroll: false });
  };

  const currentChapter = chapters.find((ch) => ch.id === activeChapter);

  return (
    <div className="flex flex-col min-h-screen font-[family-name:var(--font-geist-sans)] bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-6 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex w-10 h-10 hover:opacity-70 cursor-pointer transition-opacity"
            >
              <Weave fill={colors.slate[600]} className="w-full h-full" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-300">Fetter IO</h1>
              <p className="text-xs text-gray-400">Documentation</p>
            </div>
          </div>
          {status !== "authenticated" ? (
            <button
              onClick={() => signIn("github", { callbackUrl: "/app" })}
              className="button-entry"
            >
              Sign in with GitHub
            </button>
          ) : (
            <a href="/app" className="button-entry">
              Back to Console
            </a>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow px-6 w-full pb-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
          {/* Left Column - Chapter Navigation */}
          <aside className="sm:col-span-1 sm:self-start sm:sticky sm:top-19">
            <div className="bg-slate-900 p-2 border border-slate-800 rounded-sm">
              <nav className="space-y-2">
                {chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    onClick={() => changeChapter(chapter.id)}
                    className={`w-full sm:text-right uppercase tracking-widest text-xs px-2 py-1 rounded-xs transition-default ${
                      activeChapter === chapter.id
                        ? "bg-slate-800 text-gray-400 border border-slate-600 cursor-default"
                        : "bg-slate-900 text-slate-500 border border-slate-800 hover:text-gray-200 hover:bg-slate-700/50 cursor-pointer"
                    }`}
                  >
                    {chapter.title}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Right Column - Content */}
          <div className="sm:col-span-3 py-0">
            <div className="bg-slate-800/30 rounded-sm px-4 py-2 pb-4 border border-slate-700">
              {currentChapter ? currentChapter.content : null}

              {/* Previous/Next Navigation */}
              {currentChapter && (
                <div className="flex justify-between items-center mt-2 pt-2 text-xs text-slate-400 tracking-widest">
                  <div>
                    {chapters.findIndex((ch) => ch.id === activeChapter) >
                      0 && (
                      <button
                        onClick={() => {
                          const currentIndex = chapters.findIndex(
                            (ch) => ch.id === activeChapter,
                          );
                          changeChapter(chapters[currentIndex - 1]!.id);
                        }}
                        className="uppercase hover:text-blue-300 transition-colors flex cursor-pointer items-center gap-2"
                      >
                        <span>
                          {
                            chapters[
                              chapters.findIndex(
                                (ch) => ch.id === activeChapter,
                              ) - 1
                            ]?.title
                          }
                        </span>
                      </button>
                    )}
                  </div>
                  <div>
                    {chapters.findIndex((ch) => ch.id === activeChapter) <
                      chapters.length - 1 && (
                      <button
                        onClick={() => {
                          const currentIndex = chapters.findIndex(
                            (ch) => ch.id === activeChapter,
                          );
                          changeChapter(chapters[currentIndex + 1]!.id);
                        }}
                        className="uppercase hover:text-blue-300 transition-colors flex cursor-pointer items-center gap-2"
                      >
                        <span>
                          {
                            chapters[
                              chapters.findIndex(
                                (ch) => ch.id === activeChapter,
                              ) + 1
                            ]?.title
                          }
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-700 px-6 py-2">
        <div className="max-w-4xl mx-auto">
          <Footer />
        </div>
      </footer>
    </div>
  );
}
