"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { Weave } from "@/components/Weave";
import { Footer } from "@/components/Footer";
import colors from "tailwindcss/colors";

type Chapter = {
  id: string;
  title: string;
  content: React.ReactNode;
};

// Reusable style definitions
const styles = {
  chapterTitle: "text-xl font-bold text-white mb-2",
  sectionTitle: "text-xl font-semibold text-gray-400 mb-2",
  bodyText: "text-gray-300 text-md leading-tight",

  infoBox: "bg-slate-800 rounded-sm px-4 py-2 border border-slate-700",
  warningBox: "bg-yellow-900/20 border border-yellow-800 rounded-sm p-4",

  screenshotBox: "bg-slate-900 rounded-sm px-4 py-2 border border-slate-600",
  screenshotLabel: "text-gray-400 text-sm mb-2",
  screenshotPlaceholder:
    "bg-slate-800 h-64 rounded flex items-center justify-center text-gray-500",

  list: "list-disc list-inside text-gray-300 space-y-0 mb-2",
  orderedList: "list-decimal list-inside text-gray-300 space-y-0",

  codeBlock:
    "bg-slate-950 px-2 py-1 rounded text-xs text-blue-400 font-semibold overflow-x-auto border border-slate-700",
};

export default function DocsPage() {
  const { status } = useSession();

  const chapters: Chapter[] = [
    {
      id: "getting-started",
      title: "Getting Started",
      content: (
        <div className="space-y-4">
          <h2 className={styles.chapterTitle}>Getting Started</h2>
          <p className={styles.bodyText}>
            This guide will help you get up and running with Fetter IO, a
            supply-chain monitoring platform that provides comprehensive Python
            package visibility across your system or your entire organization.
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
                  className="text-slate-400 hover:text-blue-300"
                >
                  GitHub
                </a>{" "}
                account for authentication
              </li>
              <li>
                One or more Python environments on a system running Linux or
                MacOS
              </li>
            </ul>
          </div>

          <p className={styles.bodyText}>
            After clicking the &ldquo;Sign in with GitHub&rdquo; button and
            accepting the terms, you will be presented with the Fetter IO
            Console.
          </p>

          <p className={styles.bodyText}>
            The Console features six tabs, as well as tools to select Tenant and
            logout. Many tabs also feature a System selector and an update
            button.
          </p>

          <div className={styles.infoBox}>
            <h3 className={`${styles.sectionTitle}`}>Console Tabs</h3>
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

          <div className={styles.screenshotBox}>
            <div className={styles.screenshotLabel}>
              Screenshot placeholder:
            </div>
            <div className={styles.screenshotPlaceholder}>
              [Dashboard Overview Screenshot]
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "creating-tenant",
      title: "Creating a Tenant",
      content: (
        <div className="space-y-4">
          <h2 className={styles.chapterTitle}>Creating a Tenant</h2>
          <p className={styles.bodyText}>
            A tenant is your organization&apos;s workspace in Fetter IO. Each
            tenant has its own isolated environment for tracking systems,
            packages, and vulnerabilities.
          </p>

          <div className="space-y-4">
            <h3 className={styles.sectionTitle}>Steps to Create a Tenant</h3>
            <ol className={styles.orderedList}>
              <li className="pl-4">Sign in with your GitHub account</li>
              <li className="pl-4">
                Navigate to the Tenant tab in the dashboard
              </li>
              <li className="pl-4">
                Click &quot;Create New Tenant&quot; and provide a name
              </li>
              <li className="pl-4">
                Copy your tenant key - you&apos;ll need this to register systems
              </li>
            </ol>
          </div>

          <div className={styles.infoBox}>
            <h3 className={`${styles.sectionTitle} mb-2`}>Important Notes</h3>
            <p className={styles.bodyText}>
              Keep your tenant key secure. It allows systems to publish data to
              your tenant. Only the tenant creator can rename or modify certain
              tenant settings.
            </p>
          </div>

          <div className={styles.screenshotBox}>
            <div className={styles.screenshotLabel}>
              Screenshot placeholder:
            </div>
            <div className={styles.screenshotPlaceholder}>
              [Tenant Creation Interface Screenshot]
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "installing-agent",
      title: "Installing the Agent",
      content: (
        <div className="space-y-4">
          <h2 className={styles.chapterTitle}>Installing the Agent</h2>
          <p className={styles.bodyText}>
            The Fetter agent is a lightweight Rust application that scans Python
            environments and publishes package information to your tenant.
          </p>

          <div className={styles.infoBox}>
            <h3 className={`${styles.sectionTitle}`}>Installation Methods</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-white mb-2">
                  Using pip
                </h4>
                <pre className={styles.codeBlock}>pip install fetter</pre>
              </div>
              <div>
                <h4 className="text-sm font-medium text-white mb-2">
                  Using cargo
                </h4>
                <pre className={styles.codeBlock}>cargo install fetter</pre>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className={styles.sectionTitle}>Running Your First Scan</h3>
            <p className="text-gray-300">
              Once installed, run fetter with your tenant key:
            </p>
            <pre className={styles.codeBlock}>
              fetter publish --key YOUR_TENANT_KEY
            </pre>
          </div>

          <div className={styles.screenshotBox}>
            <div className={styles.screenshotLabel}>
              Screenshot placeholder:
            </div>
            <div className={styles.screenshotPlaceholder}>
              [Agent Installation & Execution Screenshot]
            </div>
          </div>
        </div>
      ),
    },
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

          <div className={styles.screenshotBox}>
            <div className={styles.screenshotLabel}>
              Screenshot placeholder:
            </div>
            <div className={styles.screenshotPlaceholder}>
              [Package Monitoring Dashboard Screenshot]
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "vulnerability-tracking",
      title: "Vulnerability Tracking",
      content: (
        <div className="space-y-4">
          <h2 className={styles.chapterTitle}>Vulnerability Tracking</h2>
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
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">
              Best Practices
            </h3>
            <p className="text-gray-300">
              Review the Vulns tab regularly and prioritize addressing
              high-severity vulnerabilities. Use the package details to identify
              which systems need updates.
            </p>
          </div>

          <div className={styles.screenshotBox}>
            <div className={styles.screenshotLabel}>
              Screenshot placeholder:
            </div>
            <div className={styles.screenshotPlaceholder}>
              [Vulnerability Dashboard Screenshot]
            </div>
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
              <li>
                <span className="text-red-400">Missing</span>: Required packages
                not installed
              </li>
              <li>
                <span className="text-yellow-400">Unrequired</span>: Installed
                packages not in allow list
              </li>
              <li>
                <span className="text-orange-400">Misdefined</span>: Version
                mismatches
              </li>
            </ul>
          </div>

          <div className={styles.screenshotBox}>
            <div className={styles.screenshotLabel}>
              Screenshot placeholder:
            </div>
            <div className={styles.screenshotPlaceholder}>
              [Allow List Management Screenshot]
            </div>
          </div>
        </div>
      ),
    },
  ];

  const [activeChapter, setActiveChapter] = useState(
    chapters[0]?.id || "getting-started",
  );

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
      <main className="flex-grow px-6 w-full">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
          {/* Left Column - Chapter Navigation */}
          <aside className="sm:col-span-1 sm:self-start sm:sticky sm:top-19">
            <div className="bg-slate-900 p-2 border border-slate-800 rounded-sm">
              <nav className="space-y-2">
                {chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    onClick={() => setActiveChapter(chapter.id)}
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
                          setActiveChapter(chapters[currentIndex - 1]!.id);
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
                          setActiveChapter(chapters[currentIndex + 1]!.id);
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
      <footer className="bg-slate-950 border-t border-slate-700 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <Footer />
        </div>
      </footer>
    </div>
  );
}
