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
  chapterTitle: "text-xl font-bold text-white",
  sectionTitle: "text-lg font-semibold text-gray-400",
  bodyText: "text-gray-300 text-md leading-relaxed",

  infoBox: "bg-slate-800 rounded-sm px-4 py-2 border border-slate-700",
  warningBox: "bg-yellow-900/20 border border-yellow-800 rounded-sm p-4",

  screenshotBox: "bg-slate-900 rounded-sm px-4 py-2 border border-slate-600",
  screenshotLabel: "text-gray-400 text-sm mb-2",
  screenshotPlaceholder:
    "bg-slate-800 h-64 rounded flex items-center justify-center text-gray-500",

  list: "list-disc list-inside text-gray-300 space-y-0",
  orderedList: "list-decimal list-inside text-gray-300 space-y-0",

  codeBlock: "bg-slate-950 px-2 py-1 rounded text-sm text-blue-400 font-semibold overflow-x-auto border border-slate-700",
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
            Welcome to Fetter IO! This guide will help you get up and running
            with our Python supply-chain monitoring platform. Fetter IO provides
            comprehensive visibility into all Python packages across your
            organization.
          </p>
          <div className={styles.infoBox}>
            <h3 className={`${styles.sectionTitle} mb-3`}>Prerequisites</h3>
            <ul className={styles.list}>
              <li>A GitHub account for authentication</li>
              <li>Python environments to monitor</li>
              <li>Systems running Linux, macOS, or Windows</li>
            </ul>
          </div>
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
              <li className="pl-2">Sign in with your GitHub account</li>
              <li className="pl-2">
                Navigate to the Tenant tab in the dashboard
              </li>
              <li className="pl-2">
                Click &quot;Create New Tenant&quot; and provide a name
              </li>
              <li className="pl-2">
                Copy your tenant key - you&apos;ll need this to register systems
              </li>
            </ol>
          </div>

          <div className={styles.infoBox}>
            <h3 className={`${styles.sectionTitle} mb-2`}>Important Notes</h3>
            <p className="text-gray-300">
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
            <h3 className={`${styles.sectionTitle} mb-3`}>
              Installation Methods
            </h3>
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
            <h3 className={`${styles.sectionTitle} mb-3`}>Key Features</h3>
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
            <p className="text-gray-300">
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
            <h3 className={`${styles.sectionTitle} mb-3`}>
              Vulnerability Information
            </h3>
            <p className="text-gray-300 mb-3">
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
              <li className="pl-2">Navigate to the Allow tab</li>
              <li className="pl-2">
                Define your allowed packages in the manifest format
              </li>
              <li className="pl-2">Save your allow list to your tenant</li>
              <li className="pl-2">
                Review validation results to identify non-compliant packages
              </li>
            </ol>
          </div>

          <div className={styles.infoBox}>
            <h3 className={`${styles.sectionTitle} mb-3`}>
              Validation Categories
            </h3>
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
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex w-8 h-8 hover:opacity-80 transition-opacity"
            >
              <Weave fill={colors.slate[600]} className="w-full h-full" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-200">Fetter IO</h1>
              {/* <p className="text-xs text-gray-400">Getting started guide</p> */}
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
      <main className="flex-grow max-w-4xl mx-auto px-0 py-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-6">
          {/* Left Column - Chapter Navigation */}
          <aside className="md:col-span-1">
            <div className="sticky top-24 bg-slate-900 p-2 border border-slate-800 rounded-sm">
              <nav className="space-y-1">
                {chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    onClick={() => setActiveChapter(chapter.id)}
                    className={`w-full text-left text-md px-2 py-1 rounded-sm transition-colors ${
                      activeChapter === chapter.id
                        ? "bg-slate-800 text-white border border-slate-600"
                        : "text-gray-400 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    {chapter.title}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Right Column - Content */}
          <div className="md:col-span-3">
            <div className="bg-slate-800/30 rounded-sm p-8 border border-slate-700">
              {currentChapter ? currentChapter.content : null}
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
